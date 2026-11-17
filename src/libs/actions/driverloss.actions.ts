// Appwrite Imports
import { ID, Query } from 'appwrite'
import { databases, appwriteConfig } from '@/libs/appwrite.config'

// Action Imports
import { listAllDocuments } from './paginate'

// Type Imports
import type {
  DriverLossType,
  DriverLossPaymentType,
  DriverLossPaymentMethod,
  DriverLossStatus
} from '@/types/apps/deliveryTypes'

/**
 * The driver loss sheet.
 *
 * Each lost item charged to a driver is one row in `driverlosses`. Rows come from
 * two places:
 *   - shortage: one row per missing package on a verified manifest. The manifest's
 *     shortageCount is the source of truth; rows are added when it goes up and
 *     marked "found" when it comes down, so finding goods clears the driver without
 *     anyone re-entering anything on the sheet.
 *   - manual: losses the office adds on a trip (damage, anything not a shortage).
 *
 * The office prices each row. What the driver pays back (cash, mobile money, or a
 * deduction the office enters by hand) is recorded in `driverlosspayments`.
 * Balance = priced rows still owed - payments. The system never works out driver pay.
 */

const DATABASE_ID = appwriteConfig.database
const LOSSES = appwriteConfig.driverlosses
const PAYMENTS = appwriteConfig.driverlosspayments

const relationId = (value: any): string | null => (value && typeof value === 'object' ? value.$id : value) || null

const roundMoney = (value: number) => Math.round(value * 100) / 100

/** What a row counts for on the sheet: its price while owed, nothing otherwise. */
export const owedValue = (loss: Pick<DriverLossType, 'status' | 'value'>) =>
  loss.status === 'owed' ? Number(loss.value) || 0 : 0

/** A row still owed that nobody has priced yet. */
export const needsPrice = (loss: Pick<DriverLossType, 'status' | 'value'>) =>
  loss.status === 'owed' && (loss.value === null || loss.value === undefined)

export interface LossTotals {
  owed: number
  paid: number
  balance: number
  itemsOwed: number
  itemsNeedingPrice: number
  itemsFound: number
}

export const lossTotals = (losses: DriverLossType[], payments: DriverLossPaymentType[]): LossTotals => {
  const owed = roundMoney(losses.reduce((sum, loss) => sum + owedValue(loss), 0))
  const paid = roundMoney(payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0))

  return {
    owed,
    paid,
    balance: roundMoney(owed - paid),
    itemsOwed: losses.filter(loss => loss.status === 'owed').length,
    itemsNeedingPrice: losses.filter(needsPrice).length,
    itemsFound: losses.filter(loss => loss.status === 'found').length
  }
}

// ============================================
// Reading
// ============================================

export const getLossesForTrip = (tripId: string) =>
  listAllDocuments<DriverLossType>(LOSSES, [Query.equal('tripId', tripId), Query.orderAsc('$createdAt')], 'trip losses')

export const getLossesForManifest = (manifestId: string) =>
  listAllDocuments<DriverLossType>(
    LOSSES,
    [Query.equal('manifestId', manifestId), Query.orderAsc('$createdAt')],
    'manifest losses'
  )

export const getLossesForDriver = (driverId: string) =>
  listAllDocuments<DriverLossType>(LOSSES, [Query.equal('driverId', driverId), Query.orderDesc('lossDate')], 'driver losses')

export const getPaymentsForDriver = (driverId: string) =>
  listAllDocuments<DriverLossPaymentType>(
    PAYMENTS,
    [Query.equal('driverId', driverId), Query.orderDesc('paidAt')],
    'driver loss payments'
  )

export const getLossesForTrips = async (tripIds: string[]): Promise<DriverLossType[]> => {
  const rows: DriverLossType[] = []

  // Appwrite caps an equal() list at 100 values
  for (let i = 0; i < tripIds.length; i += 100) {
    rows.push(
      ...(await listAllDocuments<DriverLossType>(LOSSES, [Query.equal('tripId', tripIds.slice(i, i + 100))], 'trip losses'))
    )
  }

  return rows
}

