import { ID, Query } from 'appwrite'
import { databases } from '@/libs/appwrite.config'
import { appwriteConfig } from '@/libs/appwrite.config'
import { 
  PickupLocationType, 
  DropoffLocationType, 
  GPSCoordinates,
  ProximityValidation
} from '@/types/apps/deliveryTypes'

// Type conversion helpers
const toPickupLocation = (doc: any): PickupLocationType => doc as unknown as PickupLocationType
const toDropoffLocation = (doc: any): DropoffLocationType => doc as unknown as DropoffLocationType
const toPickupLocationArray = (docs: any[]): PickupLocationType[] => docs as unknown as PickupLocationType[]
const toDropoffLocationArray = (docs: any[]): DropoffLocationType[] => docs as unknown as DropoffLocationType[]

// Create data types for forms (matching backend schema)
export interface CreatePickupLocationData {
  locationName: string
  locationCode: string
  address: string
  city: string
  region: string
  country: string
  gpsCoordinates: string
  contactPerson?: string
  contactPhone?: string
  isActive: boolean
}

export interface CreateDropoffLocationData {
  locationName: string
  locationCode: string
  address: string
  city: string
  region: string
  country: string
  gpsCoordinates: string
  contactPerson?: string
  contactPhone?: string
  isActive: boolean
}

export interface UpdatePickupLocationData extends Partial<CreatePickupLocationData> {
  $id: string
}

export interface UpdateDropoffLocationData extends Partial<CreateDropoffLocationData> {
  $id: string
}

export interface LocationFilters {
  isActive?: boolean
  deliveryZone?: string
  city?: string
  search?: string
}

// ==================== PICKUP LOCATIONS ====================

// Create pickup location
export async function createPickupLocation(locationData: CreatePickupLocationData): Promise<PickupLocationType> {
  try {
    const location = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.pickuplocations,
      ID.unique(),
      locationData
    )
    
    return toPickupLocation(location)
  } catch (error) {
    console.error('Error creating pickup location:', error)
    throw new Error('Failed to create pickup location')
  }
}

// Get all pickup locations
export async function getAllPickupLocations(filters?: LocationFilters): Promise<PickupLocationType[]> {
  try {
    const queries = [Query.orderDesc('$createdAt')]
    
    if (filters?.isActive !== undefined) {
      queries.push(Query.equal('isActive', filters.isActive))
    }
    
    if (filters?.city) {
      queries.push(Query.equal('address.city', filters.city))
    }
    
    if (filters?.search) {
      queries.push(Query.search('name', filters.search))
    }
    
    const response = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.pickuplocations,
      queries
    )
    
    return toPickupLocationArray(response.documents)
  } catch (error) {
    console.error('Error fetching pickup locations:', error)
    throw new Error('Failed to fetch pickup locations')
  }
}

// Get pickup location by ID
export async function getPickupLocationById(locationId: string): Promise<PickupLocationType> {
  try {
    const location = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.pickuplocations,
      locationId
    )
    
    return toPickupLocation(location)
  } catch (error) {
    console.error('Error fetching pickup location:', error)
    throw new Error('Failed to fetch pickup location')
  }
}

// Update pickup location
export async function updatePickupLocation(locationData: UpdatePickupLocationData): Promise<PickupLocationType> {
  try {
    const { $id, ...updateData } = locationData
    
    const location = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.pickuplocations,
      $id,
      updateData
    )
    
    return toPickupLocation(location)
  } catch (error) {
    console.error('Error updating pickup location:', error)
    throw new Error('Failed to update pickup location')
  }
}

// Delete pickup location
export async function deletePickupLocation(locationId: string): Promise<void> {
  try {
    await databases.deleteDocument(
      appwriteConfig.database,
      appwriteConfig.pickuplocations,
      locationId
    )
  } catch (error) {
    console.error('Error deleting pickup location:', error)
    throw new Error('Failed to delete pickup location')
  }
}

// ==================== DROPOFF LOCATIONS ====================

// Create dropoff location
export async function createDropoffLocation(locationData: CreateDropoffLocationData): Promise<DropoffLocationType> {
  try {
    const location = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.dropofflocations,
      ID.unique(),
      locationData
    )
    
    return toDropoffLocation(location)
  } catch (error) {
    console.error('Error creating dropoff location:', error)
    throw new Error('Failed to create dropoff location')
  }
}

// Get all dropoff locations
export async function getAllDropoffLocations(filters?: LocationFilters): Promise<DropoffLocationType[]> {
  try {
    const queries = [Query.orderDesc('$createdAt')]
    
    if (filters?.isActive !== undefined) {
      queries.push(Query.equal('isActive', filters.isActive))
    }
    
    if (filters?.deliveryZone) {
      queries.push(Query.equal('deliveryZone', filters.deliveryZone))
    }
    
    if (filters?.city) {
      queries.push(Query.equal('address.city', filters.city))
    }
    
    if (filters?.search) {
      queries.push(Query.search('name', filters.search))
    }
    
    const response = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.dropofflocations,
      queries
    )
    
    return toDropoffLocationArray(response.documents)
  } catch (error) {
    console.error('Error fetching dropoff locations:', error)
    throw new Error('Failed to fetch dropoff locations')
  }
}

// Get dropoff location by ID
export async function getDropoffLocationById(locationId: string): Promise<DropoffLocationType> {
  try {
    const location = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.dropofflocations,
      locationId
    )
    
    return toDropoffLocation(location)
  } catch (error) {
    console.error('Error fetching dropoff location:', error)
    throw new Error('Failed to fetch dropoff location')
  }
}

