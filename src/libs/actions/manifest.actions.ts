import { ID, Query } from 'appwrite'
import { databases, appwriteConfig, tablesDB } from '@/libs/appwrite.config'
import type { ManifestType, ManifestFilters, ManifestStats } from '@/types/apps/deliveryTypes'

// Database and Collection IDs
const DATABASE_ID = appwriteConfig.database
const MANIFESTS_COLLECTION_ID = appwriteConfig.manifests

/**
 * Get all manifests with optional filtering
 */
export const getAllManifests = async (filters?: ManifestFilters): Promise<ManifestType[]> => {
  try {
    
    const queries: string[] = []
    
    // Add filters
    if (filters?.status) {
      queries.push(Query.equal('status', filters.status))
    }
    
    
    if (filters?.dateRange) {
      queries.push(Query.greaterThanEqual('manifestDate', filters.dateRange.start))
      queries.push(Query.lessThanEqual('manifestDate', filters.dateRange.end))
    }
    
    // Add search functionality
    if (filters?.search) {
      queries.push(Query.search('manifestNumber', filters.search))
    }
    
    // Add ordering
    queries.push(Query.orderDesc('$createdAt'))
    
    const response = await databases.listDocuments(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      [...queries, Query.select(['*', 'trip.*']), Query.limit(1000)]
    )
    
    return response.documents as unknown as ManifestType[]
  } catch (error) {
    console.error('Error fetching manifests:', error)
    throw new Error('Failed to fetch manifests')
  }
}

/**
 * Get delivered manifests with optional date range filtering
 * @param startDate - Optional start date in ISO format
 * @param endDate - Optional end date in ISO format
 * @returns Array of delivered manifests
 */
export const getDeliveredManifests = async (
  startDate?: string,
  endDate?: string
): Promise<ManifestType[]> => {
  try {
    const queries: string[] = [Query.equal('status', 'delivered')]
    
    if (startDate) {
      queries.push(Query.greaterThanEqual('manifestDate', startDate))
    }
    
    if (endDate) {
      queries.push(Query.lessThanEqual('manifestDate', endDate))
    }
    
    queries.push(Query.orderDesc('deliveryTime'))
    queries.push(Query.limit(1000))
    
    const response = await databases.listDocuments(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      queries
    )
    
    return response.documents as unknown as ManifestType[]
  } catch (error) {
    console.error('Error fetching delivered manifests:', error)
    throw new Error('Failed to fetch delivered manifests')
  }
}

/**
 * Get a specific manifest by ID
 */
export const getManifestById = async (manifestId: string): Promise<ManifestType> => {
  try {
    const manifest = await databases.getDocument(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      manifestId
    )
    
    return manifest as unknown as ManifestType
  } catch (error) {
    console.error('Error fetching manifest:', error)
    throw new Error('Failed to fetch manifest')
  }
}

/**
 * Get manifest by ID with all related data (packages, locations, trip)
 * NOTE: Packages are fetched separately using one-way relationship (packages.manifest → manifests)
 */
export const getManifestByIdWithRelations = async (manifestId: string) => {
  try {
    // Fetch manifest with trip and dropofflocation relationships
    const manifest = await tablesDB.getRow(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      manifestId,
      [
        Query.select([
          '*',
          'trip.*',
          'trip.vehicle.*',
          'trip.driver.*',
          'trip.route.*',
          'dropofflocation.*',
        ])
      ]
    )


    // Get pickup location from trip.route (trip starts from pickup location)
    let pickupLocation = null
    let dropoffLocation = manifest.dropofflocation || null // already fetched via Query.select
    
    // Get pickup location from trip's route (startLocation is the pickup point)
    if (manifest.trip?.route?.startLocation) {
      try {
        pickupLocation = await databases.getDocument(
          DATABASE_ID,
          appwriteConfig.pickuplocations,
          manifest.trip.route.startLocation
        )
      } catch (error) {
        console.warn('Could not fetch pickup location from trip route')
      }
    }

    // Combine all data
    const manifestWithPackages = {
      ...manifest,
      pickupLocation,
      dropoffLocation,
      // Also add for backward compatibility
      pickuplocation: pickupLocation,
      dropofflocation: dropoffLocation
    }

    return manifestWithPackages
  } catch (error) {
    console.error('Error fetching manifest with relations:', error)
    throw new Error('Failed to fetch manifest details')
  }
}