export interface DriverLossSummary extends LossTotals {
  driverId: string
  driverName: string
  lastLossDate: string | null
  lastPaymentDate: string | null
}

/** One line per driver who has ever had a loss or a payment, largest balance first. */
export const getLossSheet = async (): Promise<DriverLossSummary[]> => {
  const [losses, payments] = await Promise.all([
    listAllDocuments<DriverLossType>(LOSSES, [], 'losses'),
    listAllDocuments<DriverLossPaymentType>(PAYMENTS, [], 'loss payments')
  ])

  const driverIds = Array.from(new Set([...losses.map(l => l.driverId), ...payments.map(p => p.driverId)])).filter(Boolean)
  const names = await getDriverNames(driverIds)

  return driverIds
    .map(driverId => {
      const driverLosses = losses.filter(l => l.driverId === driverId)
      const driverPayments = payments.filter(p => p.driverId === driverId)

      const latest = (dates: (string | null | undefined)[]) =>
        dates.filter(Boolean).sort().pop() || null

      return {
        driverId,
        driverName: names[driverId] || 'Unknown driver',
        ...lossTotals(driverLosses, driverPayments),
        lastLossDate: latest(driverLosses.map(l => l.lossDate || l.$createdAt)),
        lastPaymentDate: latest(driverPayments.map(p => p.paidAt))
      }
    })
    .sort((a, b) => b.balance - a.balance || b.itemsNeedingPrice - a.itemsNeedingPrice)
}

export const getDriverNames = async (driverIds: string[]): Promise<Record<string, string>> => {
  const names: Record<string, string> = {}

  for (let i = 0; i < driverIds.length; i += 100) {
    const batch = driverIds.slice(i, i + 100)

    if (batch.length === 0) continue

    const response = await databases.listDocuments(DATABASE_ID, appwriteConfig.users, [
      Query.equal('$id', batch),
      Query.select(['$id', 'name']),
      Query.limit(100)
    ])

    response.documents.forEach((user: any) => {
      names[user.$id] = user.name
    })
  }

  return names
}

export interface LossTripInfo {
  $id: string
  tripNumber: string
  tripDate: string | null
  routeName: string | null
  vehicleNumber: string | null
}

/** Trip number, date, route and vehicle for the trips a set of losses came from. */
export const getTripInfo = async (tripIds: string[]): Promise<Record<string, LossTripInfo>> => {
  const info: Record<string, LossTripInfo> = {}

  for (let i = 0; i < tripIds.length; i += 100) {
    const batch = tripIds.slice(i, i + 100)

    if (batch.length === 0) continue

    const response = await databases.listDocuments(DATABASE_ID, appwriteConfig.trips, [
      Query.equal('$id', batch),
      Query.select(['$id', 'tripNumber', 'tripDate', 'route.routeName', 'vehicle.vehicleNumber']),
      Query.limit(100)
    ])

    response.documents.forEach((trip: any) => {
      info[trip.$id] = {
        $id: trip.$id,
        tripNumber: trip.tripNumber || trip.$id,
        tripDate: trip.tripDate || null,
        routeName: trip.route?.routeName || null,
        vehicleNumber: trip.vehicle?.vehicleNumber || null
      }
    })
  }

  return info
}

// ============================================
// Keeping shortage rows in step with manifests
// ============================================

/**
 * How many missing packages on a manifest should be charged. Only figures the
 * office has confirmed count: a shortage the driver typed in the field stays off
 * the sheet until the manifest is reviewed.
 */
const confirmedShortage = (manifest: any): number => {
  const confirmed = manifest?.detailsVerified === true || (!!manifest?.packageSize && !!manifest?.packageCount)

  return confirmed ? Math.max(0, Math.floor(manifest?.shortageCount || 0)) : 0
}

/**
 * Which owed rows to mark found when a shortage comes down by `count`: the ones the
 * office picked first, then unpriced rows (nothing to lose), then the newest.
 */
