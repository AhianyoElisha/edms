/**
 * Closes the database to everything except staff accounts, so that a company
 * login cannot read other companies' (or any) data by asking the database directly.
 *
 *   node scripts/apply-company-isolation.js            # dry run: prints what would change
 *   node scripts/apply-company-isolation.js --apply    # makes the changes
 *
 * What it does, in this order:
 *   1. Makes sure the `company` role exists (renames the unused `partners` role).
 *   2. Labels every sign-in account `staff`, except company logins, which get `company`.
 *   3. Replaces "any signed-in user" with "accounts labelled staff" in the permissions
 *      of every collection and of the file bucket.
 *
 * Step 2 runs before step 3 so nobody is locked out in between. Safe to run again:
 * accounts already labelled and collections already restricted are left alone.
 *
 * To undo step 3, run with --revert (puts "any signed-in user" back).
 *
 * Another Appwrite instance:
 *   node scripts/apply-company-isolation.js --endpoint=https://api.example.com/v1 --key-env=VPS_APPWRITE_API_KEY --apply
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') })

const { Client, Databases, Storage, Users, Query } = require('node-appwrite')

const args = process.argv.slice(2)
const flag = name => (args.find(arg => arg.startsWith(`--${name}=`)) || '').split('=').slice(1).join('=')
const APPLY = args.includes('--apply')
const REVERT = args.includes('--revert')

const endpoint = flag('endpoint') || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const client = new Client()
  .setEndpoint(endpoint)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT)
  .setKey(process.env[flag('key-env') || 'APPWRITE_API_KEY'])

const databases = new Databases(client)
const storage = new Storage(client)
const users = new Users(client)
const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID

const STAFF = 'label:staff'
const FROM = REVERT ? STAFF : 'users'
const TO = REVERT ? 'users' : STAFF

// Each browser registers its own push subscription; that collection is already private per account
const SKIP_COLLECTIONS = new Set([process.env.NEXT_PUBLIC_PUSH_SUBSCRIPTIONS_COLLECTION_ID || 'pushsubscriptions'])

const swap = permissions => permissions.map(permission => permission.replace(`("${FROM}")`, `("${TO}")`))
const changed = (a, b) => a.join('|') !== b.join('|')

const listAll = async (fn, key) => {
  const rows = []
  let cursor

  for (;;) {
    const page = await fn([Query.limit(100), ...(cursor ? [Query.cursorAfter(cursor)] : [])])

    rows.push(...page[key])
    if (page[key].length < 100) return rows
    cursor = page[key][page[key].length - 1].$id
  }
}

const ensureCompanyRole = async () => {
  console.log('Role')

  const rolesId = process.env.NEXT_PUBLIC_ROLES_COLLECTION_ID
  const roles = (await databases.listDocuments(databaseId, rolesId, [Query.limit(100)])).documents

  if (roles.some(role => role.name === 'company')) return console.log('  = company role already exists')

  const partners = roles.find(role => role.name === 'partners')
  const data = {
    name: 'company',
    displayName: 'Company',
    description: "A company's own login: sees only that company's trips and manifests",
    isActive: true
  }

  if (!APPLY) return console.log(`  + company role would be ${partners ? 'made from the unused "partners" role' : 'created'}`)

  if (partners) await databases.updateDocument(databaseId, rolesId, partners.$id, data)
  else await databases.createDocument(databaseId, rolesId, 'unique()', data)

  console.log(`  + company role ${partners ? 'made from the "partners" role' : 'created'}`)
}

const labelAccounts = async () => {
  console.log('\nAccounts')

  const userDocs = await listAll(
    queries => databases.listDocuments(databaseId, process.env.NEXT_PUBLIC_USERS_COLLECTION_ID, [...queries, Query.select(['$id', 'accountId', 'companyId'])]),
    'documents'
  )

  const companyAccounts = new Set(userDocs.filter(doc => doc.companyId).map(doc => doc.accountId))
  const accounts = await listAll(queries => users.list(queries), 'users')
  let done = 0
  let already = 0

  for (const account of accounts) {
    const wanted = companyAccounts.has(account.$id) ? 'company' : 'staff'
    const labels = account.labels || []

    if (labels.includes(wanted) && !labels.includes(wanted === 'staff' ? 'company' : 'staff')) {
      already++
      continue
    }

    // Keep any unrelated labels the account already has
    const next = [...labels.filter(label => label !== 'staff' && label !== 'company'), wanted]

    if (APPLY) await users.updateLabels(account.$id, next)
    done++
  }

  console.log(`  ${accounts.length} sign-in accounts: ${done} ${APPLY ? 'labelled' : 'would be labelled'}, ${already} already correct, ${companyAccounts.size} company logins`)
}

const restrict = async () => {
  console.log(`\nPermissions (${REVERT ? 'staff only -> any signed-in user' : 'any signed-in user -> staff only'})`)

  const collections = await listAll(queries => databases.listCollections(databaseId, queries), 'collections')

  for (const collection of collections) {
    if (SKIP_COLLECTIONS.has(collection.$id)) {
      console.log(`  = ${collection.name} left as it is (private per account)`)
      continue
    }

    const next = swap(collection.$permissions)

    if (!changed(collection.$permissions, next)) {
      console.log(`  = ${collection.name} already ${REVERT ? 'open to signed-in users' : 'staff only'}`)
      continue
    }

    if (APPLY) {
      await databases.updateCollection(databaseId, collection.$id, collection.name, next, collection.documentSecurity, collection.enabled)
    }

    console.log(`  ${APPLY ? '+' : '~'} ${collection.name}: ${next.join(', ')}${APPLY ? '' : ' (would change)'}`)
  }

  const { buckets } = await storage.listBuckets()

  for (const bucket of buckets) {
    const next = swap(bucket.$permissions)

    if (!changed(bucket.$permissions, next)) {
      console.log(`  = bucket ${bucket.name} already ${REVERT ? 'open to signed-in users' : 'staff only'}`)
      continue
    }

    if (APPLY) {
      await storage.updateBucket(
        bucket.$id, bucket.name, next, bucket.fileSecurity, bucket.enabled, bucket.maximumFileSize,
        bucket.allowedFileExtensions, bucket.compression, bucket.encryption, bucket.antivirus
      )
    }

    console.log(`  ${APPLY ? '+' : '~'} bucket ${bucket.name}: ${next.join(', ')}${APPLY ? '' : ' (would change)'}`)
  }
}

const main = async () => {
  console.log(`${APPLY ? 'APPLYING to' : 'DRY RUN against'} ${endpoint} (database ${databaseId})\n`)

  if (!REVERT) {
    await ensureCompanyRole()
    await labelAccounts()
  }

  await restrict()
  console.log(APPLY ? '\nDone.' : '\nNothing was changed. Re-run with --apply to make these changes.')
}

main().catch(error => {
  console.error('\nFailed:', error.message)
  process.exit(1)
})