/**
 * Create a new manifest (using one-way relationship)
 * Note: Packages should be assigned separately using assignPackagesToManifest
 */
export const createManifest = async (
  manifestData: Omit<ManifestType, '$id' | '$createdAt' | '$updatedAt' | 'packages'> & { packageIds?: string[] }
): Promise<ManifestType> => {
  try {
    // Generate unique manifest number
    const manifestNumber = `MF-${Date.now()}`
    
    // Extract packageIds if provided
    const { packageIds, ...manifestFields } = manifestData as any
    
    // Create manifest without packages array (using one-way relationship)
    const manifest = await databases.createDocument(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      ID.unique(),
      {
        ...manifestFields,
        manifestNumber,
        status: 'pending' as const
      }
    )
    
    // // If packageIds provided, assign them to this manifest
    // if (packageIds && packageIds.length > 0) {
    //   await assignPackagesToManifest(manifest.$id, packageIds)
    // }
    
    return manifest as unknown as ManifestType
  } catch (error) {
    console.error('Error creating manifest:', error)
    throw new Error('Failed to create manifest')
  }
}

/**
 * Update a manifest
 */
export const updateManifest = async (
  manifestId: string,
  updateData: Partial<Omit<ManifestType, '$id' | '$createdAt' | '$updatedAt'>>
): Promise<ManifestType> => {
  try {
    const manifest = await databases.updateDocument(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      manifestId,
      updateData
    )
    
    return manifest as unknown as ManifestType
  } catch (error) {
    console.error('Error updating manifest:', error)
    throw new Error('Failed to update manifest')
  }
}

/**
 * Delete a manifest
 */
export const deleteManifest = async (manifestId: string): Promise<void> => {
  try {
    await databases.deleteDocument(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      manifestId
    )
  } catch (error) {
    console.error('Error deleting manifest:', error)
    throw new Error('Failed to delete manifest')
  }
}

/**
 * Update manifest status
 * 
 * Schema fields being updated (ALL SCALAR, NO RELATIONSHIPS):
 * - status: string (required, max 45 chars)
 * - departureTime: datetime - optional
 * - arrivalTime: datetime - optional
 * - deliveryTime: datetime - optional
 * 
 * Relationship fields NOT touched (preserved automatically):
 * - vehicle, driver, pickuplocation, dropofflocation, packages, trip
 */
export const updateManifestStatus = async (
  manifestId: string,
  status: ManifestType['status'],
  additionalData?: {
    departureTime?: string
    arrivalTime?: string
    deliveryTime?: string
  }
): Promise<ManifestType> => {
  try {
    // Build update object with ONLY scalar fields
    const updateData: Record<string, string> = { status }
    
    // Add timestamp based on status (only scalar datetime fields)
    switch (status) {
      case 'loaded':
        updateData.departureTime = additionalData?.departureTime || new Date().toISOString()
        break
      case 'in_transit':
        updateData.departureTime = additionalData?.departureTime || new Date().toISOString()
        break
      case 'delivered':
        updateData.arrivalTime = additionalData?.arrivalTime || new Date().toISOString()
        break
      case 'completed':
        updateData.deliveryTime = additionalData?.deliveryTime || new Date().toISOString()
        break
    }
    
    // Get the manifest first to retrieve the trip ID
    const existingManifest = await databases.getDocument(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      manifestId
    ) as any
    
    // Perform the update - Appwrite will preserve all other fields including relationships
    const manifest = await databases.updateDocument(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      manifestId,
      updateData
    )
    
    // Update trip status based on manifest progress
    if (existingManifest.trip) {
      const tripId = typeof existingManifest.trip === 'string' ? existingManifest.trip : existingManifest.trip.$id
      try {
        const { checkAndUpdateTripStatus } = await import('./trip.actions')
        await checkAndUpdateTripStatus(tripId)
      } catch (error) {
        console.warn('Could not update trip status:', error)
        // Don't fail the manifest update if trip update fails
      }
    }
    
    return manifest as unknown as ManifestType
  } catch (error) {
    console.error('Error updating manifest status:', error)
    throw new Error('Failed to update manifest status')
  }
}

