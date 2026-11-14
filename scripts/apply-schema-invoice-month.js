/**
 * Appwrite schema for the invoice month of a trip.
 *
 *   node scripts/apply-schema-invoice-month.js            # dry run: prints what would change
 *   node scripts/apply-schema-invoice-month.js --apply    # makes the changes
 *
 * Adds one optional, indexed field on trips: `billingMonth` ("2026-11"). It is only
 * filled in when a trip is moved out of the month it was run in, because the client
 * closed and invoiced it in a later month. Empty means "the month of the trip date".
 * Additive and safe to run more than once.
 *
 * Another Appwrite instance (e.g. the self-hosted one):
 *   node scripts/apply-schema-invoice-month.js --endpoint=https://api.example.com/v1 --key-env=VPS_APPWRITE_API_KEY --apply
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') })

const { Client, Databases } = require('node-appwrite')

const args = process.argv.slice(2)
const flag = name => (args.find(arg => arg.startsWith(`--${name}=`)) || '').split('=').slice(1).join('=')
const APPLY = args.includes('--apply')

const endpoint = flag('endpoint') || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const apiKey = process.env[flag('key-env') || 'APPWRITE_API_KEY']
const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID
const TRIPS_ID = process.env.NEXT_PUBLIC_TRIPS_COLLECTION_ID

const databases = new Databases(
  new Client().setEndpoint(endpoint).setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT).setKey(apiKey)
)

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const main = async () => {
  console.log(`${APPLY ? 'APPLYING to' : 'DRY RUN against'} ${endpoint} (database ${databaseId})\n\ntrips`)

  let collection = await databases.getCollection(databaseId, TRIPS_ID)

  if (collection.attributes.some(a => a.key === 'billingMonth')) {
    console.log('  = trips.billingMonth already exists')
  } else if (!APPLY) {
    console.log('  + trips.billingMonth (string, optional) would be added')
  } else {
    await databases.createStringAttribute(databaseId, TRIPS_ID, 'billingMonth', 7, false)

    // Attributes are built in the background; the index needs it to be ready
    for (let i = 0; i < 60; i++) {
      collection = await databases.getCollection(databaseId, TRIPS_ID)
      if (collection.attributes.find(a => a.key === 'billingMonth')?.status === 'available') break
      await sleep(1000)
    }

    console.log('  + trips.billingMonth added')
  }

  if (collection.indexes.some(index => index.key === 'billing_month')) {
    console.log('  = trips index billing_month already exists')
  } else if (!APPLY) {
    console.log('  + trips index billing_month (on billingMonth) would be added')
  } else {
    await databases.createIndex(databaseId, TRIPS_ID, 'billing_month', 'key', ['billingMonth'])
    console.log('  + trips index billing_month added')
  }

  console.log(APPLY ? '\nDone.' : '\nNothing was changed. Re-run with --apply to make these changes.')
}

main().catch(error => {
  console.error(error.message || error)
  process.exit(1)
})
