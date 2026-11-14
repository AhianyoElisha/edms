/**
 * Appwrite schema for clients that are invoiced twice a month.
 *
 *   node scripts/apply-schema-invoice-periods.js            # dry run: prints what would change
 *   node scripts/apply-schema-invoice-periods.js --apply    # makes the changes
 *
 * Adds two optional fields:
 *   - companies.invoiceCutoffDay (1-28): the last day of the month covered by the
 *     client's first invoice. Empty means the client is invoiced once a month.
 *   - trips.billingPeriod (1 or 2): which of the month's two invoices a trip is on,
 *     set only when it was moved off the one its trip date puts it on.
 * Additive and safe to run more than once.
 *
 * Another Appwrite instance (e.g. the self-hosted one):
 *   node scripts/apply-schema-invoice-periods.js --endpoint=https://api.example.com/v1 --key-env=VPS_APPWRITE_API_KEY --apply
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') })

const { Client, Databases } = require('node-appwrite')

const args = process.argv.slice(2)
const flag = name => (args.find(arg => arg.startsWith(`--${name}=`)) || '').split('=').slice(1).join('=')
const APPLY = args.includes('--apply')

const endpoint = flag('endpoint') || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const apiKey = process.env[flag('key-env') || 'APPWRITE_API_KEY']
const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID

const databases = new Databases(
  new Client().setEndpoint(endpoint).setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT).setKey(apiKey)
)

const WANTED = [
  [process.env.NEXT_PUBLIC_COMPANIES_COLLECTION_ID || 'companies', 'companies', 'invoiceCutoffDay', 1, 28],
  [process.env.NEXT_PUBLIC_TRIPS_COLLECTION_ID, 'trips', 'billingPeriod', 1, 2]
]

const main = async () => {
  console.log(`${APPLY ? 'APPLYING to' : 'DRY RUN against'} ${endpoint} (database ${databaseId})\n`)

  for (const [collectionId, label, key, min, max] of WANTED) {
    const collection = await databases.getCollection(databaseId, collectionId)

    if (collection.attributes.some(a => a.key === key)) {
      console.log(`  = ${label}.${key} already exists`)
    } else if (!APPLY) {
      console.log(`  + ${label}.${key} (whole number ${min}-${max}, optional) would be added`)
    } else {
      await databases.createIntegerAttribute(databaseId, collectionId, key, false, min, max)
      console.log(`  + ${label}.${key} added`)
    }
  }

  console.log(APPLY ? '\nDone.' : '\nNothing was changed. Re-run with --apply to make these changes.')
}

main().catch(error => {
  console.error(error.message || error)
  process.exit(1)
})