/**
 * Get manifest statistics
 */
export const getManifestStatistics = async (): Promise<ManifestStats> => {
  try {
    // Using direct databases import from appwrite config
    
    // Get total count
    const totalResponse = await databases.listDocuments(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      [Query.limit(1000)]
    )
    
    // Get counts by status
    const statusCounts = await Promise.all([
      databases.listDocuments(DATABASE_ID, MANIFESTS_COLLECTION_ID, [Query.equal('status', 'pending'), Query.limit(1)]),
      databases.listDocuments(DATABASE_ID, MANIFESTS_COLLECTION_ID, [Query.equal('status', 'loaded'), Query.limit(1)]),
      databases.listDocuments(DATABASE_ID, MANIFESTS_COLLECTION_ID, [Query.equal('status', 'in_transit'), Query.limit(1)]),
      databases.listDocuments(DATABASE_ID, MANIFESTS_COLLECTION_ID, [Query.equal('status', 'delivered'), Query.limit(1)]),
      databases.listDocuments(DATABASE_ID, MANIFESTS_COLLECTION_ID, [Query.equal('status', 'completed'), Query.limit(1)])
    ])
    
    return {
      total: totalResponse.total,
      pending: statusCounts[0].total,
      loaded: statusCounts[1].total,
      in_transit: statusCounts[2].total,
      delivered: statusCounts[3].total,
      completed: statusCounts[4].total
    }
  } catch (error) {
    console.error('Error fetching manifest statistics:', error)
    throw new Error('Failed to fetch manifest statistics')
  }
}

/**
 * Get manifests by driver
 */
export const getManifestsByDriver = async (driverId: string): Promise<ManifestType[]> => {
  try {
    // Using direct databases import from appwrite config
    
    const response = await databases.listDocuments(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      [
        Query.equal('driver', driverId),
        Query.orderDesc('$createdAt')
      ]
    )
    
    return response.documents as unknown as ManifestType[]
  } catch (error) {
    console.error('Error fetching driver manifests:', error)
    throw new Error('Failed to fetch driver manifests')
  }
}

/**
 * Get manifests by vehicle
 */
export const getManifestsByVehicle = async (vehicleId: string): Promise<ManifestType[]> => {
  try {
    // Using direct databases import from appwrite config
    
    const response = await databases.listDocuments(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      [
        Query.equal('vehicle', vehicleId),
        Query.orderDesc('$createdAt')
      ]
    )
    
    return response.documents as unknown as ManifestType[]
  } catch (error) {
    console.error('Error fetching vehicle manifests:', error)
    throw new Error('Failed to fetch vehicle manifests')
  }
}

/**
 * Assign packages to manifest using one-way relationship
 * Updates each package's manifest field to point to this manifest
 */
// export const assignPackagesToManifest = async (
//   manifestId: string,
//   packageIds: string[]
// ): Promise<ManifestType> => {
//   try {
//     const PACKAGES_COLLECTION_ID = appwriteConfig.packages
    
//     // Update each package to reference this manifest (one-way relationship)
//     await Promise.all(
//       packageIds.map(packageId =>
//         databases.updateDocument(
//           DATABASE_ID,
//           PACKAGES_COLLECTION_ID,
//           packageId,
//           { manifest: manifestId }
//         )
//       )
//     )
    
//     // Update manifest's totalPackages count
//     // Count packages that reference this manifest
//     const packagesResponse = await databases.listDocuments(
//       DATABASE_ID,
//       PACKAGES_COLLECTION_ID,
//       [Query.equal('manifest', manifestId)]
//     )
    
//     const manifest = await databases.updateDocument(
//       DATABASE_ID,
//       MANIFESTS_COLLECTION_ID,
//       manifestId,
//       { totalPackages: packagesResponse.total }
//     )
    
//     return manifest as unknown as ManifestType
//   } catch (error) {
//     console.error('Error assigning packages to manifest:', error)
//     throw new Error('Failed to assign packages to manifest')
//   }
// }

