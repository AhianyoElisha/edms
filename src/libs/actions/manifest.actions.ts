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
      queries
    )
    
    return response.documents as unknown as ManifestType[]
  } catch (error) {
    console.error('Error fetching manifests:', error)
    throw new Error('Failed to fetch manifests')
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

    // Fetch packages separately using one-way relationship
    const PACKAGES_COLLECTION_ID = appwriteConfig.packages
    const packagesResponse = await databases.listDocuments(
      DATABASE_ID,
      PACKAGES_COLLECTION_ID,
      [
        Query.equal('manifest', manifestId),
        Query.limit(300)
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
      packages: packagesResponse.documents,
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
        totalPackages: packageIds?.length || 0,
        status: 'pending' as const
      }
    )
    
    // If packageIds provided, assign them to this manifest
    if (packageIds && packageIds.length > 0) {
      await assignPackagesToManifest(manifest.$id, packageIds)
    }
    
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
    
    // Perform the update - Appwrite will preserve all other fields including relationships
    const manifest = await databases.updateDocument(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      manifestId,
      updateData
    )
    
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
      [Query.limit(1)]
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
export const assignPackagesToManifest = async (
  manifestId: string,
  packageIds: string[]
): Promise<ManifestType> => {
  try {
    const PACKAGES_COLLECTION_ID = appwriteConfig.packages
    
    // Update each package to reference this manifest (one-way relationship)
    await Promise.all(
      packageIds.map(packageId =>
        databases.updateDocument(
          DATABASE_ID,
          PACKAGES_COLLECTION_ID,
          packageId,
          { manifest: manifestId }
        )
      )
    )
    
    // Update manifest's totalPackages count
    // Count packages that reference this manifest
    const packagesResponse = await databases.listDocuments(
      DATABASE_ID,
      PACKAGES_COLLECTION_ID,
      [Query.equal('manifest', manifestId)]
    )
    
    const manifest = await databases.updateDocument(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      manifestId,
      { totalPackages: packagesResponse.total }
    )
    
    return manifest as unknown as ManifestType
  } catch (error) {
    console.error('Error assigning packages to manifest:', error)
    throw new Error('Failed to assign packages to manifest')
  }
}

/**
 * Remove packages from manifest using one-way relationship
 * Sets each package's manifest field to null
 */
export const removePackagesFromManifest = async (
  manifestId: string,
  packageIds: string[]
): Promise<ManifestType> => {
  try {
    const PACKAGES_COLLECTION_ID = appwriteConfig.packages
    
    // Update each package to remove the manifest reference (set to null)
    await Promise.all(
      packageIds.map(packageId =>
        databases.updateDocument(
          DATABASE_ID,
          PACKAGES_COLLECTION_ID,
          packageId,
          { manifest: null }
        )
      )
    )
    
    // Update manifest's totalPackages count
    const packagesResponse = await databases.listDocuments(
      DATABASE_ID,
      PACKAGES_COLLECTION_ID,
      [Query.equal('manifest', manifestId)]
    )
    
    const manifest = await databases.updateDocument(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      manifestId,
      { totalPackages: packagesResponse.total }
    )
    
    return manifest as unknown as ManifestType
  } catch (error) {
    console.error('Error removing packages from manifest:', error)
    throw new Error('Failed to remove packages from manifest')
  }
}

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
 * Update manifest deliveredPackages count and trip checkpoint
 * Called when packages are marked as delivered
 */
export const updateManifestDeliveredCount = async (
  manifestId: string,
  deliveredCount: number
): Promise<ManifestType> => {
  try {
    // Update manifest
    const manifest = await databases.updateDocument(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      manifestId,
      {
        deliveredPackages: deliveredCount
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
    // Fetch current trip to get checkpoints
    const trip = await databases.getDocument(
      DATABASE_ID,
      appwriteConfig.trips,
      tripId
    ) as any
    
    if (!trip.checkpoints) return
    
    // Parse checkpoints
    const checkpoints = JSON.parse(trip.checkpoints)
    
    // Find and update the checkpoint for this manifest
    const checkpointIndex = checkpoints.findIndex((cp: any) => cp.manifestId === manifestId)
    
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
 * Updates manifest status, timestamps, and delivered/missing packages
 * Also updates the trip's checkpoint for this manifest
 */
export const markManifestAsDelivered = async (
  manifestId: string,
  deliveredPackageIds: string[],
  missingPackageIds: string[] = []
): Promise<ManifestType> => {
  try {
    const now = new Date().toISOString()
    
    // Fetch packages to get counts
    const PACKAGES_COLLECTION_ID = appwriteConfig.packages
    const packagesResponse = await databases.listDocuments(
      DATABASE_ID,
      PACKAGES_COLLECTION_ID,
      [Query.equal('manifest', manifestId)]
    )
    
    // Build update object with all delivery tracking fields
    const updateData: Record<string, string | number> = {
      status: 'delivered',
      deliveryTime: now,
      actualArrival: now,
      arrivalTime: now, // Mark arrival time as well
      deliveredPackages: deliveredPackageIds.length, // count of delivered packages (integer)
      missingPackages: JSON.stringify(missingPackageIds)
    }
    
    // Update manifest
    const manifest = await databases.updateDocument(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      manifestId,
      updateData
    ) as any
    
    // Update trip checkpoints
    if (manifest.trip) {
      await updateTripCheckpoint(
        typeof manifest.trip === 'string' ? manifest.trip : manifest.trip.$id,
        manifestId,
        deliveredPackageIds.length,
        missingPackageIds.length,
        now
      )
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
    // Fetch current trip to get checkpoints
    const trip = await databases.getDocument(
      DATABASE_ID,
      appwriteConfig.trips,
      tripId
    ) as any
    
    if (!trip.checkpoints) return
    
    // Parse checkpoints
    const checkpoints = JSON.parse(trip.checkpoints)
    
    // Find and update the checkpoint for this manifest
    const checkpointIndex = checkpoints.findIndex((cp: any) => cp.manifestId === manifestId)
    
    if (checkpointIndex !== -1) {
      checkpoints[checkpointIndex] = {
        ...checkpoints[checkpointIndex],
        status: 'completed',
        completionTime,
        arrivalTime: completionTime,
        packagesDelivered,
        packagesMissing
      }
      
      // Update trip with new checkpoints
      await databases.updateDocument(
        DATABASE_ID,
        appwriteConfig.trips,
        tripId,
        {
          checkpoints: JSON.stringify(checkpoints),
          currentCheckpoint: checkpointIndex + 1
        }
      )
    }
  } catch (error) {
    console.error('Error updating trip checkpoint:', error)
    // Don't throw - checkpoint update is supplementary
  }
}

/**
 * Get manifest package statistics
 */
export const getManifestPackageStats = async (manifestId: string): Promise<{
  total: number
  delivered: number
  pending: number
  missing: number
}> => {
  try {
    const manifest = await getManifestByIdWithRelations(manifestId)
    const packages = Array.isArray(manifest.packages) ? manifest.packages : []
    
    const stats = {
      total: packages.length,
      delivered: packages.filter((pkg: any) => pkg.status === 'delivered').length,
      pending: packages.filter((pkg: any) => pkg.status === 'pending' || pkg.status === 'in_transit').length,
      missing: packages.filter((pkg: any) => pkg.status === 'missing' || pkg.status === 'failed').length
    }
    
    return stats
  } catch (error) {
    console.error('Error fetching manifest package stats:', error)
    throw new Error('Failed to fetch manifest package statistics')
  }
}