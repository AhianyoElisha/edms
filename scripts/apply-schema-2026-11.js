/**
 * Appwrite schema changes for the November 2026 change request.
 *
 *   node scripts/apply-schema-2026-11.js            # dry run: prints what would change
 *   node scripts/apply-schema-2026-11.js --apply    # makes the changes
 *
 * Everything here is additive (new optional attributes, one new collection) and
 * safe to run more than once - anything that already exists is skipped.
 *
 * To run against another Appwrite instance (e.g. the self-hosted VPS):
 *   node scripts/apply-schema-2026-11.js --endpoint=https://api.example.com/v1 --key-env=VPS_APPWRITE_API_KEY --apply
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

const PUSH_COLLECTION_ID = process.env.NEXT_PUBLIC_PUSH_SUBSCRIPTIONS_COLLECTION_ID || 'pushsubscriptions'

// [collection id, label, attributes]
const ATTRIBUTES = [
  [
    process.env.NEXT_PUBLIC_MANIFESTS_COLLECTION_ID,
    'manifests',
    [
      // Packages that did not arrive; recorded without needing a package count.
      { key: 'shortageCount', type: 'integer', required: false, min: 0 },
      // Packages delivered over and above what the manifest lists (carried by mistake).
      { key: 'surplusCount', type: 'integer', required: false, min: 0 },
      // The company the goods belong to - manifests are no longer Jumia-only.
      { key: 'clientName', type: 'string', size: 255, required: false }
    ]
  ],
  [
    process.env.NEXT_PUBLIC_NOTIFICATIONS_COLLECTION_ID,
    'notifications',
    // Where tapping a notification takes you.
    [{ key: 'link', type: 'string', size: 500, required: false }]
  ]
]

// One row per browser that has switched push alerts on. Each browser creates its
// own row (signed-in users may create; document security then limits a row to the
// account that wrote it). The server reads them all with the API key.
const PUSH_ATTRIBUTES = [
  { key: 'userId', type: 'string', size: 50, required: true },
  { key: 'endpoint', type: 'string', size: 1000, required: true },
  { key: 'subscription', type: 'string', size: 3000, required: true },
  { key: 'userAgent', type: 'string', size: 300, required: false }
]

const createAttribute = (collectionId, attribute) =>
  attribute.type === 'integer'
    ? databases.createIntegerAttribute(databaseId, collectionId, attribute.key, attribute.required, attribute.min)
    : databases.createStringAttribute(databaseId, collectionId, attribute.key, attribute.size, attribute.required)

const ensureAttributes = async (collectionId, label, wanted) => {
  const collection = await databases.getCollection(databaseId, collectionId)
  const existing = new Set(collection.attributes.map(attribute => attribute.key))

  for (const attribute of wanted) {
    const name = `${label}.${attribute.key}`

    if (existing.has(attribute.key)) {
      console.log(`  = ${name} already exists`)
      continue
    }

    if (!APPLY) {
      console.log(`  + ${name} (${attribute.type}${attribute.size ? ` ${attribute.size}` : ''}, optional: ${!attribute.required}) would be added`)
      continue
    }

    await createAttribute(collectionId, attribute)
    console.log(`  + ${name} added`)
  }
}

const main = async () => {
  console.log(`${APPLY ? 'APPLYING to' : 'DRY RUN against'} ${endpoint} (database ${databaseId})\n`)

  for (const [collectionId, label, wanted] of ATTRIBUTES) {
    console.log(label)
    await ensureAttributes(collectionId, label, wanted)
  }

  console.log(`\n${PUSH_COLLECTION_ID}`)

  let exists = true

  try {
    await databases.getCollection(databaseId, PUSH_COLLECTION_ID)
    console.log('  = collection already exists')
  } catch (error) {
    if (error.code !== 404) throw error
    exists = false
  }

  if (!exists && !APPLY) {
    console.log('  + collection would be created (signed-in users may create; rows private to their creator)')
    PUSH_ATTRIBUTES.forEach(a => console.log(`  + ${PUSH_COLLECTION_ID}.${a.key} would be added`))
  } else {
    if (!exists) {
      await databases.createCollection(
        databaseId,
        PUSH_COLLECTION_ID,
        'pushsubscriptions',
        [Permission.create(Role.users())],
        true, // document security: a row is readable/writable only by its creator
        true
      )
      console.log('  + collection created')
    }

    await ensureAttributes(PUSH_COLLECTION_ID, PUSH_COLLECTION_ID, PUSH_ATTRIBUTES)
  }

  console.log(APPLY ? '\nDone.' : '\nNothing was changed. Re-run with --apply to make these changes.')
}

main().catch(error => {
  console.error('\nFailed:', error.message)
  process.exit(1)
})
