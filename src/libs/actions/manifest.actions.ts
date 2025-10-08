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
    
    if (filters?.driverId) {
      queries.push(Query.equal('driver', filters.driverId))
    }
    
    if (filters?.vehicleId) {
      queries.push(Query.equal('vehicle', filters.vehicleId))
    }
    
    if (filters?.pickupLocationId) {
      queries.push(Query.equal('pickupLocation', filters.pickupLocationId))
    }
    
    if (filters?.dropoffLocationId) {
      queries.push(Query.equal('dropoffLocation', filters.dropoffLocationId))
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
 */
export const getManifestByIdWithRelations = async (manifestId: string) => {
  try {
    const manifest = await tablesDB.getRow(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      manifestId,
      [
        Query.select([
          '*',
          'packages.*',
          'pickuplocation.*',
          'dropofflocation.*',
          'trip.*',
          'vehicle.*',
          'driver.*',
          'trip.driver.*',
          'trip.route.*',
        ])
      ]
    )

    return manifest
  } catch (error) {
    console.error('Error fetching manifest with relations:', error)
    throw new Error('Failed to fetch manifest details')
  }
}

/**
 * Create a new manifest
 */
export const createManifest = async (manifestData: Omit<ManifestType, '$id' | '$createdAt' | '$updatedAt'>): Promise<ManifestType> => {
  try {
    // Generate unique manifest number
    const manifestNumber = `MF-${Date.now()}`
    
    const manifest = await databases.createDocument(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      ID.unique(),
      {
        ...manifestData,
        manifestNumber,
        totalPackages: manifestData.packages.length,
        status: 'pending' as const
      }
    )
    
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
    // Using direct databases import from appwrite config
    
    const updateData: any = { status }
    
    // Add timestamp based on status
    switch (status) {
      case 'loaded':
        updateData.departureTime = additionalData?.departureTime || new Date().toISOString()
        break
      case 'in_transit':
        updateData.departureTime = updateData.departureTime || new Date().toISOString()
        break
      case 'delivered':
        updateData.arrivalTime = additionalData?.arrivalTime || new Date().toISOString()
        break
      case 'completed':
        updateData.deliveryTime = additionalData?.deliveryTime || new Date().toISOString()
        break
    }
    
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
 * Assign packages to manifest
 */
export const assignPackagesToManifest = async (
  manifestId: string,
  packageIds: string[]
): Promise<ManifestType> => {
  try {
    // Using direct databases import from appwrite config
    
    // Get current manifest to merge packages
    const currentManifest = await getManifestById(manifestId)
    const updatedPackages = [...new Set([...currentManifest.packages, ...packageIds])]
    
    const manifest = await databases.updateDocument(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      manifestId,
      {
        packages: updatedPackages,
        totalPackages: updatedPackages.length
      }
    )
    
    return manifest as unknown as ManifestType
  } catch (error) {
    console.error('Error assigning packages to manifest:', error)
    throw new Error('Failed to assign packages to manifest')
  }
}

/**
 * Remove packages from manifest
 */
export const removePackagesFromManifest = async (
  manifestId: string,
  packageIds: string[]
): Promise<ManifestType> => {
  try {
    // Using direct databases import from appwrite config
    
    // Get current manifest
    const currentManifest = await getManifestById(manifestId)
    const updatedPackages = currentManifest.packages.filter(id => !packageIds.includes(id))
    
    const manifest = await databases.updateDocument(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      manifestId,
      {
        packages: updatedPackages,
        totalPackages: updatedPackages.length
      }
    )
    
    return manifest as unknown as ManifestType
  } catch (error) {
    console.error('Error removing packages from manifest:', error)
    throw new Error('Failed to remove packages from manifest')
  }
}