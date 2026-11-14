// Appwrite Imports
import { ID, Query } from 'appwrite'
import { account, appwriteConfig, databases } from '@/libs/appwrite.config'

// Util Imports
import type { VehicleAssignment } from '@/utils/vehicleCustody'

/**
 * The driver history of vehicles: one row per period a driver had a vehicle.
 * See `src/utils/vehicleCustody.ts` for how the periods are read.
 */

// Works with the browser client and the server (API key) client alike
type Db = {
  listDocuments: (...args: any[]) => Promise<any>
  getDocument: (...args: any[]) => Promise<any>
  createDocument: (...args: any[]) => Promise<any>
  updateDocument: (...args: any[]) => Promise<any>
}

type ChangeOptions = {
  /** Client to write with; the signed-in user's by default */
  db?: Db

  /** Who made the change, when it is not the signed-in user */
  changedBy?: string
}

const signedInName = async () => {
  try {
    const current = await account.get()

    return current.name || current.email || ''
  } catch {
    return ''
  }
}

/**
 * Record that a vehicle now has `driverId` (or nobody, with null): closes the period
 * of whoever had it and opens one for the new driver. Safe to call when nothing
 * changed - an open period for the same driver is left as it is.
 *
 * Never throws: the assignment itself has already been saved by the time this runs,
 * and a missed history row must not make that look as though it failed.
 */
export async function logVehicleDriverChange(vehicleId: string, driverId: string | null, options: ChangeOptions = {}) {
  const db = options.db || (databases as unknown as Db)

  try {
    const now = new Date().toISOString()

    const open = await db.listDocuments(appwriteConfig.database, appwriteConfig.vehicleassignments, [
      Query.equal('vehicleId', vehicleId),
      Query.isNull('endedAt'),
      Query.limit(25)
    ])

    let alreadyOpen = false

    for (const period of open.documents) {
      if (driverId && period.driverId === driverId && !alreadyOpen) {
        alreadyOpen = true
        continue
      }

      await db.updateDocument(appwriteConfig.database, appwriteConfig.vehicleassignments, period.$id, { endedAt: now })
    }

    if (!driverId || alreadyOpen) return

    const [vehicle, driver, changedBy] = await Promise.all([
      db.getDocument(appwriteConfig.database, appwriteConfig.vehicles, vehicleId, [Query.select(['$id', 'vehicleNumber'])]),
      db.getDocument(appwriteConfig.database, appwriteConfig.users, driverId, [Query.select(['$id', 'name'])]),
      options.changedBy ?? signedInName()
    ])

    await db.createDocument(appwriteConfig.database, appwriteConfig.vehicleassignments, ID.unique(), {
      vehicleId,
      vehicleNumber: vehicle?.vehicleNumber || null,
      driverId,
      driverName: driver?.name || null,
      startedAt: now,
      endedAt: null,
      source: 'recorded',
      changedBy: changedBy || null
    })
  } catch (error) {
    console.error('Could not record the driver change in the vehicle history:', error)
  }
}

/** Every recorded period, or just one vehicle's. Empty (not an error) if none can be read. */
export async function getVehicleAssignments(vehicleId?: string): Promise<VehicleAssignment[]> {
  try {
    const rows: VehicleAssignment[] = []
    let cursor: string | undefined

    for (let page = 0; page < 40; page++) {
      const response = await databases.listDocuments(appwriteConfig.database, appwriteConfig.vehicleassignments, [
        ...(vehicleId ? [Query.equal('vehicleId', vehicleId)] : []),
        Query.orderDesc('startedAt'),
        Query.limit(500),
        ...(cursor ? [Query.cursorAfter(cursor)] : [])
      ])

      rows.push(...(response.documents as unknown as VehicleAssignment[]))
      if (response.documents.length < 500) break
      cursor = response.documents[response.documents.length - 1].$id
    }

    return rows
  } catch (error) {
    console.error('Error fetching vehicle driver history:', error)

    return []
  }
}