/**
 * Remove packages from manifest using one-way relationship
 * Sets each package's manifest field to null
 */
// export const removePackagesFromManifest = async (
//   manifestId: string,
//   packageIds: string[]
// ): Promise<ManifestType> => {
//   try {
//     const PACKAGES_COLLECTION_ID = appwriteConfig.packages
    
//     // Update each package to remove the manifest reference (set to null)
//     await Promise.all(
//       packageIds.map(packageId =>
//         databases.updateDocument(
//           DATABASE_ID,
//           PACKAGES_COLLECTION_ID,
//           packageId,
//           { manifest: null }
//         )
//       )
//     )
    
//     // Update manifest's totalPackages count
//     const packagesResponse = await databases.listDocuments(
//       DATABASE_ID,
//       PACKAGES_COLLECTION_ID,
//       [Query.equal('manifest', manifestId)]
//     )
    
//     const manifest = await databases.updateDocument(
//       DATABASE_ID,
//       MANIFESTS_COLLECTION_ID,
//       manifestId,
//       { totalPackages: packagesResponse.total }
//     )
    
//     return manifest as unknown as ManifestType
//   } catch (error) {
//     console.error('Error removing packages from manifest:', error)
//     throw new Error('Failed to remove packages from manifest')
//   }
// }

/**
 * Update manifest with proof of delivery image
 * 
 * Schema fields being updated (ALL SCALAR, NO RELATIONSHIPS):
 * - proofOfDeliveryImage: string (max 1000 chars)
 * - deliveryTime: datetime
 * - deliveryGpsCoordinates: string (max 100 chars) - optional
 * - deliveryGpsVerified: boolean - optional
 * 
 * NOTE: Now that we've removed the two-way packages relationship,
 * we can safely update all fields in one call.
 */
export const updateManifestWithProofImage = async (
  manifestId: string,
  imageUrl: string,
  gpsCoordinates?: string,
  gpsVerified?: boolean
): Promise<ManifestType> => {
  try {
    // Build update object with ONLY scalar fields
    const updateData: Record<string, string | boolean> = {
      proofOfDeliveryImage: imageUrl,
      deliveryTime: new Date().toISOString()
    }
    
    // Add optional GPS fields if provided
    if (gpsCoordinates) {
      updateData.deliveryGpsCoordinates = gpsCoordinates
    }
    
    if (gpsVerified !== undefined) {
      updateData.deliveryGpsVerified = gpsVerified
    }
    
    // Update manifest - now works cleanly without relationship conflicts
    const manifest = await databases.updateDocument(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      manifestId,
      updateData
    )
    
    return manifest as unknown as ManifestType
  } catch (error) {
    console.error('Error updating manifest with proof image:', error)
    throw new Error('Failed to update manifest with proof image')
  }
}

/**
 * Update manifest deliveredCount and trip checkpoint
 * Called when packages are marked as delivered
 */
export const updateManifestDeliveredCount = async (
  manifestId: string,
  deliveredCount: number
): Promise<ManifestType> => {
  try {
    // Update manifest with new deliveredCount field
    const manifest = await databases.updateDocument(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      manifestId,
      {
        deliveredCount: deliveredCount
      }
    ) as any
    
    // Update trip checkpoint with delivered package count
    if (manifest.trip) {
      await updateCheckpointPackageCount(
        typeof manifest.trip === 'string' ? manifest.trip : manifest.trip.$id,
        manifestId,
        deliveredCount
      )
    }
    
    return manifest as unknown as ManifestType
  } catch (error) {
    console.error('Error updating manifest delivered count:', error)
    throw new Error('Failed to update manifest delivered count')
  }
}

/**
 * Update checkpoint with delivered package count (without completing it)
 */
