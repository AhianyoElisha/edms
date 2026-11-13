// Appwrite Imports
import { ID, Query } from 'appwrite'
import { databases, appwriteConfig } from '@/libs/appwrite.config'
import { listAllDocuments } from './paginate'

// Util Imports
import { toNameCase } from '@/utils/textCase'

/**
 * Companies are the clients whose goods are carried (Jumia, and the others).
 *
 * Every rate card, trip and manifest carries the `companyId` of the company it
 * belongs to. That is what the Company filters use, and what will let a company's
 * own login be limited to its own trips and manifests.
 *
 *  - a rate card belongs to the company picked on it
 *  - a trip belongs to the company whose rate card covers its route
 *  - a manifest belongs to the company entered on it, or else its trip's company
 *
 * `clientName` is still stored beside `companyId` on rate cards and manifests so
 * existing screens and exports keep showing the name without a second lookup.
 */

export interface CompanyType {
  $id: string
  $createdAt?: string
  name: string

  /** Short code the company's rate cards start with, e.g. JUM */
  code: string
  contactPerson?: string | null
  contactPhone?: string | null
  contactEmail?: string | null
  notes?: string | null
  isActive?: boolean | null
}

export interface CompanyInput {
  name: string
  code: string
  contactPerson?: string
  contactPhone?: string
  contactEmail?: string
  notes?: string
  isActive?: boolean
}

const nameKey = (name?: string | null) => (name || '').trim().toLowerCase().replace(/\s+/g, ' ')
const codeKey = (code?: string | null) => (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

/** All companies, by name. Pass `activeOnly` for pickers. */
export async function getCompanies(options: { activeOnly?: boolean } = {}): Promise<CompanyType[]> {
  const companies = await listAllDocuments<CompanyType>(appwriteConfig.companies, [Query.orderAsc('name')], 'companies')

  return options.activeOnly ? companies.filter(company => company.isActive !== false) : companies
}

export async function getCompanyById(companyId: string): Promise<CompanyType> {
  return (await databases.getDocument(appwriteConfig.database, appwriteConfig.companies, companyId)) as unknown as CompanyType
}

/** The company with this name (case and spacing ignored), or null. */
export async function findCompanyByName(name?: string | null): Promise<CompanyType | null> {
  const key = nameKey(name)

  if (!key) return null

  const companies = await getCompanies()

  return companies.find(company => nameKey(company.name) === key) || null
}

export async function companyIdForName(name?: string | null): Promise<string | null> {
  return (await findCompanyByName(name))?.$id || null
}

/** The company a route is carried for: the one whose rate card covers it. */
export async function companyIdForRoute(routeId?: string | null): Promise<string | null> {
  if (!routeId) return null

  try {
    const cards = await databases.listDocuments(appwriteConfig.database, appwriteConfig.ratecards, [
      Query.equal('route', routeId),
      Query.select(['$id', 'companyId', 'isActive']),
      Query.limit(50)
    ])

    const linked = cards.documents.filter((card: any) => card.companyId)

    return ((linked.find((card: any) => card.isActive !== false) || linked[0]) as any)?.companyId || null
  } catch (error) {
    console.warn('Could not work out the company for route', routeId, error)

    return null
  }
}

export async function companyIdForTrip(tripId?: string | null): Promise<string | null> {
  if (!tripId) return null

  try {
    const trip = await databases.getDocument(appwriteConfig.database, appwriteConfig.trips, tripId, [
      Query.select(['$id', 'companyId'])
    ])

    return (trip as any).companyId || null
  } catch (error) {
    console.warn('Could not read the company of trip', tripId, error)

    return null
  }
}

// A second "Jumia" (or a second company using the code JUM) is the duplication this exists to stop
const assertUnique = async (input: { name: string; code: string }, excludeId?: string) => {
  const companies = await getCompanies()
  const others = companies.filter(company => company.$id !== excludeId)

  const sameName = others.find(company => nameKey(company.name) === nameKey(input.name))

  if (sameName) throw new Error(`${sameName.name} is already a company.`)

  const sameCode = others.find(company => codeKey(company.code) === codeKey(input.code))

  if (sameCode) throw new Error(`The code ${sameCode.code} is already used by ${sameCode.name}.`)
}

const clean = (input: CompanyInput) => ({
  name: input.name.trim(),
  code: codeKey(input.code),
  contactPerson: input.contactPerson?.trim() || null,
  contactPhone: input.contactPhone?.trim() || null,
  contactEmail: input.contactEmail?.trim() || null,
  notes: input.notes?.trim() || null,
  isActive: input.isActive !== false
})

export async function createCompany(input: CompanyInput): Promise<CompanyType> {
  const data = clean(input)

  if (!data.name || !data.code) throw new Error('A company needs a name and a code.')

  await assertUnique(data)

  return (await databases.createDocument(appwriteConfig.database, appwriteConfig.companies, ID.unique(), data)) as unknown as CompanyType
}

export async function updateCompany(companyId: string, input: CompanyInput): Promise<CompanyType> {
  const data = clean(input)

  if (!data.name || !data.code) throw new Error('A company needs a name and a code.')

  await assertUnique(data, companyId)

  const before = await getCompanyById(companyId)

  const company = (await databases.updateDocument(
    appwriteConfig.database,
    appwriteConfig.companies,
    companyId,
    data
  )) as unknown as CompanyType

  // The name is copied onto rate cards and manifests; keep the copies in step on a rename
  const newName = toNameCase(data.name)

  if (before.name !== newName) {
    for (const collectionId of [appwriteConfig.ratecards, appwriteConfig.manifests]) {
      const rows = await listAllDocuments<any>(collectionId, [
        Query.equal('companyId', companyId),
        Query.select(['$id', 'clientName'])
      ])

      for (const row of rows) {
        if (row.clientName !== newName) {
          await databases.updateDocument(appwriteConfig.database, collectionId, row.$id, { clientName: newName })
        }
      }
    }
  }

  return company
}

/** How many rate cards, trips and manifests belong to each company (for the list page). */
export async function getCompanyUsage(): Promise<Record<string, { rateCards: number; trips: number; manifests: number }>> {
  const usage: Record<string, { rateCards: number; trips: number; manifests: number }> = {}
  const companies = await getCompanies()

  await Promise.all(
    companies.map(async company => {
      const count = async (collectionId: string) =>
        (
          await databases.listDocuments(appwriteConfig.database, collectionId, [
            Query.equal('companyId', company.$id),
            Query.select(['$id']),
            Query.limit(1)
          ])
        ).total

      const [rateCards, trips, manifests] = await Promise.all([
        count(appwriteConfig.ratecards),
        count(appwriteConfig.trips),
        count(appwriteConfig.manifests)
      ])

      usage[company.$id] = { rateCards, trips, manifests }
    })
  )

  return usage
}
