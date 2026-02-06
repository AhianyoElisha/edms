// Appwrite Imports
import { databases, storage, appwriteConfig, tablesDB } from '@/libs/appwrite.config'
import { ID, Query } from 'appwrite'

// Type Imports
import type { 
  ReturnWaybillType, 
  ReturnWaybillInput, 
  ReturnWaybillFilters,
  ReturnWaybillStatusType,
  PackageBreakdown
} from '@/types/apps/deliveryTypes'

/**
 * Generate a unique waybill number
 */
function generateWaybillNumber(): string {
  const year = new Date().getFullYear()
  const randomPart = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
  return `RWB-${year}-${randomPart}`
}

/**
 * Get all return waybills with optional filtering
 */
export async function getAllReturnWaybills(filters?: ReturnWaybillFilters): Promise<ReturnWaybillType[]> {
  try {
    const queries: string[] = []

    if (filters) {
      if (filters.tripId) {
        queries.push(Query.equal('trip', filters.tripId))
      }
      if (filters.dropoffLocationId) {
        queries.push(Query.equal('dropofflocation', filters.dropoffLocationId))
      }
      if (filters.pickupLocationId) {
        queries.push(Query.equal('pickuplocation', filters.pickupLocationId))
      }
      if (filters.status) {
        queries.push(Query.equal('status', filters.status))
      }
      if (filters.returnReason) {
        queries.push(Query.equal('returnReason', filters.returnReason))
      }
      if (filters.dateRange) {
        if (filters.dateRange.start) {
          queries.push(Query.greaterThanEqual('returnDate', filters.dateRange.start))
        }
        if (filters.dateRange.end) {
          queries.push(Query.lessThanEqual('returnDate', filters.dateRange.end))
        }
      }
      if (filters.search) {
        queries.push(Query.search('waybillNumber', filters.search))
      }
    }

    queries.push(Query.orderDesc('$createdAt'))
    queries.push(Query.limit(500))

    // Include relationships
    queries.push(Query.select(['*', 'trip.*', 'dropofflocation.*', 'pickuplocation.*']))

    const response = await tablesDB.listRows(
      appwriteConfig.database,
      appwriteConfig.returnwaybills,
      queries
    )

    // Parse packageDetails if stored as JSON string
    const waybills = response.rows.map((doc: any) => ({
      ...doc,
      packageDetails: doc.packageDetails 
        ? (typeof doc.packageDetails === 'string' ? JSON.parse(doc.packageDetails) : doc.packageDetails)
        : null
    }))

    return waybills as ReturnWaybillType[]
  } catch (error) {
    console.error('Error fetching return waybills:', error)
    throw new Error('Failed to fetch return waybills')
  }
}

/**
 * Get a specific return waybill by ID
 */
export async function getReturnWaybillById(waybillId: string): Promise<ReturnWaybillType> {
  try {
    // Use basic getDocument - relationships will be IDs that we can resolve client-side if needed
    const waybill = await tablesDB.getRow(
      appwriteConfig.database,
      appwriteConfig.returnwaybills,
      waybillId,
      [Query.select(['*', 'trip.*', 'dropofflocation.*', 'pickuplocation.*'])]
    )

    // Parse packageDetails if stored as JSON string
    const parsedWaybill = {
      ...waybill,
      packageDetails: waybill.packageDetails 
        ? (typeof waybill.packageDetails === 'string' ? JSON.parse(waybill.packageDetails) : waybill.packageDetails)
        : null
    }

    return parsedWaybill as unknown as ReturnWaybillType
  } catch (error) {
    console.error('Error fetching return waybill:', error)
    throw new Error('Failed to fetch return waybill')
  }
}

/**
 * Get all return waybills for a specific trip
 */
export async function getReturnWaybillsByTrip(tripId: string): Promise<ReturnWaybillType[]> {
  try {
    const queries = [
      Query.equal('trip', tripId),
      Query.orderDesc('$createdAt'),
      Query.select(['*', 'trip.*', 'dropofflocation.*', 'pickuplocation.*'])
    ]

    const response = await tablesDB.listRows(
      appwriteConfig.database,
      appwriteConfig.returnwaybills,
      queries
    )

    const waybills = response.rows.map((doc: any) => ({
      ...doc,
      packageDetails: doc.packageDetails 
        ? (typeof doc.packageDetails === 'string' ? JSON.parse(doc.packageDetails) : doc.packageDetails)
        : null
    }))

    return waybills as unknown as ReturnWaybillType[]
  } catch (error) {
    console.error('Error fetching return waybills by trip:', error)
    throw new Error('Failed to fetch return waybills by trip')
  }
}

