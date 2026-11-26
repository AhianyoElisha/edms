/**
 * Appwrite schema for keeping an unsure photo reading on a manifest, for review.
 *
 *   node scripts/apply-schema-ocr-suggestion.js            # dry run: prints what would change
 *   node scripts/apply-schema-ocr-suggestion.js --apply    # makes the changes
 *
 * When the driver logs a delivery, a photo reading the parser is sure of becomes
 * the manifest's package count. An unsure one is kept in these fields instead, so
 * the review screen can offer it and the admin decides the figure:
 *
 *   ocrPackageCount  the total the photo was read as
 *   ocrConfidence    'high' or 'low'
 *   ocrEvidence      the figures it was read from ("Package figures: 30 + 33 + 9")
 *
 * Additive and safe to run more than once. Until it is applied, the app carries on
 * as before: saving the suggestion fails quietly and the field stays empty.
 *
 * Another Appwrite instance:
 *   node scripts/apply-schema-ocr-suggestion.js --endpoint=https://api.example.com/v1 --key-env=VPS_APPWRITE_API_KEY --apply
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') })

const { Client, Databases } = require('node-appwrite')

const args = process.argv.slice(2)
const flag = name => (args.find(arg => arg.startsWith(`--${name}=`)) || '').split('=').slice(1).join('=')
const APPLY = args.includes('--apply')

const endpoint = flag('endpoint') || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const apiKey = process.env[flag('key-env') || 'APPWRITE_API_KEY']
const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID
const MANIFESTS = process.env.NEXT_PUBLIC_MANIFESTS_COLLECTION_ID

const databases = new Databases(
  new Client().setEndpoint(endpoint).setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT).setKey(apiKey)
)

const ATTRIBUTES = [
  { key: 'ocrPackageCount', create: () => databases.createIntegerAttribute(databaseId, MANIFESTS, 'ocrPackageCount', false, 0) },
  { key: 'ocrConfidence', create: () => databases.createStringAttribute(databaseId, MANIFESTS, 'ocrConfidence', 10, false) },
  { key: 'ocrEvidence', create: () => databases.createStringAttribute(databaseId, MANIFESTS, 'ocrEvidence', 500, false) }
]

const main = async () => {
  console.log(`${APPLY ? 'Applying' : 'Dry run'} against ${endpoint}\n`)

  const collection = await databases.getCollection(databaseId, MANIFESTS)
  const existing = new Set(collection.attributes.map(attribute => attribute.key))

  for (const attribute of ATTRIBUTES) {
    if (existing.has(attribute.key)) {
      console.log(`  = manifests.${attribute.key} already exists`)
      continue
    }

    console.log(`  + manifests.${attribute.key}${APPLY ? '' : ' (dry run)'}`)
    if (APPLY) await attribute.create()
  }

  if (!APPLY) console.log('\nNothing was changed. Run again with --apply to make these changes.')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
