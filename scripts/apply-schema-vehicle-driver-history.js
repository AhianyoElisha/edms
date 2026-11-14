/**
 * Appwrite schema for the driver history of vehicles.
 *
 *   node scripts/apply-schema-vehicle-driver-history.js            # dry run: prints what would change
 *   node scripts/apply-schema-vehicle-driver-history.js --apply    # makes the changes
 *
 * Adds one collection (`vehicleassignments`: one row per period a driver had a
 * vehicle) and two optional fields on expenses (`driverId`, `driverName`: the driver
 * an expense was for, fixed when it is recorded). Everything is additive and safe to
 * run more than once - anything that already exists is skipped.
 *
 * Another Appwrite instance (e.g. the self-hosted one):
 *   node scripts/apply-schema-vehicle-driver-history.js --endpoint=https://api.example.com/v1 --key-env=VPS_APPWRITE_API_KEY --apply
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') })

const { Client, Databases, Permission } = require('node-appwrite')

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
const EXPENSES_ID = process.env.NEXT_PUBLIC_EXPENSES_COLLECTION_ID

// Office staff only, like every other collection (see apply-company-isolation.js)
const STAFF = 'label:staff'

// Plain ids and names rather than relationships: the history has to keep reading
// correctly after a driver is removed or a vehicle renamed.
const ASSIGNMENT_ATTRIBUTES = [
  { key: 'vehicleId', type: 'string', size: 36, required: true },
  { key: 'vehicleNumber', type: 'string', size: 50, required: false },
  { key: 'driverId', type: 'string', size: 36, required: true },
  { key: 'driverName', type: 'string', size: 255, required: false },
  { key: 'startedAt', type: 'datetime', required: true },
  // Empty while the driver still has the vehicle
  { key: 'endedAt', type: 'datetime', required: false },
  // 'recorded' when logged at the time of the change, 'trips' when worked out from old trips
  { key: 'source', type: 'string', size: 20, required: false },
  { key: 'changedBy', type: 'string', size: 255, required: false }
]

const EXPENSE_ATTRIBUTES = [
  { key: 'driverId', type: 'string', size: 36, required: false },
  { key: 'driverName', type: 'string', size: 255, required: false }
]

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const createAttribute = (collectionId, a) =>
  a.type === 'datetime'
    ? databases.createDatetimeAttribute(databaseId, collectionId, a.key, a.required)
    : databases.createStringAttribute(databaseId, collectionId, a.key, a.size, a.required)

// Attributes are built in the background; an index can only be added once they are ready
const waitForAttributes = async (collectionId, keys) => {
  for (let i = 0; i < 60; i++) {
    const { attributes } = await databases.getCollection(databaseId, collectionId)

    if (keys.every(key => attributes.find(a => a.key === key)?.status === 'available')) return
    await sleep(1000)
  }

  throw new Error(`attributes not ready on ${collectionId}: ${keys.join(', ')}`)
}

const ensureAttributes = async (collectionId, label, wanted, exists = true) => {
  const existing = new Set(exists ? (await databases.getCollection(databaseId, collectionId)).attributes.map(a => a.key) : [])

  for (const attribute of wanted) {
    if (existing.has(attribute.key)) {
      console.log(`  = ${label}.${attribute.key} already exists`)
    } else if (!APPLY) {
      console.log(`  + ${label}.${attribute.key} (${attribute.type}, optional: ${!attribute.required}) would be added`)
    } else {
      await createAttribute(collectionId, attribute)
      console.log(`  + ${label}.${attribute.key} added`)
    }
  }

  if (APPLY) await waitForAttributes(collectionId, wanted.map(a => a.key))
}

const ensureIndex = async (collectionId, label, key, attributes, exists = true) => {
  const indexes = exists ? (await databases.getCollection(databaseId, collectionId)).indexes : []

  if (indexes.some(index => index.key === key)) {
    console.log(`  = ${label} index ${key} already exists`)
  } else if (!APPLY) {
    console.log(`  + ${label} index ${key} (on ${attributes.join(', ')}) would be added`)
  } else {
    await databases.createIndex(databaseId, collectionId, key, 'key', attributes)
    console.log(`  + ${label} index ${key} added`)
  }
}

const main = async () => {
  console.log(`${APPLY ? 'APPLYING to' : 'DRY RUN against'} ${endpoint} (database ${databaseId})\n`)
  console.log(ASSIGNMENTS_ID)

  let exists = true

  try {
    await databases.getCollection(databaseId, ASSIGNMENTS_ID)
    console.log('  = collection already exists')
  } catch (error) {
    if (error.code !== 404) throw error
    exists = false
  }

  if (!exists && APPLY) {
    await databases.createCollection(
      databaseId,
      ASSIGNMENTS_ID,
      'vehicleassignments',
      [Permission.create(STAFF), Permission.read(STAFF), Permission.update(STAFF), Permission.delete(STAFF)],
      false,
      true
    )
    console.log('  + collection created (office staff only)')
    exists = true
  } else if (!exists) {
    console.log('  + collection would be created (office staff only)')
  }

  await ensureAttributes(ASSIGNMENTS_ID, ASSIGNMENTS_ID, ASSIGNMENT_ATTRIBUTES, exists)
  await ensureIndex(ASSIGNMENTS_ID, ASSIGNMENTS_ID, 'vehicle_started', ['vehicleId', 'startedAt'], exists)
  await ensureIndex(ASSIGNMENTS_ID, ASSIGNMENTS_ID, 'driver', ['driverId'], exists)
  await ensureIndex(ASSIGNMENTS_ID, ASSIGNMENTS_ID, 'started', ['startedAt'], exists)
  await ensureIndex(ASSIGNMENTS_ID, ASSIGNMENTS_ID, 'ended', ['endedAt'], exists)

  console.log('\nexpenses')
  await ensureAttributes(EXPENSES_ID, 'expenses', EXPENSE_ATTRIBUTES)
  await ensureIndex(EXPENSES_ID, 'expenses', 'driver', ['driverId'])

  console.log(APPLY ? '\nDone.' : '\nNothing was changed. Re-run with --apply to make these changes.')
}

main().catch(error => {
  console.error(error.message || error)
  process.exit(1)
})
