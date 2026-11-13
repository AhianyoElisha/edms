/**
 * Appwrite schema for companies (the clients whose goods are carried).
 *
 *   node scripts/apply-schema-companies.js            # dry run: prints what would change
 *   node scripts/apply-schema-companies.js --apply    # makes the changes
 *
 * Adds one collection (`companies`) and an optional, indexed `companyId` on rate
 * cards, trips, manifests and users. Everything is additive and safe to run more
 * than once - anything that already exists is skipped.
 *
 * Another Appwrite instance (e.g. the self-hosted one):
 *   node scripts/apply-schema-companies.js --endpoint=https://api.example.com/v1 --key-env=VPS_APPWRITE_API_KEY --apply
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') })

const { Client, Databases, Permission, Role } = require('node-appwrite')

const args = process.argv.slice(2)
const flag = name => (args.find(arg => arg.startsWith(`--${name}=`)) || '').split('=').slice(1).join('=')
const APPLY = args.includes('--apply')

const endpoint = flag('endpoint') || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const apiKey = process.env[flag('key-env') || 'APPWRITE_API_KEY']
const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID

const databases = new Databases(
  new Client().setEndpoint(endpoint).setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT).setKey(apiKey)
)

const COMPANIES_ID = process.env.NEXT_PUBLIC_COMPANIES_COLLECTION_ID || 'companies'

const COMPANY_ATTRIBUTES = [
  { key: 'name', type: 'string', size: 255, required: true },
  // Short code the company's rate cards start with, e.g. JUM for JUM 001
  { key: 'code', type: 'string', size: 20, required: true },
  { key: 'contactPerson', type: 'string', size: 255, required: false },
  { key: 'contactPhone', type: 'string', size: 50, required: false },
  { key: 'contactEmail', type: 'string', size: 255, required: false },
  { key: 'notes', type: 'string', size: 1000, required: false },
  { key: 'isActive', type: 'boolean', required: false, default: true }
]

// Which company a record belongs to. A plain id (not a relationship) so lists can
// be filtered by company cheaply and a company login can be limited to its own rows.
const COMPANY_ID = { key: 'companyId', type: 'string', size: 36, required: false }

const LINKED = [
  [process.env.NEXT_PUBLIC_RATE_CARDS_COLLECTION_ID, 'ratecards'],
  [process.env.NEXT_PUBLIC_TRIPS_COLLECTION_ID, 'trips'],
  [process.env.NEXT_PUBLIC_MANIFESTS_COLLECTION_ID, 'manifests'],
  [process.env.NEXT_PUBLIC_USERS_COLLECTION_ID, 'users']
]

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const createAttribute = (collectionId, a) =>
  a.type === 'boolean'
    ? databases.createBooleanAttribute(databaseId, collectionId, a.key, a.required, a.default)
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

const ensureAttributes = async (collectionId, label, wanted) => {
  const collection = await databases.getCollection(databaseId, collectionId)
  const existing = new Set(collection.attributes.map(a => a.key))

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

const ensureIndex = async (collectionId, label, key, type, attributes) => {
  const collection = await databases.getCollection(databaseId, collectionId)

  if (collection.indexes.some(index => index.key === key)) {
    console.log(`  = ${label} index ${key} already exists`)
  } else if (!APPLY) {
    console.log(`  + ${label} index ${key} (${type} on ${attributes.join(', ')}) would be added`)
  } else {
    await databases.createIndex(databaseId, collectionId, key, type, attributes)
    console.log(`  + ${label} index ${key} added`)
  }
}

const main = async () => {
  console.log(`${APPLY ? 'APPLYING to' : 'DRY RUN against'} ${endpoint} (database ${databaseId})\n`)
  console.log(COMPANIES_ID)

  let exists = true

  try {
    await databases.getCollection(databaseId, COMPANIES_ID)
    console.log('  = collection already exists')
  } catch (error) {
    if (error.code !== 404) throw error
    exists = false
  }

  if (!exists && !APPLY) {
    console.log('  + collection would be created (signed-in users may read and write, like the other collections)')
    COMPANY_ATTRIBUTES.forEach(a => console.log(`  + ${COMPANIES_ID}.${a.key} would be added`))
    console.log('  + unique indexes on name and on code would be added')
  } else {
    if (!exists) {
      await databases.createCollection(
        databaseId,
        COMPANIES_ID,
        'companies',
        [Permission.create(Role.users()), Permission.read(Role.users()), Permission.update(Role.users()), Permission.delete(Role.users())],
        true,
        true
      )
      console.log('  + collection created')
    }

    await ensureAttributes(COMPANIES_ID, COMPANIES_ID, COMPANY_ATTRIBUTES)
    await ensureIndex(COMPANIES_ID, COMPANIES_ID, 'unique_name', 'unique', ['name'])
    await ensureIndex(COMPANIES_ID, COMPANIES_ID, 'unique_code', 'unique', ['code'])
  }

  for (const [collectionId, label] of LINKED) {
    console.log(`\n${label}`)
    await ensureAttributes(collectionId, label, [COMPANY_ID])
    await ensureIndex(collectionId, label, 'by_company', 'key', ['companyId'])
  }

  console.log(APPLY ? '\nDone.' : '\nNothing was changed. Re-run with --apply to make these changes.')
}

main().catch(error => {
  console.error('\nFailed:', error.message)
  process.exit(1)
})