/**
 * Get return waybills originating from a specific dropoff location
 */
export async function getReturnWaybillsByDropoff(dropoffLocationId: string): Promise<ReturnWaybillType[]> {
  try {
    const queries = [
      Query.equal('dropofflocation', dropoffLocationId),
      Query.orderDesc('$createdAt'),
      Query.select(['*', 'trip.*', 'dropofflocation.*', 'pickuplocation.*'])
    ]

    const response = await tablesDB.listRows(
      appwriteConfig.database,
      appwriteConfig.returnwaybills,
      queries
    )

    const waybills = response.rows.map((doc: any) => ({
      ...doc,
      packageDetails: doc.packageDetails 
        ? (typeof doc.packageDetails === 'string' ? JSON.parse(doc.packageDetails) : doc.packageDetails)
        : null
    }))

    return waybills as unknown as ReturnWaybillType[]
  } catch (error) {
    console.error('Error fetching return waybills by dropoff:', error)
    throw new Error('Failed to fetch return waybills by dropoff')
  }
}

/**
 * Get pending return waybills (not yet delivered)
 */
export async function getPendingReturnWaybills(): Promise<ReturnWaybillType[]> {
  try {
    const queries = [
      Query.notEqual('status', 'delivered'),
      Query.notEqual('status', 'processed'),
      Query.orderAsc('returnDate'), // Oldest first
      Query.select(['*', 'trip.*', 'dropofflocation.*', 'pickuplocation.*'])
    ]

    const response = await tablesDB.listRows(
      appwriteConfig.database,
      appwriteConfig.returnwaybills,
      queries
    )

    const waybills = response.rows.map((doc: any) => ({
      ...doc,
      packageDetails: doc.packageDetails 
        ? (typeof doc.packageDetails === 'string' ? JSON.parse(doc.packageDetails) : doc.packageDetails)
        : null
    }))

    return waybills as unknown as ReturnWaybillType[]
  } catch (error) {
    console.error('Error fetching pending return waybills:', error)
    throw new Error('Failed to fetch pending return waybills')
  }
}

/**
 * Check if all return waybills for a trip have been delivered
 * This is crucial for determining trip completion
 */
export async function areAllTripReturnsDelivered(tripId: string): Promise<{
  allDelivered: boolean
  total: number
  delivered: number
  pending: ReturnWaybillType[]
}> {
  try {
    const waybills = await getReturnWaybillsByTrip(tripId)

    const delivered = waybills.filter(w => w.status === 'delivered' || w.status === 'processed')
    const pending = waybills.filter(w => w.status !== 'delivered' && w.status !== 'processed')

    return {
      allDelivered: pending.length === 0,
      total: waybills.length,
      delivered: delivered.length,
      pending
    }
  } catch (error) {
    console.error('Error checking trip return delivery status:', error)
    throw new Error('Failed to check trip return delivery status')
  }
}

/**
 * Create a new return waybill
 */
export async function createReturnWaybill(
  waybillData: ReturnWaybillInput
): Promise<ReturnWaybillType> {
  try {
    const waybillNumber = generateWaybillNumber()

    // Convert packageDetails to JSON string if it's an object
    const packageDetailsString = waybillData.packageDetails 
      ? JSON.stringify(waybillData.packageDetails) 
      : null

    const waybill = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.returnwaybills,
      ID.unique(),
      {
        waybillNumber,
        trip: waybillData.tripId,
        dropofflocation: waybillData.dropoffLocationId,
        pickuplocation: waybillData.pickupLocationId,
        returnDate: waybillData.returnDate,
        returnReason: waybillData.returnReason,
        reasonNotes: waybillData.reasonNotes || null,
        packageCount: waybillData.packageCount,
        packageDetails: packageDetailsString,
        status: 'pending',
        notes: waybillData.notes || null
      }
    )

    return waybill as unknown as ReturnWaybillType
  } catch (error) {
    console.error('Error creating return waybill:', error)
    throw new Error('Failed to create return waybill')
  }
}

/**
 * Create multiple return waybills at once (batch create)
 * Useful when a trip has multiple returns from different locations
 */
export async function createReturnWaybillsBatch(
  waybillsData: ReturnWaybillInput[]
): Promise<ReturnWaybillType[]> {
  try {
    const createdWaybills: ReturnWaybillType[] = []

    for (const waybillData of waybillsData) {
      const waybill = await createReturnWaybill(waybillData)
      createdWaybills.push(waybill)
    }

    return createdWaybills
  } catch (error) {
    console.error('Error creating return waybills batch:', error)
    throw new Error('Failed to create return waybills batch')
  }
}

