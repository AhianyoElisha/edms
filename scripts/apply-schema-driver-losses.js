/**
 * Appwrite schema for the driver loss sheet.
 *
 *   node scripts/apply-schema-driver-losses.js                       # dry run: prints what would change
 *   node scripts/apply-schema-driver-losses.js --apply               # makes the changes
 *   node scripts/apply-schema-driver-losses.js --apply --backfill    # also brings in existing shortages
 *
 * Adds two collections:
 *   - driverlosses: one row per lost item charged to a driver. Shortage rows are kept in
 *     step with a manifest's shortageCount; manual rows are added by the office on a trip.
 *   - driverlosspayments: what a driver has paid back (cash, mobile money, or a deduction
 *     the office entered by hand).
 *
 * --backfill creates a "price needed" row for every missing package on reviewed
 * manifests that already have a shortage, so the sheet starts with the shortages recorded before it
 * existed. Manifests that already have rows are skipped, so it is safe to run again.
 *
 * Everything is additive and safe to run more than once.
 *
 * Another Appwrite instance (e.g. the self-hosted one):
 *   node scripts/apply-schema-driver-losses.js --endpoint=https://api.example.com/v1 --key-env=VPS_APPWRITE_API_KEY --apply
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') })

const { Client, Databases, Permission, ID, Query } = require('node-appwrite')

const args = process.argv.slice(2)
const flag = name => (args.find(arg => arg.startsWith(`--${name}=`)) || '').split('=').slice(1).join('=')
const APPLY = args.includes('--apply')
const BACKFILL = args.includes('--backfill')

const endpoint = flag('endpoint') || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const apiKey = process.env[flag('key-env') || 'APPWRITE_API_KEY']
const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID

const databases = new Databases(
  new Client().setEndpoint(endpoint).setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT).setKey(apiKey)
)

const LOSSES_ID = process.env.NEXT_PUBLIC_DRIVER_LOSSES_COLLECTION_ID || 'driverlosses'
const PAYMENTS_ID = process.env.NEXT_PUBLIC_DRIVER_LOSS_PAYMENTS_COLLECTION_ID || 'driverlosspayments'
const MANIFESTS_ID = process.env.NEXT_PUBLIC_MANIFESTS_COLLECTION_ID
const TRIPS_ID = process.env.NEXT_PUBLIC_TRIPS_COLLECTION_ID

// Office staff only, like every other collection (see apply-company-isolation.js)
const STAFF = 'label:staff'

// Plain ids rather than relationships: a loss has to keep reading correctly after a
// manifest is deleted or a trip changes.
const LOSS_ATTRIBUTES = [
  { key: 'driverId', type: 'string', size: 36, required: true },
  { key: 'tripId', type: 'string', size: 36, required: true },
  { key: 'manifestId', type: 'string', size: 36, required: false },
  { key: 'companyId', type: 'string', size: 36, required: false },
  // 'shortage' or 'manual'
  { key: 'source', type: 'string', size: 20, required: true },
  { key: 'description', type: 'string', size: 255, required: false },
  // Empty until the office prices the item
  { key: 'value', type: 'float', required: false, min: 0 },
  // 'owed', 'found' or 'waived'
  { key: 'status', type: 'string', size: 20, required: true },
  { key: 'lossDate', type: 'datetime', required: false },
  { key: 'resolvedAt', type: 'datetime', required: false },
  { key: 'resolvedBy', type: 'string', size: 255, required: false },
  { key: 'notes', type: 'string', size: 1000, required: false },
  { key: 'createdBy', type: 'string', size: 255, required: false }
]

const PAYMENT_ATTRIBUTES = [
  { key: 'driverId', type: 'string', size: 36, required: true },
  { key: 'amount', type: 'float', required: true, min: 0 },
  { key: 'paidAt', type: 'datetime', required: true },
  // 'cash', 'momo', 'deduction' or 'other'
  { key: 'method', type: 'string', size: 20, required: true },
  { key: 'reference', type: 'string', size: 255, required: false },
  { key: 'notes', type: 'string', size: 1000, required: false },
  { key: 'recordedBy', type: 'string', size: 255, required: false }
]

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const createAttribute = (collectionId, a) => {
  switch (a.type) {
    case 'datetime':
      return databases.createDatetimeAttribute(databaseId, collectionId, a.key, a.required)
    case 'float':
      return databases.createFloatAttribute(databaseId, collectionId, a.key, a.required, a.min)
    default:
      return databases.createStringAttribute(databaseId, collectionId, a.key, a.size, a.required)
  }
}

// Attributes are built in the background; an index can only be added once they are ready
const waitForAttributes = async (collectionId, keys) => {
  for (let i = 0; i < 60; i++) {
    const { attributes } = await databases.getCollection(databaseId, collectionId)

    if (keys.every(key => attributes.find(a => a.key === key)?.status === 'available')) return
    await sleep(1000)
  }

  throw new Error(`attributes not ready on ${collectionId}: ${keys.join(', ')}`)
}

const ensureCollection = async (collectionId, name) => {
  console.log(`\n${collectionId}`)

  try {
    await databases.getCollection(databaseId, collectionId)
    console.log('  = collection already exists')

    return true
  } catch (error) {
    if (error.code !== 404) throw error
  }

  if (!APPLY) {
    console.log('  + collection would be created (office staff only)')

    return false
  }

  await databases.createCollection(
    databaseId,
    collectionId,
    name,
    [Permission.create(STAFF), Permission.read(STAFF), Permission.update(STAFF), Permission.delete(STAFF)],
    false,
    true
  )
  console.log('  + collection created (office staff only)')

  return true
}

const ensureAttributes = async (collectionId, wanted, exists) => {
  const existing = new Set(exists ? (await databases.getCollection(databaseId, collectionId)).attributes.map(a => a.key) : [])

  for (const attribute of wanted) {
    if (existing.has(attribute.key)) {
      console.log(`  = ${collectionId}.${attribute.key} already exists`)
    } else if (!APPLY) {
      console.log(`  + ${collectionId}.${attribute.key} (${attribute.type}, optional: ${!attribute.required}) would be added`)
    } else {
      await createAttribute(collectionId, attribute)
      console.log(`  + ${collectionId}.${attribute.key} added`)
    }
  }

  if (APPLY) await waitForAttributes(collectionId, wanted.map(a => a.key))
}

const ensureIndex = async (collectionId, key, attributes, exists) => {
  const indexes = exists ? (await databases.getCollection(databaseId, collectionId)).indexes : []

  if (indexes.some(index => index.key === key)) {
    console.log(`  = ${collectionId} index ${key} already exists`)
  } else if (!APPLY) {
    console.log(`  + ${collectionId} index ${key} (on ${attributes.join(', ')}) would be added`)
  } else {
    await databases.createIndex(databaseId, collectionId, key, 'key', attributes)
    console.log(`  + ${collectionId} index ${key} added`)
  }
}

const relationId = value => (value && typeof value === 'object' ? value.$id : value) || null

// Every row matching the queries, a page at a time
const listAll = async (collectionId, queries) => {
  const rows = []
  let cursor

  for (;;) {
    const page = await databases.listDocuments(databaseId, collectionId, [
      ...queries,
      Query.limit(100),
      ...(cursor ? [Query.cursorAfter(cursor)] : [])
    ])

    rows.push(...page.documents)
    if (page.documents.length < 100) return rows
    cursor = page.documents[page.documents.length - 1].$id
  }
}

// Same rule as the app: only shortages the office confirmed count. A shortage the
// driver typed in the field waits until the manifest is reviewed.
const confirmed = manifest => manifest.detailsVerified === true || (!!manifest.packageSize && !!manifest.packageCount)

const backfill = async lossesExist => {
  console.log('\nbackfill: existing manifest shortages')

  const manifests = (await listAll(MANIFESTS_ID, [Query.greaterThan('shortageCount', 0)])).filter(confirmed)
  const existing = lossesExist ? await listAll(LOSSES_ID, [Query.equal('source', 'shortage')]) : []
  const covered = new Set(existing.map(row => row.manifestId))
  const trips = new Map()
  let created = 0
  let skipped = 0

  for (const manifest of manifests) {
    if (covered.has(manifest.$id)) {
      skipped++
      continue
    }

    const tripId = relationId(manifest.trip)

    if (!tripId) {
      console.log(`  ! manifest ${manifest.manifestNumber || manifest.$id} has no trip, skipped`)
      continue
    }

    if (!trips.has(tripId)) trips.set(tripId, await databases.getDocument(databaseId, TRIPS_ID, tripId).catch(() => null))

    const trip = trips.get(tripId)
    const driverId = relationId(trip?.driver)

    if (!driverId) {
      console.log(`  ! manifest ${manifest.manifestNumber || manifest.$id}: its trip has no driver, skipped`)
      continue
    }

    for (let i = 0; i < manifest.shortageCount; i++) {
      if (APPLY) {
        await databases.createDocument(databaseId, LOSSES_ID, ID.unique(), {
          driverId,
          tripId,
          manifestId: manifest.$id,
          companyId: manifest.companyId || trip.companyId || null,
          source: 'shortage',
          description: `Missing package (manifest ${manifest.manifestNumber || ''})`.replace(' ()', ''),
          value: null,
          status: 'owed',
          lossDate: trip.tripDate || manifest.deliveryTime || manifest.$createdAt,
          createdBy: 'Backfill'
        })
      }

      created++
    }
  }

  console.log(
    `  ${APPLY ? '+' : 'would add'} ${created} row(s) from ${manifests.length - skipped} manifest(s); ${skipped} already on the sheet`
  )
}

const main = async () => {
  console.log(`${APPLY ? 'APPLYING to' : 'DRY RUN against'} ${endpoint} (database ${databaseId})`)

  const lossesExist = await ensureCollection(LOSSES_ID, 'driverlosses')

  await ensureAttributes(LOSSES_ID, LOSS_ATTRIBUTES, lossesExist)
  await ensureIndex(LOSSES_ID, 'driver', ['driverId'], lossesExist)
  await ensureIndex(LOSSES_ID, 'trip', ['tripId'], lossesExist)
  await ensureIndex(LOSSES_ID, 'manifest', ['manifestId'], lossesExist)
  await ensureIndex(LOSSES_ID, 'status', ['status'], lossesExist)
  await ensureIndex(LOSSES_ID, 'source', ['source'], lossesExist)

  const paymentsExist = await ensureCollection(PAYMENTS_ID, 'driverlosspayments')

  await ensureAttributes(PAYMENTS_ID, PAYMENT_ATTRIBUTES, paymentsExist)
  await ensureIndex(PAYMENTS_ID, 'driver', ['driverId'], paymentsExist)
  await ensureIndex(PAYMENTS_ID, 'paid', ['paidAt'], paymentsExist)

  if (BACKFILL) await backfill(lossesExist)

  console.log(APPLY ? '\nDone.' : '\nNothing was changed. Re-run with --apply to make these changes.')
}

main().catch(error => {
  console.error(error.message || error)
  process.exit(1)
})
