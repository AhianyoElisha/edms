'use server'

// Appwrite Imports
import { databases } from '@/libs/appwrite.config'
import { appwriteConfig } from '@/libs/appwrite.config'
import { ID, Query } from 'node-appwrite'

// Type Imports
import type { TripWizardData } from '@/views/edms/trips/types'
import type { TripType } from '@/types/apps/deliveryTypes'

/**
 * Create a complete trip with all manifests and packages
 * This is a transactional operation that creates:
 * 1. Trip document
 * 2. All manifest documents linked to the trip
 * 3. All package documents linked to manifests
 * 4. Initialize checkpoints array for trip tracking
 */
export async function createTripWithManifestsAndPackages(wizardData: TripWizardData): Promise<{
  success: boolean
  tripId?: string
  tripNumber?: string
  error?: string
}> {
  try {
    const { tripDetails, manifests, packages } = wizardData

    // Generate unique trip number
    const tripNumber = await generateTripNumber()

    // Step 1: Create the trip document
    const tripData = {
      tripNumber,
      vehicle: tripDetails.vehicleId,
      driver: tripDetails.driverId,
      route: tripDetails.routeId,
      tripDate: new Date(tripDetails.startTime).toISOString(),
      startTime: new Date(tripDetails.startTime).toISOString(),
      status: 'planned',
      notes: tripDetails.notes || '',
      creator: tripDetails.driverId, // TODO: Get from auth context
      
      // Initialize checkpoints based on manifests
      checkpoints: JSON.stringify(
        manifests.map((manifest, index) => ({
          dropoffLocationId: manifest.dropoffLocationId,
          dropoffLocationName: manifest.dropoffLocationName,
          manifestId: '', // Will be updated after manifest creation
          sequence: index + 1,
          status: 'pending',
          arrivalTime: null,
          completionTime: null,
          gpsCoordinates: null,
          gpsVerified: false,
          packagesDelivered: 0,
          packagesMissing: 0
        }))
      ),
      
      manifests: [], // Will be populated with manifest IDs
      expenses: [],
      invoiceGenerated: false,
      invoiceAmount: 0,
      paymentStatus: 'pending',
      currentCheckpoint: 0,
      distanceTraveled: 0
    }

    const trip = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.trips,
      ID.unique(),
      tripData
    )

    const manifestIds: string[] = []
    const manifestMap = new Map<string, string>() // tempId -> real ID

    // Step 2: Create all manifest documents
    for (const manifestData of manifests) {
      const manifestDoc = {
        manifestNumber: manifestData.manifestNumber,
        trip: trip.$id,
        vehicle: tripDetails.vehicleId,
        driver: tripDetails.driverId,
        pickupLocation: '', // TODO: Get from route
        dropoffLocation: manifestData.dropoffLocationId,
        dropoffSequence: manifests.indexOf(manifestData) + 1,
        manifestDate: new Date(tripDetails.startTime).toISOString(),
        totalPackages: packages.filter(pkg => pkg.manifestTempId === manifestData.tempId).length,
        packageTypes: JSON.stringify(
          getPackageTypeCountsForManifest(packages, manifestData.tempId)
        ),
        packages: [], // Will be populated with package IDs
        status: 'pending',
        notes: manifestData.notes || '',
        creator: tripDetails.driverId,
        estimatedArrival: manifestData.estimatedArrival || null,
        departureTime: manifestData.departureTime || null,
        
        // Proof of delivery fields (to be filled during delivery)
        proofOfDeliveryImage: null,
        deliveryGpsCoordinates: null,
        deliveryGpsVerified: false,
        gpsVerificationDistance: null,
        deliveredPackages: JSON.stringify([]),
        missingPackages: JSON.stringify([]),
        deliveryNotes: null,
        recipientName: null,
        recipientPhone: null
      }

      const manifest = await databases.createDocument(
        appwriteConfig.database,
        appwriteConfig.manifests,
        ID.unique(),
        manifestDoc
      )

      manifestIds.push(manifest.$id)
      manifestMap.set(manifestData.tempId, manifest.$id)
    }

    const packageIds: string[] = []

    // Step 3: Create all package documents
    for (const packageData of packages) {
      const manifestId = manifestMap.get(packageData.manifestTempId)
      if (!manifestId) continue

      const manifest = manifests.find(m => m.tempId === packageData.manifestTempId)
      if (!manifest) continue

      const packageDoc = {
        packageId: packageData.trackingNumber,
        trackingNumber: packageData.trackingNumber,
        packageType: packageData.packageType,
        pickupLocation: '', // TODO: Get from route
        dropoffLocation: manifest.dropoffLocationId,
        route: tripDetails.routeId,
        manifest: manifestId,
        trip: trip.$id,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expectedDeliveryDate: new Date(tripDetails.startTime).toISOString(),
        creator: tripDetails.driverId,
        
        // Package details
        senderName: packageData.senderName || null,
        senderPhone: packageData.senderPhone || null,
        recipientName: packageData.recipientName,
        recipientPhone: packageData.recipientPhone,
        weight: packageData.weight || null,
        value: packageData.value || null,
        description: packageData.description || null,
        
        // Delivery tracking
        deliveryConfirmed: false,
        notDeliveredReason: null
      }

      const pkg = await databases.createDocument(
        appwriteConfig.database,
        appwriteConfig.packages,
        ID.unique(),
        packageDoc
      )

      packageIds.push(pkg.$id)

      // Update manifest with package ID
      const manifestToUpdate = manifestIds[manifests.findIndex(m => m.tempId === packageData.manifestTempId)]
      if (manifestToUpdate) {
        const currentManifest = await databases.getDocument(
          appwriteConfig.database,
          appwriteConfig.manifests,
          manifestToUpdate
        )
        
        const currentPackages = currentManifest.packages || []
        await databases.updateDocument(
          appwriteConfig.database,
          appwriteConfig.manifests,
          manifestToUpdate,
          {
            packages: [...currentPackages, pkg.$id]
          }
        )
      }
    }

    // Step 4: Update trip with manifest IDs and update checkpoints
    const checkpointsWithManifestIds = manifests.map((manifest, index) => ({
      dropoffLocationId: manifest.dropoffLocationId,
      dropoffLocationName: manifest.dropoffLocationName,
      manifestId: manifestMap.get(manifest.tempId) || '',
      sequence: index + 1,
      status: 'pending',
      arrivalTime: null,
      completionTime: null,
      gpsCoordinates: null,
      gpsVerified: false,
      packagesDelivered: 0,
      packagesMissing: 0
    }))

    await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.trips,
      trip.$id,
      {
        manifests: manifestIds,
        checkpoints: JSON.stringify(checkpointsWithManifestIds)
      }
    )

    return {
      success: true,
      tripId: trip.$id,
      tripNumber: trip.tripNumber as string
    }
  } catch (error) {
    console.error('Error creating trip with manifests and packages:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create trip'
    }
  }
}

