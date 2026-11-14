// Appwrite Imports
import { Query } from 'appwrite'
import { appwriteConfig, databases } from '@/libs/appwrite.config'

// Action Imports
import { listAllDocuments, listAllRows } from './paginate'

// Util Imports
import { monthKey, tripDateMonth } from '@/utils/invoiceMonth'

/**
 * A month's trips for anything that adds up money: the dashboard, the revenue,
 * driver, route and invoicing reports, and the monthly breakdown.
 *
 * That is every trip run in the month, minus those moved to another month's invoice,
 * plus those moved in from another month. See `src/utils/invoiceMonth.ts`.
 *
 * `api` picks how relationships come back, to suit the caller: 'rows' for the tables
 * API, 'documents' for the older one.
 */
export async function listTripsForInvoiceMonth<T extends { $id: string } = any>(
  month: number,
  year: number,
  api: 'rows' | 'documents' = 'documents',
  extraQueries: string[] = []
): Promise<T[]> {
  const { inMonth, movedIn } = await listTripsAroundMonth<T>(month, year, api, extraQueries)
  const key = monthKey(year, month)

  return [...inMonth.filter((trip: any) => !trip.billingMonth || trip.billingMonth === key), ...movedIn]
}

/**
 * The two halves separately: every trip run in the month (including any since moved
 * out of it), and the trips moved into it from another month.
 */
export async function listTripsAroundMonth<T extends { $id: string } = any>(
  month: number,
  year: number,
  api: 'rows' | 'documents' = 'documents',
  extraQueries: string[] = []
): Promise<{ inMonth: T[]; movedIn: T[] }> {
  const key = monthKey(year, month)
  const start = new Date(year, month, 1).toISOString()
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString()
  const list = api === 'rows' ? listAllRows : listAllDocuments

  const [inMonth, moved] = await Promise.all([
    list<any>(
      appwriteConfig.trips,
      [
        Query.greaterThanEqual('tripDate', start),
        Query.lessThanEqual('tripDate', end),
        Query.notEqual('status', 'deleted'),
        ...extraQueries
      ],
      'trips of the month'
    ),
    list<any>(
      appwriteConfig.trips,
      [Query.equal('billingMonth', key), Query.notEqual('status', 'deleted'), ...extraQueries],
      'trips moved into the month'
    )
  ])

  return {
    inMonth: inMonth as T[],

    // A trip "moved" to the month it was run in is simply in that month
    movedIn: moved.filter((trip: any) => tripDateMonth(trip) !== key) as T[]
  }
}

/**
 * Move trips onto another month's invoice, or back to the month they were run in
 * (null). For a client invoiced twice a month, `billingPeriod` names which of that
 * month's invoices (1 or 2); null leaves it to the trip date.
 * Returns how many were changed and the first error, if any failed.
 */
export async function setTripsInvoiceMonth(tripIds: string[], billingMonth: string | null, billingPeriod: 1 | 2 | null = null) {
  let changed = 0
  let firstError = ''

  for (const tripId of tripIds) {
    try {
      await databases.updateDocument(appwriteConfig.database, appwriteConfig.trips, tripId, { billingMonth, billingPeriod })
      changed++
    } catch (error: any) {
      console.error('Could not change the invoice month of trip', tripId, error)
      if (!firstError) firstError = error?.message || 'Unknown error'
    }
  }

  return { changed, failed: tripIds.length - changed, firstError }
}

/**
 * Record that trips have been invoiced to the client, and whether they have been paid.
 * `invoiced: false` clears both, for a trip ticked by mistake.
 */
export async function setTripsBilling(tripIds: string[], update: { invoiced: boolean; paid?: boolean }) {
  const data = update.invoiced
    ? { invoiceGenerated: true, ...(update.paid === undefined ? {} : { paymentStatus: update.paid ? 'paid' : 'pending' }) }
    : { invoiceGenerated: false, paymentStatus: 'pending' }

  let changed = 0
  let firstError = ''

  for (const tripId of tripIds) {
    try {
      await databases.updateDocument(appwriteConfig.database, appwriteConfig.trips, tripId, data)
      changed++
    } catch (error: any) {
      console.error('Could not update the invoice status of trip', tripId, error)
      if (!firstError) firstError = error?.message || 'Unknown error'
    }
  }

  return { changed, failed: tripIds.length - changed, firstError }
}