async function updateCheckpointPackageCount(
  tripId: string,
  manifestId: string,
  packagesDelivered: number
): Promise<void> {
  try {
    // Fetch manifest to get manifest number
    const manifest = await databases.getDocument(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      manifestId
    ) as any
    
    // Fetch current trip to get checkpoints
    const trip = await databases.getDocument(
      DATABASE_ID,
      appwriteConfig.trips,
      tripId
    ) as any
    
    if (!trip.checkpoints) return
    
    // Parse checkpoints
    const checkpoints = JSON.parse(trip.checkpoints)
    
    // Find and update the checkpoint for this manifest using manifestNumber
    const checkpointIndex = checkpoints.findIndex((cp: any) => 
      cp.manifestNumber === manifest.manifestNumber || cp.manifestId === manifestId
    )
    
    if (checkpointIndex !== -1) {
      checkpoints[checkpointIndex] = {
        ...checkpoints[checkpointIndex],
        packagesDelivered
      }
      
      // Update trip with new checkpoints
      await databases.updateDocument(
        DATABASE_ID,
        appwriteConfig.trips,
        tripId,
        {
          checkpoints: JSON.stringify(checkpoints)
        }
      )
    }
  } catch (error) {
    console.error('Error updating checkpoint package count:', error)
    // Don't throw - checkpoint update is supplementary
  }
}

/**
 * Mark manifest as delivered/completed with full delivery tracking
 * Updates manifest status, timestamps, and delivered/missing counts
 * Also updates the trip's checkpoint for this manifest
 * 
 * Note: Updated for new schema - no individual packages, just counts on manifest
 */
export const markManifestAsDelivered = async (
  manifestId: string
): Promise<ManifestType> => {
  try {
    const now = new Date().toISOString()
    
    // First, fetch the manifest to get current counts and trip relationship
    const existingManifest = await databases.getDocument(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      manifestId
    ) as any
    
    // Get package counts from manifest (new schema)
    const packageCount = existingManifest.packageCount || 0

    // Drivers are no longer asked to tally packages before submitting. When an
    // admin planned the manifest with a package count and the driver did not
    // report a shortfall, treat the whole manifest as delivered; if the driver
    // did enter a count, that figure stands.
    const reportedCount = existingManifest.deliveredCount || 0
    const deliveredCount = reportedCount > 0 ? reportedCount : packageCount
    const missingCount = Math.max(0, packageCount - deliveredCount)

    // Build update object with all delivery tracking fields
    const updateData: Record<string, string | number> = {
      status: 'delivered',
      deliveryTime: now,
      arrivalTime: now // Mark arrival time as well
    }

    if (deliveredCount !== reportedCount) {
      updateData.deliveredCount = deliveredCount
    }
    
    // Update manifest
    const manifest = await databases.updateDocument(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      manifestId,
      updateData
    ) as any
    
    // Update trip checkpoints - use trip from existingManifest as updateDocument may not return relationships
    const tripId = existingManifest.trip || manifest.trip
    if (tripId) {
      console.log('Updating trip checkpoint for trip:', tripId, 'manifest:', manifestId)
      const tripIdStr = typeof tripId === 'string' ? tripId : tripId.$id
      
      await updateTripCheckpoint(
        tripIdStr,
        manifestId,
        deliveredCount,
        missingCount,
        now
      )
      
      // Update trip status based on manifest progress
      try {
        const { checkAndUpdateTripStatus } = await import('./trip.actions')
        const result = await checkAndUpdateTripStatus(tripIdStr)
        if (result.updated) {
          console.log('Trip status updated to:', result.newStatus)
        }
      } catch (error) {
        console.warn('Could not update trip status:', error)
        // Don't fail the manifest update if trip update fails
      }
    } else {
      console.warn('No trip found for manifest:', manifestId)
    }
    
    return manifest as unknown as ManifestType
  } catch (error) {
    console.error('Error marking manifest as delivered:', error)
    throw new Error('Failed to mark manifest as delivered')
  }
}

/**
 * Update trip checkpoint when manifest is delivered
 */