// Update dropoff location
export async function updateDropoffLocation(locationData: UpdateDropoffLocationData): Promise<DropoffLocationType> {
  try {
    const { $id, ...updateData } = locationData
    
    const location = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.dropofflocations,
      $id,
      updateData
    )
    
    return toDropoffLocation(location)
  } catch (error) {
    console.error('Error updating dropoff location:', error)
    throw new Error('Failed to update dropoff location')
  }
}

// Delete dropoff location
export async function deleteDropoffLocation(locationId: string): Promise<void> {
  try {
    await databases.deleteDocument(
      appwriteConfig.database,
      appwriteConfig.dropofflocations,
      locationId
    )
  } catch (error) {
    console.error('Error deleting dropoff location:', error)
    throw new Error('Failed to delete dropoff location')
  }
}

// ==================== UTILITY FUNCTIONS ====================

// Calculate distance between two GPS coordinates (Haversine formula)
// Helper function to parse GPS coordinates from string
function parseGPSCoordinates(gpsString?: string): GPSCoordinates | null {
  if (!gpsString) return null
  try {
    return JSON.parse(gpsString)
  } catch {
    return null
  }
}

export function calculateDistance(coord1: GPSCoordinates, coord2: GPSCoordinates): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (coord1.latitude * Math.PI) / 180
  const φ2 = (coord2.latitude * Math.PI) / 180
  const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180
  const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180

  const a = 
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  
  return R * c // Distance in meters
}

// Validate driver proximity to location
export function validateProximity(
  locationCoordinates: GPSCoordinates, 
  driverCoordinates: GPSCoordinates,
  requiredProximity: number = 100
): ProximityValidation {
  const distance = calculateDistance(locationCoordinates, driverCoordinates)
  
  return {
    locationId: '', // Will be set by caller
    driverLocation: driverCoordinates,
    distance,
    isWithinRange: distance <= requiredProximity,
    requiredProximity
  }
}

// Get nearby pickup locations
export async function getNearbyPickupLocations(
  coordinates: GPSCoordinates, 
  radiusInKm: number = 10
): Promise<PickupLocationType[]> {
  try {
    // Get all active pickup locations
    const allLocations = await getAllPickupLocations({ isActive: true })
    
    // Filter by distance
    const nearbyLocations = allLocations.filter(location => {
      const locationCoords = parseGPSCoordinates(location.gpsCoordinates)
      if (!locationCoords) return false
      const distance = calculateDistance(coordinates, locationCoords)
      return distance <= (radiusInKm * 1000) // Convert km to meters
    })
    
    // Sort by distance
    return nearbyLocations.sort((a, b) => {
      const aCoordsStr = parseGPSCoordinates(a.gpsCoordinates)
      const bCoordsStr = parseGPSCoordinates(b.gpsCoordinates)
      if (!aCoordsStr || !bCoordsStr) return 0
      const distanceA = calculateDistance(coordinates, aCoordsStr)
      const distanceB = calculateDistance(coordinates, bCoordsStr)
      return distanceA - distanceB
    })
  } catch (error) {
    console.error('Error fetching nearby pickup locations:', error)
    throw new Error('Failed to fetch nearby pickup locations')
  }
}

// Get nearby dropoff locations
export async function getNearbyDropoffLocations(
  coordinates: GPSCoordinates, 
  radiusInKm: number = 10
): Promise<DropoffLocationType[]> {
  try {
    // Get all active dropoff locations
    const allLocations = await getAllDropoffLocations({ isActive: true })
    
    // Filter by distance
    const nearbyLocations = allLocations.filter(location => {
      const locationCoords = parseGPSCoordinates(location.gpsCoordinates)
      if (!locationCoords) return false
      const distance = calculateDistance(coordinates, locationCoords)
      return distance <= (radiusInKm * 1000) // Convert km to meters
    })
    
    // Sort by distance
    return nearbyLocations.sort((a, b) => {
      const aCoordsStr = parseGPSCoordinates(a.gpsCoordinates)
      const bCoordsStr = parseGPSCoordinates(b.gpsCoordinates)
      if (!aCoordsStr || !bCoordsStr) return 0
      const distanceA = calculateDistance(coordinates, aCoordsStr)
      const distanceB = calculateDistance(coordinates, bCoordsStr)
      return distanceA - distanceB
    })
  } catch (error) {
    console.error('Error fetching nearby dropoff locations:', error)
    throw new Error('Failed to fetch nearby dropoff locations')
  }
}

// Get location statistics
export async function getLocationStatistics() {
  try {
    const [allPickupLocations, allDropoffLocations] = await Promise.all([
      getAllPickupLocations(),
      getAllDropoffLocations()
    ])
    
    const activePickupLocations = allPickupLocations.filter(l => l.isActive)
    const activeDropoffLocations = allDropoffLocations.filter(l => l.isActive)
    
    return {
      pickup: {
        total: allPickupLocations.length,
        active: activePickupLocations.length,
        inactive: allPickupLocations.length - activePickupLocations.length
      },
      dropoff: {
        total: allDropoffLocations.length,
        active: activeDropoffLocations.length,
        inactive: allDropoffLocations.length - activeDropoffLocations.length
      },
      overall: {
        totalLocations: allPickupLocations.length + allDropoffLocations.length,
        activeLocations: activePickupLocations.length + activeDropoffLocations.length
      }
    }
  } catch (error) {
    console.error('Error fetching location statistics:', error)
    throw new Error('Failed to fetch location statistics')
  }
}