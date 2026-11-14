// Util Imports
import { monthKeyOfDate, tripDateMonth, tripDatePeriod, tripInvoicePeriod } from '@/utils/invoiceMonth'
import type { InvoicePeriod } from '@/utils/invoiceMonth'

/**
 * Turns a month's trips into the rows and totals of the monthly breakdown.
 * Kept apart from the page so the sums can be read (and checked) on their own.
 */

export type BreakdownTrip = {
  $id: string
  tripNumber: string
  tripDate: string
  status: string
  driverId: string
  driverName: string
  vehicleNumber: string
  routeName: string
  tonnage: string
  companyId: string
  price: number

  /** Counts towards revenue: every trip except cancelled ones */
  earns: boolean

  /** Month the trip was run in, and the month it is invoiced in */
  runMonth: string
  invoiceMonth: string

  /** Invoiced to the client, and paid by them */
  invoiced: boolean
  paid: boolean

  /** Which of the month's two invoices its date puts it on, and the one it is on (0: one invoice a month) */
  runPeriod: InvoicePeriod
  invoicePeriod: InvoicePeriod

  /** Run in / invoiced in the month - or the single invoice - being looked at */
  runIn: boolean
  invoiceIn: boolean

  /** Moved to a later invoice / brought into this one from another */
  movedOut: boolean
  movedIn: boolean

  /** On a different invoice from the one its trip date puts it on */
  moved: boolean

  manifestCount: number
  deliveredManifests: number

  /** When the last drop was delivered, if every drop has been */
  closedAt: string

  /** Every drop delivered, but the last one after the invoice its trip date puts it on had closed */
  closedAfterRunMonth: boolean

  packagesSent: number
  packagesDelivered: number
  packagesShort: number
  packagesExtra: number
  packagesReturned: number
}

const DELIVERED = new Set(['delivered', 'completed'])
const number = (value: unknown) => Number(value) || 0

/**
 * `period` is the invoice being looked at: 0 for the whole month, 1 or 2 for one of
 * a twice-monthly client's invoices. `cutoffDay` is that trip's client's cut-off.
 */
export const toBreakdownTrip = (trip: any, month: string, cutoffDay: number | null = null, period: InvoicePeriod = 0): BreakdownTrip => {
  const manifests: any[] = Array.isArray(trip.manifests) ? trip.manifests.filter((m: any) => m && typeof m === 'object') : []
  const delivered = manifests.filter(m => DELIVERED.has(m.status))
  const allDelivered = manifests.length > 0 && delivered.length === manifests.length

  const closedAt = allDelivered
    ? delivered
        .map(m => m.deliveryTime || '')
        .sort()
        .pop() || ''
    : ''

  const runMonth = tripDateMonth(trip)
  const invoiceMonth = trip.billingMonth || runMonth
  const runPeriod = tripDatePeriod(trip, cutoffDay)
  const invoicePeriod = tripInvoicePeriod(trip, cutoffDay)
  const runIn = runMonth === month && (period === 0 || runPeriod === period)
  const invoiceIn = invoiceMonth === month && (period === 0 || invoicePeriod === period)

  // Closed too late for the invoice its date puts it on: after the cut-off for a
  // first-invoice trip, after the month for the rest
  const closedLate =
    !!closedAt &&
    (monthKeyOfDate(closedAt) > runMonth ||
      (runPeriod === 1 && !!cutoffDay && monthKeyOfDate(closedAt) === runMonth && new Date(closedAt).getDate() > cutoffDay))

  let sent = 0
  let deliveredPackages = 0
  let short = 0
  let extra = 0

  delivered.forEach(m => {
    const count = number(m.packageCount)
    const got = number(m.deliveredCount)

    sent += count
    deliveredPackages += got
    extra += number(m.surplusCount)

    // What the office recorded as short; failing that, the gap between what was
    // loaded and what was counted off - only when both were actually counted
    short += number(m.shortageCount) || (count > 0 && got > 0 ? Math.max(0, count - got) : 0)
  })

  const returns: any[] = Array.isArray(trip.returnWaybills) ? trip.returnWaybills.filter((r: any) => r && typeof r === 'object') : []

  return {
    $id: trip.$id,
    tripNumber: trip.tripNumber || '',
    tripDate: trip.tripDate || '',
    status: trip.status || '',
    driverId: (trip.driver && typeof trip.driver === 'object' ? trip.driver.$id : trip.driver) || '',
    driverName: (trip.driver && typeof trip.driver === 'object' && trip.driver.name) || 'No driver',
    vehicleNumber: (trip.vehicle && typeof trip.vehicle === 'object' && trip.vehicle.vehicleNumber) || '',
    routeName: (trip.route && typeof trip.route === 'object' && trip.route.routeName) || 'No route',
    tonnage: trip.tonnage || '',
    companyId: trip.companyId || '',
    price: number(trip.tripCost) || number(trip.clientRate),
    earns: trip.status !== 'cancelled' && trip.status !== 'deleted',
    runMonth,
    invoiceMonth,
    invoiced: !!trip.invoiceGenerated,
    paid: !!trip.invoiceGenerated && trip.paymentStatus === 'paid',
    runPeriod,
    invoicePeriod,
    runIn,
    invoiceIn,
    movedOut: runIn && !invoiceIn,
    movedIn: invoiceIn && !runIn,
    moved: invoiceMonth !== runMonth || invoicePeriod !== runPeriod,
    manifestCount: manifests.length,
    deliveredManifests: delivered.length,
    closedAt,
    closedAfterRunMonth: closedLate,
    packagesSent: sent,
    packagesDelivered: deliveredPackages,
    packagesShort: short,
    packagesExtra: extra,
    packagesReturned: returns.reduce((sum, r) => sum + number(r.packageCount), 0)
  }
}