async function updateTripCheckpoint(
  tripId: string,
  manifestId: string,
  packagesDelivered: number,
  packagesMissing: number,
  completionTime: string
): Promise<void> {
  try {
    console.log('🔄 updateTripCheckpoint called:', { tripId, manifestId, packagesDelivered, packagesMissing })
    
    // Fetch manifest to get manifest number
    const manifest = await databases.getDocument(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      manifestId
    ) as any
    
    console.log('📦 Manifest fetched:', { manifestNumber: manifest.manifestNumber, manifestId: manifest.$id })
    
    // Fetch current trip to get checkpoints
    const trip = await databases.getDocument(
      DATABASE_ID,
      appwriteConfig.trips,
      tripId
    ) as any
    
    console.log('🚚 Trip fetched:', { tripId: trip.$id, hasCheckpoints: !!trip.checkpoints })
    
    if (!trip.checkpoints) {
      console.error('❌ No checkpoints found in trip')
      return
    }
    
    // Parse checkpoints
    const checkpoints = JSON.parse(trip.checkpoints)
    console.log('📋 Parsed checkpoints:', checkpoints.length, 'checkpoints')
    
    // Find and update the checkpoint for this manifest using manifestNumber
    const checkpointIndex = checkpoints.findIndex((cp: any) => 
      cp.manifestNumber === manifest.manifestNumber || cp.manifestId === manifestId
    )
    
    console.log('🔍 Checkpoint search result:', {
      checkpointIndex,
      searchingFor: { manifestNumber: manifest.manifestNumber, manifestId },
      availableCheckpoints: checkpoints.map((cp: any) => ({ manifestNumber: cp.manifestNumber, manifestId: cp.manifestId }))
    })
    
    if (checkpointIndex !== -1) {
      console.log('✏️ Updating checkpoint at index:', checkpointIndex)
      console.log('Old checkpoint:', checkpoints[checkpointIndex])
      
      checkpoints[checkpointIndex] = {
        ...checkpoints[checkpointIndex],
        status: 'completed',
        completionTime,
        arrivalTime: completionTime,
        packagesDelivered,
        packagesMissing
      }
      
      console.log('New checkpoint:', checkpoints[checkpointIndex])
      
      // Update trip with new checkpoints
      const updateResult = await databases.updateDocument(
        DATABASE_ID,
        appwriteConfig.trips,
        tripId,
        {
          checkpoints: JSON.stringify(checkpoints),
          currentCheckpoint: checkpointIndex + 1
        }
      )
      
      console.log('✅ Trip updated successfully:', updateResult.$id)
    } else {
      console.error('❌ Checkpoint not found for manifest:', manifest.manifestNumber)
    }
  } catch (error) {
    console.error('💥 Error updating trip checkpoint:', error)
    throw error // Re-throw to see the error in the UI
  }
}

/**
 * Get manifest package statistics
 * Updated for new schema - counts are stored directly on manifest
 */
export const getManifestPackageStats = async (manifestId: string): Promise<{
  total: number
  delivered: number
  pending: number
  missing: number
}> => {
  try {
    const manifest = await databases.getDocument(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      manifestId
    ) as any
    
    const total = manifest.packageCount || 0
    const delivered = manifest.deliveredCount || 0
    const missing = total - delivered
    
    // Pending only applies if manifest is not yet delivered
    const pending = manifest.status === 'delivered' ? 0 : (total - delivered)
    
    return {
      total,
      delivered,
      pending: manifest.status === 'delivered' ? 0 : pending,
      missing: manifest.status === 'delivered' ? missing : 0
    }
  } catch (error) {
    console.error('Error fetching manifest package stats:', error)
    throw new Error('Failed to fetch manifest package statistics')
  }
}
/* -------------------------------------------------------------------------- */
/*  Field capture (driver) + back-office verification (admin)                  */
/* -------------------------------------------------------------------------- */

/**
 * Generate a placeholder manifest number for a manifest captured in the field.
 * The driver does not read the number off the paper - the admin enters the real
 * one during verification - so we mint a traceable stand-in.
 */
const generateFieldManifestNumber = (): string => {
  const now = new Date()
  const stamp = [
    now.getFullYear().toString().slice(-2),
    (now.getMonth() + 1).toString().padStart(2, '0'),
    now.getDate().toString().padStart(2, '0')
  ].join('')

  return `MF-F${stamp}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`
}

/**
 * A manifest still waiting on the back office is one the driver captured in the
 * field: it was never verified and carries no package figures.
 */