const pickRowsToClear = (open: DriverLossType[], count: number, preferredIds: string[] = []) => {
  const preferred = open.filter(row => preferredIds.includes(row.$id))
  const unpriced = open.filter(row => !preferredIds.includes(row.$id) && needsPrice(row))
  const rest = open
    .filter(row => !preferredIds.includes(row.$id) && !needsPrice(row))
    .sort((a, b) => b.$createdAt.localeCompare(a.$createdAt))

  return [...preferred, ...unpriced, ...rest].slice(0, count)
}

/**
 * Bring one manifest's shortage rows in line with its confirmed shortage count.
 *
 * Goes up: adds "price needed" rows. Goes down: marks rows found (they stay on the
 * sheet as history). `foundIds` lets the office say which items turned up when
 * they are priced differently.
 */
export const syncManifestLosses = async (
  manifestId: string,
  options: { foundIds?: string[]; by?: string } = {}
): Promise<DriverLossType[]> => {
  const manifest = (await databases.getDocument(DATABASE_ID, appwriteConfig.manifests, manifestId)) as any
  const tripId = relationId(manifest.trip)

  if (!tripId) return []

  const trip = (await databases.getDocument(DATABASE_ID, appwriteConfig.trips, tripId, [
    Query.select(['$id', 'tripDate', 'companyId', 'driver.$id'])
  ])) as any

  const driverId = relationId(trip.driver)

  if (!driverId) return []

  const target = confirmedShortage(manifest)
  const rows = (await getLossesForManifest(manifestId)).filter(row => row.source === 'shortage')
  const open = rows.filter(row => row.status === 'owed')
  const now = new Date().toISOString()

  // The trip was moved to another driver: the open rows follow it
  for (const row of open.filter(row => row.driverId !== driverId)) {
    await databases.updateDocument(DATABASE_ID, LOSSES, row.$id, { driverId })
    row.driverId = driverId
  }

  if (open.length < target) {
    for (let i = open.length; i < target; i++) {
      await databases.createDocument(DATABASE_ID, LOSSES, ID.unique(), {
        driverId,
        tripId,
        manifestId,
        companyId: manifest.companyId || trip.companyId || null,
        source: 'shortage',
        description: `Missing package (manifest ${manifest.manifestNumber})`,
        value: null,
        status: 'owed',
        lossDate: trip.tripDate || manifest.deliveryTime || now,
        createdBy: options.by || null
      })
    }
  } else if (open.length > target) {
    for (const row of pickRowsToClear(open, open.length - target, options.foundIds)) {
      await databases.updateDocument(DATABASE_ID, LOSSES, row.$id, {
        status: 'found',
        resolvedAt: now,
        resolvedBy: options.by || null
      })
    }
  }

  return getLossesForManifest(manifestId)
}

/**
 * Bring every manifest on a trip in line. Run when the office opens a trip's
 * losses, so shortages recorded before the loss sheet existed (or saved while a
 * sync failed) still land on it.
 */
export const syncTripLosses = async (tripId: string, by?: string): Promise<DriverLossType[]> => {
  const [manifests, rows] = await Promise.all([
    listAllDocuments<any>(appwriteConfig.manifests, [
      Query.equal('trip', tripId),
      Query.select(['$id', 'shortageCount', 'detailsVerified', 'packageSize', 'packageCount'])
    ]),
    getLossesForTrip(tripId)
  ])

  for (const manifest of manifests) {
    const open = rows.filter(row => row.manifestId === manifest.$id && row.source === 'shortage' && row.status === 'owed')

    if (open.length !== confirmedShortage(manifest)) await syncManifestLosses(manifest.$id, { by })
  }

  return getLossesForTrip(tripId)
}

// ============================================
// Office edits
// ============================================

