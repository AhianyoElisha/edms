/**
 * Links pickup locations to the company whose goods are collected there.
 *
 *   node scripts/apply-pickup-location-companies.js            # dry run: prints what would change
 *   node scripts/apply-pickup-location-companies.js --apply    # makes the changes
 *
 * 1. Adds an optional, indexed `companyId` to pickup locations.
 * 2. Backfills it on locations that have none: the company of the rate cards on
 *    the routes that start there. A location whose routes are priced for more than
 *    one company (or for none) is left for someone to set on the Warehouses page.
 * 3. Fills in the company on manifests still waiting in the review queue that have
 *    none, from the pickup location their trip set out from, so the review form
 *    starts with it.
 *
 * Everything is additive and safe to run more than once.
 *
 * Another Appwrite instance:
 *   node scripts/apply-pickup-location-companies.js --endpoint=https://api.example.com/v1 --key-env=VPS_APPWRITE_API_KEY --apply
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') })

const { Client, Databases, Query } = require('node-appwrite')

const args = process.argv.slice(2)
const flag = name => (args.find(arg => arg.startsWith(`--${name}=`)) || '').split('=').slice(1).join('=')
const APPLY = args.includes('--apply')

const endpoint = flag('endpoint') || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const apiKey = process.env[flag('key-env') || 'APPWRITE_API_KEY']
const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID

const databases = new Databases(
  new Client().setEndpoint(endpoint).setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT).setKey(apiKey)
)

const PICKUP = process.env.NEXT_PUBLIC_PICKUP_LOCATIONS_COLLECTION_ID
const ROUTES = process.env.NEXT_PUBLIC_ROUTES_COLLECTION_ID
const RATE_CARDS = process.env.NEXT_PUBLIC_RATE_CARDS_COLLECTION_ID
const MANIFESTS = process.env.NEXT_PUBLIC_MANIFESTS_COLLECTION_ID
const COMPANIES = process.env.NEXT_PUBLIC_COMPANIES_COLLECTION_ID || 'companies'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const listAll = async (collectionId, queries = []) => {
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

const idOf = value => (value && typeof value === 'object' ? value.$id : value) || null

const ensureAttribute = async () => {
  const collection = await databases.getCollection(databaseId, PICKUP)
  const attribute = collection.attributes.find(a => a.key === 'companyId')

  if (!attribute) {
    console.log(`  + pickuplocations.companyId${APPLY ? '' : ' (dry run)'}`)
    if (!APPLY) return false
    await databases.createStringAttribute(databaseId, PICKUP, 'companyId', 36, false)
  } else {
    console.log('  = pickuplocations.companyId already exists')
  }

  if (APPLY) {
    for (let i = 0; i < 60; i++) {
      const { attributes } = await databases.getCollection(databaseId, PICKUP)

      if (attributes.find(a => a.key === 'companyId')?.status === 'available') break
      await sleep(1000)
    }
  }

  if (!collection.indexes.find(index => index.key === 'idx_companyId')) {
    console.log(`  + pickuplocations index idx_companyId${APPLY ? '' : ' (dry run)'}`)
    if (APPLY) await databases.createIndex(databaseId, PICKUP, 'idx_companyId', 'key', ['companyId'])
  }

  return true
}

const main = async () => {
  console.log(`${APPLY ? 'Applying' : 'Dry run'} against ${endpoint}\n`)

  console.log('Schema')
  const hasAttribute = await ensureAttribute()

  const [companies, locations, routes, cards] = await Promise.all([
    listAll(COMPANIES),
    listAll(PICKUP),
    listAll(ROUTES, [Query.select(['$id', 'startLocation.$id'])]),
    listAll(RATE_CARDS, [Query.select(['$id', 'companyId', 'route.$id'])])
  ])

  const companyName = Object.fromEntries(companies.map(company => [company.$id, company.name]))
  const routeStart = Object.fromEntries(routes.map(route => [route.$id, idOf(route.startLocation)]))

  // pickup location id -> the companies its routes are priced for
  const pricedFor = {}

  cards.forEach(card => {
    const locationId = routeStart[idOf(card.route)]

    if (locationId && card.companyId) (pricedFor[locationId] ||= new Set()).add(card.companyId)
  })

  console.log('\nPickup locations')
  const locationCompany = {}

  for (const location of locations) {
    if (location.companyId) {
      locationCompany[location.$id] = location.companyId
      console.log(`  = ${location.locationName}: ${companyName[location.companyId] || location.companyId}`)
      continue
    }

    const found = [...(pricedFor[location.$id] || [])]

    if (found.length !== 1) {
      console.log(
        `  ? ${location.locationName}: ${found.length ? `priced for ${found.map(id => companyName[id]).join(', ')}` : 'no rate cards'}, set it by hand`
      )
      continue
    }

    locationCompany[location.$id] = found[0]
    console.log(`  + ${location.locationName} -> ${companyName[found[0]]}`)
    if (APPLY && hasAttribute) await databases.updateDocument(databaseId, PICKUP, location.$id, { companyId: found[0] })
  }

  console.log('\nManifests in the review queue with no company')
  const manifests = await listAll(MANIFESTS, [
    Query.equal('detailsVerified', false),
    Query.select(['$id', 'manifestNumber', 'clientName', 'companyId', 'packageSize', 'packageCount', 'trip.$id', 'trip.route.$id'])
  ])

  let filled = 0
  let unknown = 0

  for (const manifest of manifests) {
    // The same test the review queue uses
    if (manifest.packageSize && manifest.packageCount) continue
    if (manifest.clientName) continue

    const companyId = locationCompany[routeStart[idOf(manifest.trip?.route)]]

    if (!companyId || !companyName[companyId]) {
      unknown++
      continue
    }

    filled++
    if (APPLY) {
      await databases.updateDocument(databaseId, MANIFESTS, manifest.$id, {
        clientName: companyName[companyId],
        companyId
      })
    }
  }

  console.log(`  ${APPLY ? 'filled in' : 'would fill in'}: ${filled}`)
  if (unknown) console.log(`  no pickup company to go by: ${unknown}`)
  if (!APPLY) console.log('\nNothing was changed. Run again with --apply to make these changes.')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