/**
 * Generate unique trip number
 */
async function generateTripNumber(): Promise<string> {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  
  // Get count of trips today to generate sequence
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString()
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString()
  
  try {
    const todayTrips = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.trips,
      [
        Query.greaterThanEqual('tripDate', startOfDay),
        Query.lessThan('tripDate', endOfDay)
      ]
    )
    
    const sequence = (todayTrips.total + 1).toString().padStart(4, '0')
    return `TRP-${year}${month}${day}-${sequence}`
  } catch (error) {
    // Fallback to random if query fails
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
    return `TRP-${year}${month}${day}-${random}`
  }
}

/**
 * Helper to get package type counts for a manifest
 */
function getPackageTypeCountsForManifest(packages: any[], manifestTempId: string) {
  const manifestPackages = packages.filter(pkg => pkg.manifestTempId === manifestTempId)
  return manifestPackages.reduce((acc, pkg) => {
    acc[pkg.packageType] = (acc[pkg.packageType] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

/**
 * Get all trips with optional filtering
 */
export async function getAllTrips(filters?: {
  status?: string
  driverId?: string
  vehicleId?: string
  startDate?: string
  endDate?: string
}): Promise<TripType[]> {
  try {
    const queries: string[] = []

    if (filters) {
      if (filters.status) {
        queries.push(Query.equal('status', filters.status))
      }
      if (filters.driverId) {
        queries.push(Query.equal('driver', filters.driverId))
      }
      if (filters.vehicleId) {
        queries.push(Query.equal('vehicle', filters.vehicleId))
      }
      if (filters.startDate) {
        queries.push(Query.greaterThanEqual('tripDate', filters.startDate))
      }
      if (filters.endDate) {
        queries.push(Query.lessThanEqual('tripDate', filters.endDate))
      }
    }

    queries.push(Query.orderDesc('$createdAt'))

    const response = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.trips,
      queries
    )

    return response.documents as unknown as TripType[]
  } catch (error) {
    console.error('Error fetching trips:', error)
    throw new Error('Failed to fetch trips')
  }
}

/**
 * Get trip by ID
 */
export async function getTripById(tripId: string): Promise<TripType> {
  try {
    const trip = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.trips,
      tripId
    )

    return trip as unknown as TripType
  } catch (error) {
    console.error('Error fetching trip:', error)
    throw new Error('Failed to fetch trip')
  }
}

/**
 * Update trip status
 */
export async function updateTripStatus(tripId: string, status: string): Promise<TripType> {
  try {
    const trip = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.trips,
      tripId,
      { status }
    )

    return trip as unknown as TripType
  } catch (error) {
    console.error('Error updating trip status:', error)
    throw new Error('Failed to update trip status')
  }
}