/**
 * Update a return waybill
 */
export async function updateReturnWaybill(
  waybillId: string,
  updateData: Partial<ReturnWaybillInput & { status?: ReturnWaybillStatusType }>
): Promise<ReturnWaybillType> {
  try {
    const dataToUpdate: any = {}

    if (updateData.tripId) dataToUpdate.trip = updateData.tripId
    if (updateData.manifestId !== undefined) dataToUpdate.manifest = updateData.manifestId
    if (updateData.dropoffLocationId) dataToUpdate.dropofflocation = updateData.dropoffLocationId
    if (updateData.pickupLocationId) dataToUpdate.pickuplocation = updateData.pickupLocationId
    if (updateData.returnDate) dataToUpdate.returnDate = updateData.returnDate
    if (updateData.returnReason) dataToUpdate.returnReason = updateData.returnReason
    if (updateData.reasonNotes !== undefined) dataToUpdate.reasonNotes = updateData.reasonNotes
    if (updateData.packageCount !== undefined) dataToUpdate.packageCount = updateData.packageCount
    if (updateData.packageDetails !== undefined) {
      dataToUpdate.packageDetails = JSON.stringify(updateData.packageDetails)
    }
    if (updateData.status) dataToUpdate.status = updateData.status
    if (updateData.notes !== undefined) dataToUpdate.notes = updateData.notes
    
    // Handle image fields
    if ((updateData as any).waybillImage !== undefined) dataToUpdate.waybillImage = (updateData as any).waybillImage
    if ((updateData as any).proofOfDelivery !== undefined) dataToUpdate.proofOfDelivery = (updateData as any).proofOfDelivery
    if ((updateData as any).receiverSignature !== undefined) dataToUpdate.receiverSignature = (updateData as any).receiverSignature

    const waybill = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.returnwaybills,
      waybillId,
      dataToUpdate
    )

    return waybill as unknown as ReturnWaybillType
  } catch (error) {
    console.error('Error updating return waybill:', error)
    throw new Error('Failed to update return waybill')
  }
}

/**
 * Mark a return waybill as in transit
 */
export async function markReturnWaybillInTransit(waybillId: string): Promise<ReturnWaybillType> {
  return updateReturnWaybill(waybillId, { status: 'in_transit' })
}

/**
 * Mark a return waybill as delivered
 * @param waybillId - The waybill ID
 * @param receivedBy - Name of person who received the return
 * @param signatureFileId - File ID of receiver's signature (optional)
 * @param podFileId - File ID of proof of delivery (optional)
 */
export async function markReturnWaybillDelivered(
  waybillId: string,
  receivedBy: string,
  signatureFileId?: string,
  podFileId?: string
): Promise<ReturnWaybillType> {
  try {
    // Get waybill first to get trip ID
    const existingWaybill = await getReturnWaybillById(waybillId)
    
    const waybill = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.returnwaybills,
      waybillId,
      {
        status: 'delivered',
        deliveredAt: new Date().toISOString(),
        receivedBy,
        receiverSignature: signatureFileId || null,
        proofOfDelivery: podFileId || null
      }
    )

    // Check and update trip status
    if (existingWaybill.trip) {
      const tripId = typeof existingWaybill.trip === 'string' ? existingWaybill.trip : existingWaybill.trip.$id
      try {
        const { checkAndUpdateTripStatus } = await import('./trip.actions')
        const result = await checkAndUpdateTripStatus(tripId)
        if (result.updated) {
          console.log('Trip status updated to:', result.newStatus, 'after return waybill delivery')
        }
      } catch (error) {
        console.warn('Could not update trip status after return delivery:', error)
      }
    }

    return waybill as unknown as ReturnWaybillType
  } catch (error) {
    console.error('Error marking return waybill as delivered:', error)
    throw new Error('Failed to mark return waybill as delivered')
  }
}

/**
 * Mark a return waybill as processed (fully completed)
 */
export async function markReturnWaybillProcessed(waybillId: string): Promise<ReturnWaybillType> {
  return updateReturnWaybill(waybillId, { status: 'processed' })
}

/**
 * Upload waybill document image
 */
export async function uploadWaybillImage(
  waybillId: string,
  file: File
): Promise<string> {
  try {
    // Upload file to storage
    const uploadedFile = await storage.createFile(
      appwriteConfig.bucket,
      ID.unique(),
      file
    )

    // Update waybill with file reference
    await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.returnwaybills,
      waybillId,
      { waybillImage: uploadedFile.$id }
    )

    return uploadedFile.$id
  } catch (error) {
    console.error('Error uploading waybill image:', error)
    throw new Error('Failed to upload waybill image')
  }
}

