
// Appwrite Imports
import { databases, tablesDB } from '@/libs/appwrite.config'
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
          manifestNumber: '', // Will be updated after manifest creation
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
      
      // Note: manifests array not initialized here - Appwrite's two-way relationship
      // automatically populates it when we set 'trip' field on each manifest
      invoiceGenerated: false,
      invoiceAmount: 0,
      paymentStatus: 'pending',
      currentCheckpoint: 0,
      distanceTraveled: 0,
      gpsTrackingData: null,
      currentLocation: null
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
      // Fetch dropoff location to get contact person and phone
      let recipientName = null
      let recipientPhone = null
      
      try {
        const dropoffLocation = await databases.getDocument(
          appwriteConfig.database,
          appwriteConfig.dropofflocations,
          manifestData.dropoffLocationId
        )
        
        recipientName = dropoffLocation.contactPerson || null
        recipientPhone = dropoffLocation.contactPhone || null
      } catch (error) {
        console.warn(`Could not fetch dropoff location details for ${manifestData.dropoffLocationId}`)
      }
      
      const manifestDoc = {
        manifestNumber: manifestData.manifestNumber,
        trip: trip.$id,
        dropofflocation: manifestData.dropoffLocationId, // direct relationship to dropoff location
        dropoffSequence: manifests.indexOf(manifestData) + 1,
        manifestDate: new Date(tripDetails.startTime).toISOString(),
        totalPackages: packages.filter(pkg => pkg.manifestTempId === manifestData.tempId).length,
        packageTypes: JSON.stringify(
          getPackageSizeCountsForManifest(packages, manifestData.tempId)
        ),
        status: 'pending',
        notes: manifestData.notes || '',
        departureTime: manifestData.departureTime || null,
        
        // Delivery tracking fields (initialized as null)
        arrivalTime: null,
        actualArrival: null,
        deliveryTime: null,
        estimatedArrival: null,
        manifestImage: null,
        
        // Proof of delivery fields (to be filled during delivery)
        proofOfDeliveryImage: null,
        deliveryGpsCoordinates: null,
        deliveryGpsVerified: false,
        gpsVerificationDistance: null,
        deliveredPackages: 0, // count of delivered packages (integer)
        missingPackages: JSON.stringify([]),
        
        // Auto-populate recipient details from dropoff location
        recipientName,
        recipientPhone
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

    // Step 2.5: Update trip checkpoints with manifest numbers and IDs
    const checkpointsData = JSON.parse(trip.checkpoints)
    const updatedCheckpoints = checkpointsData.map((checkpoint: any, index: number) => {
      const manifestData = manifests[index]
      // Find the created manifest by matching the temp ID
      const createdManifestId = manifestMap.get(manifestData.tempId)
      
      return {
        ...checkpoint,
        manifestId: createdManifestId || '', // Store manifest ID
        manifestNumber: manifestData.manifestNumber // Store manifest number
      }
    })
    
    // Update trip with checkpoints containing manifest IDs
    await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.trips,
      trip.$id,
      {
        checkpoints: JSON.stringify(updatedCheckpoints)
      }
    )

    const packageIds: string[] = []

    // Step 3: Create all package documents
    for (const packageData of packages) {
      const manifestId = manifestMap.get(packageData.manifestTempId)
      if (!manifestId) continue

      const manifest = manifests.find(m => m.tempId === packageData.manifestTempId)
      if (!manifest) continue

      const packageDoc = {
        trackingNumber: packageData.trackingNumber,
        packageSize: packageData.packageSize, // big, medium, small, bin
        isBin: packageData.isBin || false, // Is this a bin?
        itemCount: packageData.itemCount || null, // Headcount for bins
        manifest: manifestId,
        // Note: Locations accessed through manifest.dropofflocation and trip.route.startLocation
        // Note: Removed trip relationship - package -> manifest -> trip is sufficient
        status: 'pending',
        expectedDeliveryDate: new Date(tripDetails.startTime).toISOString(),
        
        // Recipient details (simplified - no sender info needed)
        recipient: packageData.recipientName, // DB field is 'recipient', not 'recipientName'
        recipientPhone: packageData.recipientPhone,
        notes: packageData.notes || null, // Optional notes for special instructions
        
        // Delivery tracking fields (set to null initially)
        deliveryDate: null
      }


      const pkg = await databases.createDocument(
        appwriteConfig.database,
        appwriteConfig.packages,
        ID.unique(),
        packageDoc
      )


      packageIds.push(pkg.$id)

      // Note: We don't manually update manifest.packages here because
      // Appwrite's two-way relationship automatically adds package ID to
      // manifest.packages when we set package.manifest above
    }


    return {
      success: true,
      tripId: trip.$id,
      tripNumber: trip.tripNumber as string
    }
  } catch (error) {
    console.error('❌ Error creating trip with manifests and packages:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
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
 * Helper to get package size counts for a manifest
 */
function getPackageSizeCountsForManifest(packages: any[], manifestTempId: string) {
  const manifestPackages = packages.filter(pkg => pkg.manifestTempId === manifestTempId)
  return manifestPackages.reduce((acc, pkg) => {
    acc[pkg.packageSize] = (acc[pkg.packageSize] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

/**
 * Helper to get total item count for a manifest (including bin contents)
 */
function getTotalItemCountForManifest(packages: any[], manifestTempId: string) {
  const manifestPackages = packages.filter(pkg => pkg.manifestTempId === manifestTempId)
  return manifestPackages.reduce((total, pkg) => {
    if (pkg.isBin && pkg.itemCount) {
      return total + pkg.itemCount
    }
    return total + 1
  }, 0)
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

    console.log('Trip query filters:', queries)

    const response = await tablesDB.listRows(
      appwriteConfig.database,
      appwriteConfig.trips,
      [...queries, Query.select(['*', 'driver.*', 'vehicle.*', 'manifests.length'])]
    )

    console.log('Fetched trips:', response)

    return response.rows as unknown as TripType[]
  } catch (error) {
    console.error('Error fetching trips:', error)
    throw new Error('Failed to fetch trips')
  }
}

/**
 * Get trip by ID with all related data (vehicle, driver, route, manifests, packages)
 */
export async function getTripById(tripId: string): Promise<any> {
  try {
    const { tablesDB } = await import('@/libs/appwrite.config')
    
    // Fetch trip with related data using TablesDB Query.select
    const trip = await tablesDB.getRow(
      appwriteConfig.database,
      appwriteConfig.trips,
      tripId,
      [
        Query.select([
          '*',
          'vehicle.*', // Fetch complete vehicle details
          'driver.*', // Fetch complete driver details  
          'route.*', // Fetch complete route details
          'manifests.*', // Fetch all manifests
          'manifests.dropofflocation.*', // Fetch dropoff location for each manifest
        ])
      ]
    )

    // Fetch packages for each manifest separately (one-way relationship: packages.manifest → manifests)
    if (trip.manifests && Array.isArray(trip.manifests)) {
      const PACKAGES_COLLECTION_ID = appwriteConfig.packages
      
      // Fetch packages for all manifests in parallel
      const manifestPackages = await Promise.all(
        trip.manifests.map(async (manifest: any) => {
          try {
            const packagesResponse = await databases.listDocuments(
              appwriteConfig.database,
              PACKAGES_COLLECTION_ID,
              [
                Query.equal('manifest', manifest.$id),
                Query.limit(300)
              ]
            )
            return {
              manifestId: manifest.$id,
              packages: packagesResponse.documents
            }
          } catch (error) {
            console.warn(`Could not fetch packages for manifest ${manifest.$id}`)
            return {
              manifestId: manifest.$id,
              packages: []
            }
          }
        })
      )
      
      // Attach packages to their respective manifests
      trip.manifests = trip.manifests.map((manifest: any) => {
        const manifestPackageData = manifestPackages.find(mp => mp.manifestId === manifest.$id)
        return {
          ...manifest,
          packages: manifestPackageData?.packages || []
        }
      })
    }

    return trip
  } catch (error) {
    console.error('Error fetching trip with related data:', error)
    throw new Error('Failed to fetch trip')
  }
}

/**
 * Get trip by ID (basic version without relationships)
 */
export async function getTripByIdBasic(tripId: string): Promise<TripType> {
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

/**
 * Check if all manifests in a trip are delivered and auto-complete the trip
 */
export async function checkAndCompleteTrip(tripId: string): Promise<boolean> {
  try {
    // Get trip with all manifests
    const trip = await getTripById(tripId)
    
    if (!trip || !trip.manifests || trip.manifests.length === 0) {
      return false
    }
    
    // Check if all manifests are delivered
    const allManifestsDelivered = trip.manifests.every(
      (manifest: any) => manifest.status === 'delivered' || manifest.status === 'completed'
    )
    
    if (allManifestsDelivered && trip.status !== 'completed') {
      await updateTripStatus(tripId, 'completed')
      return true
    }
    
    return false
  } catch (error) {
    console.error('Error checking and completing trip:', error)
    return false
  }
}
