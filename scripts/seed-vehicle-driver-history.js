/**
 * Fill in the driver history of vehicles for the time before it was being recorded.
 *
 *   node scripts/seed-vehicle-driver-history.js            # dry run: prints what would be written
 *   node scripts/seed-vehicle-driver-history.js --apply    # writes the periods
 *
 * History is worked out from trips: for each vehicle, a run of consecutive trips by
 * the same driver becomes one period, from that driver's first trip in the run to
 * the next driver's first trip. The vehicle's driver today gets an open period.
 * Periods made here are marked source 'trips' so they can be told from changes
 * recorded as they happened.
 *
 * Only vehicles with no history yet are touched, so it is safe to run again.
 *
 * Another Appwrite instance:
 *   node scripts/seed-vehicle-driver-history.js --endpoint=https://api.example.com/v1 --key-env=VPS_APPWRITE_API_KEY --apply
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') })

const { Client, Databases, ID, Query } = require('node-appwrite')

const args = process.argv.slice(2)
const flag = name => (args.find(arg => arg.startsWith(`--${name}=`)) || '').split('=').slice(1).join('=')
const APPLY = args.includes('--apply')

const endpoint = flag('endpoint') || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const apiKey = process.env[flag('key-env') || 'APPWRITE_API_KEY']
const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID

const databases = new Databases(
  new Client().setEndpoint(endpoint).setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT).setKey(apiKey)
)

const ASSIGNMENTS_ID = process.env.NEXT_PUBLIC_VEHICLE_ASSIGNMENTS_COLLECTION_ID || 'vehicleassignments'

const listAll = async (collectionId, queries = []) => {
  const rows = []
  let cursor

  for (;;) {
    const page = await databases.listDocuments(databaseId, collectionId, [
      ...queries,
      Query.limit(500),
      ...(cursor ? [Query.cursorAfter(cursor)] : [])
    ])

    rows.push(...page.documents)
    if (page.documents.length < 500) return rows
    cursor = page.documents[page.documents.length - 1].$id
  }
}

const idOf = value => (value && typeof value === 'object' ? value.$id : value) || null

const main = async () => {
  console.log(`${APPLY ? 'APPLYING to' : 'DRY RUN against'} ${endpoint} (database ${databaseId})\n`)

  const now = new Date()

  const [vehicles, users, trips, existing] = await Promise.all([
    listAll(process.env.NEXT_PUBLIC_VEHICLES_COLLECTION_ID, [Query.select(['$id', 'vehicleNumber', 'driver.$id', '$createdAt'])]),
    listAll(process.env.NEXT_PUBLIC_USERS_COLLECTION_ID, [Query.select(['$id', 'name'])]),
    listAll(process.env.NEXT_PUBLIC_TRIPS_COLLECTION_ID, [
      Query.select(['$id', 'tripDate', 'startTime', '$createdAt', 'vehicle.$id', 'driver.$id'])
    ]),
    listAll(ASSIGNMENTS_ID, [Query.select(['$id', 'vehicleId'])]).catch(error => {
      if (APPLY) throw error

      console.log('(history collection not there yet - run apply-schema-vehicle-driver-history.js first)\n')

      return []
    })
  ])

  const nameOf = new Map(users.map(user => [user.$id, user.name || null]))
  const hasHistory = new Set(existing.map(row => row.vehicleId))
  const tripsOf = new Map()
  let skippedDates = 0

  for (const trip of trips) {
    const vehicleId = idOf(trip.vehicle)
    const driverId = idOf(trip.driver)
    const at = new Date(trip.tripDate || trip.startTime || trip.$createdAt)

    if (!vehicleId || !driverId) continue

    // A mistyped year would put a handover years away from when it happened
    if (Number.isNaN(at.getTime()) || at > now || at.getFullYear() < now.getFullYear() - 2) {
      skippedDates++
      continue
    }

    if (!tripsOf.has(vehicleId)) tripsOf.set(vehicleId, [])
    tripsOf.get(vehicleId).push({ driverId, at })
  }

  const periods = []
  let vehiclesSeeded = 0

  for (const vehicle of vehicles) {
    if (hasHistory.has(vehicle.$id)) continue

    const runs = []

    for (const trip of (tripsOf.get(vehicle.$id) || []).sort((a, b) => a.at - b.at)) {
      const last = runs[runs.length - 1]

      if (last && last.driverId === trip.driverId) last.lastTrip = trip.at
      else runs.push({ driverId: trip.driverId, startedAt: trip.at, lastTrip: trip.at })
    }

    const currentDriver = idOf(vehicle.driver)
    const made = []

    runs.forEach((run, index) => {
      const next = runs[index + 1]
      const isLast = !next

      made.push({
        driverId: run.driverId,
        startedAt: run.startedAt,

        // The last driver seen on trips still has the vehicle if they are its driver today
        endedAt: next ? next.startedAt : run.driverId === currentDriver ? null : run.lastTrip,
        source: 'trips',
        isLast
      })
    })

    // Assigned to someone who has not yet driven it on a trip
    if (currentDriver && !made.some(period => period.endedAt === null)) {
      made.push({ driverId: currentDriver, startedAt: now, endedAt: null, source: 'recorded' })
    }

    if (made.length) vehiclesSeeded++

    made.forEach(period =>
      periods.push({
        vehicleId: vehicle.$id,
        vehicleNumber: vehicle.vehicleNumber || null,
        driverId: period.driverId,
        driverName: nameOf.get(period.driverId) || null,
        startedAt: period.startedAt.toISOString(),
        endedAt: period.endedAt ? period.endedAt.toISOString() : null,
        source: period.source,
        changedBy: null
      })
    )
  }

  console.log(`  ${vehicles.length} vehicles, ${hasHistory.size} already have history`)
  console.log(`  ${trips.length} trips read, ${skippedDates} ignored for an impossible date`)
  console.log(`  ${periods.length} periods for ${vehiclesSeeded} vehicles ${APPLY ? 'being written' : 'would be written'}`)
  console.log(`    ${periods.filter(p => !p.endedAt).length} open (the vehicle's driver today)`)
  console.log(`    ${periods.filter(p => p.source === 'trips').length} worked out from trips`)

  if (!APPLY) {
    console.log('\nNothing was changed. Re-run with --apply to write these periods.')

    return
  }

  for (const period of periods) {
    await databases.createDocument(databaseId, ASSIGNMENTS_ID, ID.unique(), period)
  }

  console.log('\nDone.')
}

main().catch(error => {
  console.error(error.message || error)
  process.exit(1)
})