export const isManifestAwaitingVerification = (manifest: any): boolean =>
  manifest?.detailsVerified !== true && (!manifest?.packageSize || !manifest?.packageCount)

/**
 * Log a delivery from the field in a single step.
 *
 * The driver picks the stop and takes one photo of the signed manifest; that
 * photo both creates the manifest and closes it out as delivered. Package size,
 * counts and the real manifest number are deliberately left blank - an admin
 * fills them in later from the review queue, so paperwork never blocks the road.
 */
export const logManifestDelivery = async (params: {
  tripId: string
  dropoffLocationId: string
  dropoffLocationName?: string
  dropoffSequence?: number
  photoUrl: string
  gpsCoordinates?: string
  notes?: string
}): Promise<ManifestType> => {
  const {
    tripId,
    dropoffLocationId,
    dropoffLocationName = '',
    dropoffSequence,
    photoUrl,
    gpsCoordinates,
    notes
  } = params

  try {
    const now = new Date().toISOString()
    const manifestNumber = generateFieldManifestNumber()

    const trip = (await databases.getDocument(DATABASE_ID, appwriteConfig.trips, tripId)) as any

    // Fall back to appending after the existing checkpoints when the caller did
    // not tell us where this stop sits in the route.
    const existingCheckpoints = trip.checkpoints ? JSON.parse(trip.checkpoints) : []
    const sequence = dropoffSequence ?? existingCheckpoints.length + 1

    const manifest = (await databases.createDocument(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      ID.unique(),
      {
        manifestNumber,
        trip: tripId,
        dropofflocation: dropoffLocationId,
        dropoffSequence: sequence,
        manifestDate: trip.tripDate || now,
        // Figures are unknown in the field - the admin supplies them on review.
        packageSize: null,
        packageCount: 0,
        deliveredCount: 0,
        status: 'delivered',
        notes: notes || '',
        arrivalTime: now,
        deliveryTime: now,
        // The same shot serves as the manifest document and the delivery proof.
        manifestImage: photoUrl,
        proofOfDeliveryImage: photoUrl,
        deliveryGpsCoordinates: gpsCoordinates || null,
        deliveryGpsVerified: false,
        detailsVerified: false
      }
    )) as any

    // Record the stop on the trip so checkpoints and the route view stay in sync.
    const checkpointIndex = existingCheckpoints.findIndex(
      (cp: any) => cp.dropoffLocationId === dropoffLocationId && !cp.manifestId
    )

    const checkpoint = {
      dropoffLocationId,
      dropoffLocationName,
      manifestId: manifest.$id,
      manifestNumber,
      packageSize: null,
      sequence,
      status: 'completed',
      arrivalTime: now,
      completionTime: now,
      gpsCoordinates: gpsCoordinates || null,
      gpsVerified: false,
      packagesDelivered: 0,
      packagesMissing: 0
    }

    if (checkpointIndex !== -1) {
      existingCheckpoints[checkpointIndex] = { ...existingCheckpoints[checkpointIndex], ...checkpoint }
    } else {
      existingCheckpoints.push(checkpoint)
    }

    const tripUpdate: Record<string, unknown> = {
      checkpoints: JSON.stringify(existingCheckpoints),
      currentCheckpoint: existingCheckpoints.filter((cp: any) => cp.status === 'completed').length
    }

    await databases.updateDocument(DATABASE_ID, appwriteConfig.trips, tripId, tripUpdate)

    // Move the trip off 'awaiting_manifests' and complete it once every stop is covered.
    try {
      const { checkAndUpdateTripStatus } = await import('./trip.actions')

      await checkAndUpdateTripStatus(tripId)
    } catch (error) {
      console.warn('Could not update trip status after field capture:', error)
    }

    return manifest as unknown as ManifestType
  } catch (error) {
    console.error('Error logging manifest delivery:', error)
    throw new Error('Failed to log delivery. Please try again.')
  }
}

/**
 * Fill in the details a driver could not capture in the field and mark the
 * manifest verified. Keeps the trip checkpoint figures in step.
 */
