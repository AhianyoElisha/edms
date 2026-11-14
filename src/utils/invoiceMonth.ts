/**
 * The invoice month of a trip.
 *
 * A trip normally counts in the month it was run. But a client only pays for a trip
 * once it is closed on their side, so a trip that leaves on the 30th and is closed on
 * the 2nd lands on next month's invoice. Such a trip is moved: `billingMonth` holds
 * the month it is invoiced in ("2026-11"). Trips that were never moved leave it empty.
 */

const pad = (value: number) => String(value).padStart(2, '0')

/** "2026-11" for a year and a zero-based month, as `Date` counts them. */
export const monthKey = (year: number, month: number) => `${year}-${pad(month + 1)}`

/** The month a date falls in, in local time - the same way the month filters cut it. */
export const monthKeyOfDate = (value?: string | Date | null) => {
  if (!value) return ''

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? '' : monthKey(date.getFullYear(), date.getMonth())
}

export const parseMonthKey = (key: string) => {
  const [year, month] = key.split('-').map(Number)

  return { year, month: month - 1 }
}

/** The month after (or before, with -1) a month key. */
export const shiftMonthKey = (key: string, by: number) => {
  const { year, month } = parseMonthKey(key)
  const date = new Date(year, month + by, 1)

  return monthKey(date.getFullYear(), date.getMonth())
}

/** "November 2026" */
export const monthLabel = (key: string, style: 'long' | 'short' = 'long') => {
  if (!key) return ''

  const { year, month } = parseMonthKey(key)

  return new Date(year, month, 1).toLocaleString('en-GB', { month: style, year: 'numeric' })
}

/** The month a trip was run in. */
export const tripDateMonth = (trip: { tripDate?: string | null }) => monthKeyOfDate(trip.tripDate)

/** The month a trip is invoiced in: where it was moved to, or else the month it was run. */
export const tripInvoiceMonth = (trip: { tripDate?: string | null; billingMonth?: string | null }) =>
  trip.billingMonth || tripDateMonth(trip)

/** True when a trip has been moved out of the month it was run in. */
export const tripWasMoved = (trip: { tripDate?: string | null; billingMonth?: string | null }) =>
  !!trip.billingMonth && trip.billingMonth !== tripDateMonth(trip)

/*
 * Two invoices a month.
 *
 * Some clients invoice twice: trips up to a cut-off day (say the 14th) on the first
 * invoice, the rest of the month on the second. A trip run before the cut-off but
 * closed after it slips to the second invoice, exactly as a trip closed after month
 * end slips to the next month. `billingPeriod` (1 or 2) records that; empty means
 * the invoice its trip date puts it on.
 *
 * A period of 0 means the client has one invoice a month.
 */

export type InvoicePeriod = 0 | 1 | 2

type PeriodTrip = { tripDate?: string | null; billingMonth?: string | null; billingPeriod?: number | null }

/** The invoice a trip's date puts it on, for a client with this cut-off day. */
export const tripDatePeriod = (trip: PeriodTrip, cutoffDay?: number | null): InvoicePeriod => {
  if (!cutoffDay || !trip.tripDate) return 0

  const date = new Date(trip.tripDate)

  return Number.isNaN(date.getTime()) ? 0 : date.getDate() <= cutoffDay ? 1 : 2
}

/** The invoice a trip is actually on. */
export const tripInvoicePeriod = (trip: PeriodTrip, cutoffDay?: number | null): InvoicePeriod => {
  if (!cutoffDay) return 0
  if (trip.billingPeriod === 1 || trip.billingPeriod === 2) return trip.billingPeriod

  // Moved to another month with no invoice named: that month's first
  return tripWasMoved(trip) ? 1 : tripDatePeriod(trip, cutoffDay)
}

export const periodLabel = (period: InvoicePeriod) => (period === 1 ? '1st invoice' : period === 2 ? '2nd invoice' : '')