/**
 * Upload proof of delivery image
 */
export async function uploadProofOfDelivery(
  waybillId: string,
  file: File
): Promise<string> {
  try {
    // Upload file to storage
    const uploadedFile = await storage.createFile(
      appwriteConfig.bucket,
      ID.unique(),
      file
    )

    // Update waybill with file reference
    await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.returnwaybills,
      waybillId,
      { proofOfDelivery: uploadedFile.$id }
    )

    return uploadedFile.$id
  } catch (error) {
    console.error('Error uploading proof of delivery:', error)
    throw new Error('Failed to upload proof of delivery')
  }
}

/**
 * Upload receiver signature image
 */
export async function uploadReceiverSignature(
  waybillId: string,
  file: File
): Promise<string> {
  try {
    // Upload file to storage
    const uploadedFile = await storage.createFile(
      appwriteConfig.bucket,
      ID.unique(),
      file
    )

    // Update waybill with file reference
    await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.returnwaybills,
      waybillId,
      { receiverSignature: uploadedFile.$id }
    )

    return uploadedFile.$id
  } catch (error) {
    console.error('Error uploading receiver signature:', error)
    throw new Error('Failed to upload receiver signature')
  }
}

/**
 * Delete a return waybill
 */
export async function deleteReturnWaybill(waybillId: string): Promise<void> {
  try {
    // Get the waybill first to check for associated files
    const waybill = await getReturnWaybillById(waybillId)

    // Delete associated files if they exist
    const fileIds = [waybill.waybillImage, waybill.proofOfDelivery, waybill.receiverSignature]
      .filter(Boolean) as string[]

    for (const fileId of fileIds) {
      try {
        await storage.deleteFile(appwriteConfig.bucket, fileId)
      } catch (fileError) {
        console.warn(`Failed to delete file ${fileId}:`, fileError)
      }
    }

    // Delete the waybill document
    await databases.deleteDocument(
      appwriteConfig.database,
      appwriteConfig.returnwaybills,
      waybillId
    )
  } catch (error) {
    console.error('Error deleting return waybill:', error)
    throw new Error('Failed to delete return waybill')
  }
}

/**
 * Get return waybill statistics for a trip
 */
export async function getReturnWaybillStats(tripId: string): Promise<{
  total: number
  pending: number
  inTransit: number
  delivered: number
  processed: number
  totalPackages: number
  returnedPackages: number
}> {
  try {
    const waybills = await getReturnWaybillsByTrip(tripId)

    const stats = {
      total: waybills.length,
      pending: waybills.filter(w => w.status === 'pending').length,
      inTransit: waybills.filter(w => w.status === 'in_transit').length,
      delivered: waybills.filter(w => w.status === 'delivered').length,
      processed: waybills.filter(w => w.status === 'processed').length,
      totalPackages: waybills.reduce((sum, w) => sum + (w.packageCount || 0), 0),
      returnedPackages: waybills
        .filter(w => w.status === 'delivered' || w.status === 'processed')
        .reduce((sum, w) => sum + (w.packageCount || 0), 0)
    }

    return stats
  } catch (error) {
    console.error('Error getting return waybill stats:', error)
    throw new Error('Failed to get return waybill stats')
  }
}

/**
 * Get return reason breakdown for analytics
 */
export async function getReturnReasonBreakdown(filters?: {
  tripId?: string
  dateRange?: { start: string; end: string }
}): Promise<Record<string, number>> {
  try {
    const queries: string[] = []

    if (filters?.tripId) {
      queries.push(Query.equal('trip', filters.tripId))
    }
    if (filters?.dateRange) {
      if (filters.dateRange.start) {
        queries.push(Query.greaterThanEqual('returnDate', filters.dateRange.start))
      }
      if (filters.dateRange.end) {
        queries.push(Query.lessThanEqual('returnDate', filters.dateRange.end))
      }
    }

    queries.push(Query.limit(1000))

    const response = await tablesDB.listRows(
      appwriteConfig.database,
      appwriteConfig.returnwaybills,
      queries
    )

    const breakdown: Record<string, number> = {
      rejected: 0,
      damaged: 0,
      wrong_delivery: 0,
      customer_return: 0,
      other: 0
    }

    response.rows.forEach((doc: any) => {
      const reason = doc.returnReason || 'other'
      breakdown[reason] = (breakdown[reason] || 0) + 1
    })

    return breakdown
  } catch (error) {
    console.error('Error getting return reason breakdown:', error)
    throw new Error('Failed to get return reason breakdown')
  }
}