export const verifyManifestDetails = async (
  manifestId: string,
  details: {
    manifestNumber?: string
    packageSize?: string | null
    packageCount?: number
    deliveredCount?: number
    notes?: string
  },
  verifiedBy?: string
): Promise<ManifestType> => {
  try {
    const packageCount = details.packageCount ?? 0
    const deliveredCount = Math.min(Math.max(0, details.deliveredCount ?? packageCount), packageCount)

    // Appwrite's updateDocument response does NOT carry the `trip` relationship, so the
    // trip id has to be read from the stored document first. Taking it off the update
    // response instead leaves it undefined, which skipped the whole checkpoint/totals
    // sync below without raising anything - the admin got a success toast while the
    // trip kept the driver's temporary manifest number and a zero package total.
    const stored = (await databases.getDocument(DATABASE_ID, MANIFESTS_COLLECTION_ID, manifestId)) as any

    const updateData: Record<string, unknown> = {
      packageSize: details.packageSize || null,
      packageCount,
      deliveredCount,
      detailsVerified: true,
      verifiedAt: new Date().toISOString()
    }

    if (details.manifestNumber) updateData.manifestNumber = details.manifestNumber
    if (details.notes !== undefined) updateData.notes = details.notes
    if (verifiedBy) updateData.verifiedBy = verifiedBy

    const manifest = (await databases.updateDocument(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      manifestId,
      updateData
    )) as any

    // Push the confirmed figures onto the trip checkpoint.
    const tripId = stored.trip

    if (!tripId) {
      console.warn(`Manifest ${manifestId} has no trip relationship; skipping checkpoint sync`)
    }

    if (tripId) {
      const tripIdStr = typeof tripId === 'string' ? tripId : tripId.$id

      try {
        const trip = (await databases.getDocument(DATABASE_ID, appwriteConfig.trips, tripIdStr)) as any

        if (trip.checkpoints) {
          const checkpoints = JSON.parse(trip.checkpoints)
          const index = checkpoints.findIndex((cp: any) => cp.manifestId === manifestId)

          if (index !== -1) {
            checkpoints[index] = {
              ...checkpoints[index],
              manifestNumber: updateData.manifestNumber || checkpoints[index].manifestNumber,
              packageSize: details.packageSize || null,
              packagesDelivered: deliveredCount,
              packagesMissing: Math.max(0, packageCount - deliveredCount)
            }

            await databases.updateDocument(DATABASE_ID, appwriteConfig.trips, tripIdStr, {
              checkpoints: JSON.stringify(checkpoints)
            })
          }
        }

        // Keep the trip's headline package total in step with the verified figures.
        const tripManifests = await databases.listDocuments(DATABASE_ID, MANIFESTS_COLLECTION_ID, [
          Query.equal('trip', tripIdStr),
          Query.limit(1000)
        ])

        const totalPackages = tripManifests.documents.reduce(
          (sum: number, m: any) => sum + (m.packageCount || 0),
          0
        )

        await databases.updateDocument(DATABASE_ID, appwriteConfig.trips, tripIdStr, { totalPackages })
      } catch (error) {
        console.warn('Could not sync trip after verification:', error)
      }
    }

    return manifest as unknown as ManifestType
  } catch (error) {
    console.error('Error verifying manifest details:', error)
    throw new Error('Failed to save manifest details')
  }
}

/**
 * Every manifest waiting on the back office to supply its figures, newest first.
 *
 * Manifests predating the detailsVerified attribute default to false, so we also
 * require the package figures to be missing before flagging one for review.
 */
export const getManifestsAwaitingVerification = async (): Promise<any[]> => {
  try {
    const response = await tablesDB.listRows(DATABASE_ID, MANIFESTS_COLLECTION_ID, [
      Query.equal('detailsVerified', false),
      Query.orderDesc('$createdAt'),
      Query.select(['*', 'trip.*', 'trip.driver.*', 'trip.vehicle.*', 'dropofflocation.*']),
      Query.limit(500)
    ])

    return (response.rows as any[]).filter(isManifestAwaitingVerification)
  } catch (error) {
    console.error('Error fetching manifests awaiting verification:', error)
    throw new Error('Failed to fetch manifests awaiting verification')
  }
}