export const addManualLoss = async (params: {
  tripId: string
  description: string
  value: number | null
  notes?: string
  by?: string
}): Promise<DriverLossType> => {
  const trip = (await databases.getDocument(DATABASE_ID, appwriteConfig.trips, params.tripId, [
    Query.select(['$id', 'tripDate', 'companyId', 'driver.$id'])
  ])) as any

  const driverId = relationId(trip.driver)

  if (!driverId) throw new Error('This trip has no driver to charge the loss to')

  return (await databases.createDocument(DATABASE_ID, LOSSES, ID.unique(), {
    driverId,
    tripId: params.tripId,
    manifestId: null,
    companyId: trip.companyId || null,
    source: 'manual',
    description: params.description.trim(),
    value: params.value === null ? null : roundMoney(Math.max(0, params.value)),
    status: 'owed',
    lossDate: trip.tripDate || new Date().toISOString(),
    notes: params.notes?.trim() || null,
    createdBy: params.by || null
  })) as unknown as DriverLossType
}

/** Price or describe a lost item. */
export const updateLoss = async (
  lossId: string,
  changes: { description?: string; value?: number | null; notes?: string | null }
): Promise<DriverLossType> => {
  const data: Record<string, unknown> = {}

  if (changes.description !== undefined) data.description = changes.description.trim()
  if (changes.value !== undefined) data.value = changes.value === null ? null : roundMoney(Math.max(0, changes.value))
  if (changes.notes !== undefined) data.notes = changes.notes?.trim() || null

  return (await databases.updateDocument(DATABASE_ID, LOSSES, lossId, data)) as unknown as DriverLossType
}

/**
 * Write a loss off, or put it back. Only for manual rows and waivers: a shortage
 * row is cleared by bringing the manifest's shortage down, so the two never disagree.
 */
export const setLossStatus = async (lossId: string, status: DriverLossStatus, by?: string): Promise<DriverLossType> => {
  const loss = (await databases.getDocument(DATABASE_ID, LOSSES, lossId)) as unknown as DriverLossType

  if (loss.source === 'shortage' && (status === 'found' || loss.status === 'found')) {
    throw new Error("Change the manifest's shortage to mark a missing package found")
  }

  return (await databases.updateDocument(DATABASE_ID, LOSSES, lossId, {
    status,
    resolvedAt: status === 'owed' ? null : new Date().toISOString(),
    resolvedBy: status === 'owed' ? null : by || null
  })) as unknown as DriverLossType
}

/** Remove a manual loss entered by mistake. Shortage rows follow the manifest instead. */
export const deleteManualLoss = async (lossId: string) => {
  const loss = (await databases.getDocument(DATABASE_ID, LOSSES, lossId)) as unknown as DriverLossType

  if (loss.source !== 'manual') throw new Error("Change the manifest's shortage to remove a missing package")

  await databases.deleteDocument(DATABASE_ID, LOSSES, lossId)
}

// ============================================
// Payments
// ============================================

export const PAYMENT_METHODS: { value: DriverLossPaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'momo', label: 'Mobile money' },
  { value: 'deduction', label: 'Deduction' },
  { value: 'other', label: 'Other' }
]

export const paymentMethodLabel = (method: string) =>
  PAYMENT_METHODS.find(option => option.value === method)?.label || method

export const recordLossPayment = async (params: {
  driverId: string
  amount: number
  paidAt: string
  method: DriverLossPaymentMethod
  reference?: string
  notes?: string
  by?: string
}): Promise<DriverLossPaymentType> => {
  const amount = roundMoney(params.amount)

  if (!(amount > 0)) throw new Error('Enter an amount above zero')

  return (await databases.createDocument(DATABASE_ID, PAYMENTS, ID.unique(), {
    driverId: params.driverId,
    amount,
    paidAt: params.paidAt,
    method: params.method,
    reference: params.reference?.trim() || null,
    notes: params.notes?.trim() || null,
    recordedBy: params.by || null
  })) as unknown as DriverLossPaymentType
}

export const deleteLossPayment = (paymentId: string) => databases.deleteDocument(DATABASE_ID, PAYMENTS, paymentId)
