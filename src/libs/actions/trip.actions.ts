
// Appwrite Imports
import { databases, tablesDB } from '@/libs/appwrite.config'
import { appwriteConfig } from '@/libs/appwrite.config'
import { ID, Query } from 'node-appwrite'

// Type Imports
import type { TripWizardData } from '@/views/edms/trips/types'
import type { TripType } from '@/types/apps/deliveryTypes'

/**
 * Create a complete trip with all manifests
 * This is a transactional operation that creates:
 * 1. Trip document
 * 2. All manifest documents linked to the trip
 * 3. Initialize checkpoints array for trip tracking
 * 
 * Note: Package information is now stored directly on manifests
 * Each manifest contains: packageSize, packageCount, deliveredCount
 */
export async function createTripWithManifests(wizardData: TripWizardData): Promise<{
  success: boolean
  tripId?: string
  tripNumber?: string
  error?: string
}> {
  try {
    const { tripDetails, manifests } = wizardData

    // Generate unique trip number
    const tripNumber = await generateTripNumber()

    // Calculate total packages across all manifests
    const totalPackages = manifests.reduce((sum, m) => sum + m.packageCount, 0)

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
      totalPackages: totalPackages,
      tonnage: tripDetails.tonnage || null,
      tripCost: tripDetails.tripCost || 0,
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
        dropofflocation: manifestData.dropoffLocationId,
        dropoffSequence: manifests.indexOf(manifestData) + 1,
        manifestDate: new Date(tripDetails.startTime).toISOString(),
        
        // Package information stored directly on manifest
        packageSize: manifestData.packageSize, // 'small', 'medium', or 'big'
        packageCount: manifestData.packageCount, // Head count of packages
        deliveredCount: 0, // Start with 0 delivered
        
        status: 'pending',
        notes: manifestData.notes || '',
        
        // Delivery tracking fields (initialized as null)
        arrivalTime: null,
        deliveryTime: null,
        estimatedArrival: manifestData.estimatedArrival || null,
        manifestImage: null,
        
        // Proof of delivery fields (to be filled during delivery)
        proofOfDeliveryImage: null,
        deliveryGpsCoordinates: null,
        deliveryGpsVerified: false,
        gpsVerificationDistance: null,
        deliveredPackages: 0,
        
        // // Auto-populate recipient details from dropoff location
        // recipientName,
        // recipientPhone
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

    // Step 3: Update trip checkpoints with manifest numbers and IDs
    const checkpointsData = JSON.parse(trip.checkpoints)
    const updatedCheckpoints = checkpointsData.map((checkpoint: any, index: number) => {
      const manifestData = manifests[index]
      const createdManifestId = manifestMap.get(manifestData.tempId)
      
      return {
        ...checkpoint,
        manifestId: createdManifestId || '',
        manifestNumber: manifestData.manifestNumber,
        packageSize: manifestData.packageSize,
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

    return {
      success: true,
      tripId: trip.$id,
      tripNumber: trip.tripNumber as string
    }
  } catch (error) {
    console.error('❌ Error creating trip with manifests:', error)
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
      [...queries, Query.select(['*', 'driver.*', 'vehicle.*', 'route.*', 'manifests.length']), Query.limit(1000)]
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
 * Check and update trip status based on manifest progress
 * Status flow:
 * - planned: Trip created, no manifests started
 * - in_progress: At least one manifest has been loaded/started
 * - completed: All manifests delivered AND all return waybills delivered (if any)
 */
export async function checkAndUpdateTripStatus(tripId: string): Promise<{
  updated: boolean
  newStatus: string | null
}> {
  try {
    // Get trip with all manifests
    const trip = await getTripById(tripId)
    
    if (!trip || !trip.manifests || trip.manifests.length === 0) {
      return { updated: false, newStatus: null }
    }
    
    const manifests = trip.manifests
    const currentStatus = trip.status
    
    // Check manifest statuses
    const manifestStatuses = manifests.map((m: any) => m.status)
    const hasStartedManifest = manifestStatuses.some((s: string) => 
      s === 'loaded' || s === 'in_transit' || s === 'delivered' || s === 'completed'
    )
    const allManifestsDelivered = manifestStatuses.every((s: string) => 
      s === 'delivered' || s === 'completed'
    )
    
    // Get return waybills for this trip
    let allReturnsDelivered = true
    let hasReturns = false
    
    try {
      const { getReturnWaybillsByTrip } = await import('./returnwaybill.actions')
      const returnWaybills = await getReturnWaybillsByTrip(tripId)
      
      if (returnWaybills.length > 0) {
        hasReturns = true
        allReturnsDelivered = returnWaybills.every((rw: any) => 
          rw.status === 'delivered' || rw.status === 'processed'
        )
      }
    } catch (error) {
      console.warn('Could not check return waybills:', error)
      // Continue without return waybill check
    }
    
    // Determine new status
    let newStatus: string | null = null
    
    if (currentStatus === 'planned' && hasStartedManifest) {
      // Move to in_progress when first manifest is started
      newStatus = 'in_progress'
    } else if (allManifestsDelivered && (!hasReturns || allReturnsDelivered)) {
      // Move to completed only if ALL manifests are delivered
      // AND (no returns exist OR all returns are delivered)
      if (currentStatus !== 'completed') {
        newStatus = 'completed'
      }
    }
    
    // Update trip if status changed
    if (newStatus && newStatus !== currentStatus) {
      await updateTripStatus(tripId, newStatus)
      return { updated: true, newStatus }
    }
    
    return { updated: false, newStatus: null }
  } catch (error) {
    console.error('Error checking and updating trip status:', error)
    return { updated: false, newStatus: null }
  }
}

/**
 * Check if all manifests in a trip are delivered and auto-complete the trip
 * @deprecated Use checkAndUpdateTripStatus instead
 */
export async function checkAndCompleteTrip(tripId: string): Promise<boolean> {
  const result = await checkAndUpdateTripStatus(tripId)
  return result.updated && result.newStatus === 'completed'
}