export const sumPrice = (trips: BreakdownTrip[]) => trips.reduce((sum, trip) => sum + (trip.earns ? trip.price : 0), 0)

export type DriverLine = { routeName: string; tonnage: string; price: number; trips: number; amount: number }

export type DriverBreakdown = {
  driverId: string
  driverName: string
  trips: number
  cancelled: number
  amount: number
  lines: DriverLine[]
  packagesSent: number
  packagesDelivered: number
  packagesShort: number
  packagesExtra: number
  packagesReturned: number
  tripsWithShortage: BreakdownTrip[]
}

/** One entry per driver, with their trips grouped by route, tonnage and price. */
export const byDriver = (trips: BreakdownTrip[]): DriverBreakdown[] => {
  const drivers = new Map<string, DriverBreakdown & { lineMap: Map<string, DriverLine> }>()

  trips.forEach(trip => {
    const key = trip.driverId || 'none'

    if (!drivers.has(key)) {
      drivers.set(key, {
        driverId: trip.driverId,
        driverName: trip.driverName,
        trips: 0,
        cancelled: 0,
        amount: 0,
        lines: [],
        lineMap: new Map(),
        packagesSent: 0,
        packagesDelivered: 0,
        packagesShort: 0,
        packagesExtra: 0,
        packagesReturned: 0,
        tripsWithShortage: []
      })
    }

    const driver = drivers.get(key)!

    driver.packagesSent += trip.packagesSent
    driver.packagesDelivered += trip.packagesDelivered
    driver.packagesShort += trip.packagesShort
    driver.packagesExtra += trip.packagesExtra
    driver.packagesReturned += trip.packagesReturned
    if (trip.packagesShort > 0) driver.tripsWithShortage.push(trip)

    if (!trip.earns) {
      driver.cancelled++

      return
    }

    driver.trips++
    driver.amount += trip.price

    const lineKey = `${trip.routeName}|${trip.tonnage}|${trip.price}`
    const line = driver.lineMap.get(lineKey) || { routeName: trip.routeName, tonnage: trip.tonnage, price: trip.price, trips: 0, amount: 0 }

    line.trips++
    line.amount += trip.price
    driver.lineMap.set(lineKey, line)
  })

  return [...drivers.values()]
    .map(({ lineMap, ...driver }) => ({
      ...driver,
      lines: [...lineMap.values()].sort((a, b) => b.amount - a.amount || a.routeName.localeCompare(b.routeName))
    }))
    .sort((a, b) => b.amount - a.amount || a.driverName.localeCompare(b.driverName))
}
