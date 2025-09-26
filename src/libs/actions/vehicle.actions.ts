import { ID, Query } from 'appwrite'
import { databases } from '@/libs/appwrite.config'
import { appwriteConfig } from '@/libs/appwrite.config'
import { VehicleType, VehicleStatusType } from '@/types/apps/deliveryTypes'

// Type conversion helper
const toVehicleType = (doc: any): VehicleType => doc as unknown as VehicleType
const toVehicleTypeArray = (docs: any[]): VehicleType[] => docs as unknown as VehicleType[]

export interface CreateVehicleData {
  licensePlate: string
  type: 'truck' | 'van' | 'motorcycle' | 'bicycle'
  status: VehicleStatusType
  driverId?: string
  location?: string
  capacity: string
  model: string
  year: number
  batteryLevel?: number
  fuelLevel?: number
  lastMaintenance?: string
  nextMaintenance?: string
}

export interface UpdateVehicleData extends Partial<CreateVehicleData> {
  $id: string
}

export interface VehicleFilters {
  status?: VehicleStatusType
  type?: string
  driverId?: string
  search?: string
}

// Create a new vehicle
export async function createVehicle(vehicleData: CreateVehicleData): Promise<VehicleType> {
  try {
    const vehicle = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.vehicles,
      ID.unique(),
      {
        ...vehicleData,
        batteryLevel: vehicleData.batteryLevel || 100,
        fuelLevel: vehicleData.fuelLevel || 100,
      }
    )
    
    return toVehicleType(vehicle)
  } catch (error) {
    console.error('Error creating vehicle:', error)
    throw new Error('Failed to create vehicle')
  }
}

// Get all vehicles with optional filtering
export async function getAllVehicles(filters?: VehicleFilters): Promise<VehicleType[]> {
  try {
    const queries = [Query.orderDesc('$createdAt')]
    
    // Add filters if provided
    if (filters?.status) {
      queries.push(Query.equal('status', filters.status))
    }
    
    if (filters?.type) {
      queries.push(Query.equal('type', filters.type))
    }
    
    if (filters?.driverId) {
      queries.push(Query.equal('driverId', filters.driverId))
    }
    
    if (filters?.search) {
      queries.push(Query.search('licensePlate', filters.search))
    }
    
    const response = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.vehicles,
      queries
    )
    
    return toVehicleTypeArray(response.documents)
  } catch (error) {
    console.error('Error fetching vehicles:', error)
    throw new Error('Failed to fetch vehicles')
  }
}

// Get a single vehicle by ID
export async function getVehicleById(vehicleId: string): Promise<VehicleType> {
  try {
    const vehicle = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.vehicles,
      vehicleId
    )
    
    return toVehicleType(vehicle)
  } catch (error) {
    console.error('Error fetching vehicle:', error)
    throw new Error('Failed to fetch vehicle')
  }
}

// Update a vehicle
export async function updateVehicle(vehicleData: UpdateVehicleData): Promise<VehicleType> {
  try {
    const { $id, ...updateData } = vehicleData
    
    const vehicle = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.vehicles,
      $id,
      updateData
    )
    
    return toVehicleType(vehicle)
  } catch (error) {
    console.error('Error updating vehicle:', error)
    throw new Error('Failed to update vehicle')
  }
}

// Delete a vehicle
export async function deleteVehicle(vehicleId: string): Promise<void> {
  try {
    await databases.deleteDocument(
      appwriteConfig.database,
      appwriteConfig.vehicles,
      vehicleId
    )
  } catch (error) {
    console.error('Error deleting vehicle:', error)
    throw new Error('Failed to delete vehicle')
  }
}

// Get vehicles by status
export async function getVehiclesByStatus(status: VehicleStatusType): Promise<VehicleType[]> {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.vehicles,
      [
        Query.equal('status', status),
        Query.orderDesc('$createdAt')
      ]
    )
    
    return toVehicleTypeArray(response.documents)
  } catch (error) {
    console.error('Error fetching vehicles by status:', error)
    throw new Error('Failed to fetch vehicles by status')
  }
}

// Get available vehicles (not assigned to any driver)
export async function getAvailableVehicles(): Promise<VehicleType[]> {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.vehicles,
      [
        Query.equal('status', 'available'),
        Query.isNull('driverId'),
        Query.orderDesc('$createdAt')
      ]
    )
    
    return toVehicleTypeArray(response.documents)
  } catch (error) {
    console.error('Error fetching available vehicles:', error)
    throw new Error('Failed to fetch available vehicles')
  }
}

// Assign driver to vehicle
export async function assignDriverToVehicle(vehicleId: string, driverId: string, driverName: string): Promise<VehicleType> {
  try {
    const vehicle = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.vehicles,
      vehicleId,
      {
        driverId,
        driverName,
        status: 'active'
      }
    )
    
    return toVehicleType(vehicle)
  } catch (error) {
    console.error('Error assigning driver to vehicle:', error)
    throw new Error('Failed to assign driver to vehicle')
  }
}

// Unassign driver from vehicle
export async function unassignDriverFromVehicle(vehicleId: string): Promise<VehicleType> {
  try {
    const vehicle = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.vehicles,
      vehicleId,
      {
        driverId: null,
        driverName: null,
        status: 'available'
      }
    )
    
    return toVehicleType(vehicle)
  } catch (error) {
    console.error('Error unassigning driver from vehicle:', error)
    throw new Error('Failed to unassign driver from vehicle')
  }
}

// Update vehicle location
export async function updateVehicleLocation(vehicleId: string, location: string): Promise<VehicleType> {
  try {
    const vehicle = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.vehicles,
      vehicleId,
      { location }
    )
    
    return toVehicleType(vehicle)
  } catch (error) {
    console.error('Error updating vehicle location:', error)
    throw new Error('Failed to update vehicle location')
  }
}

// Update vehicle status
export async function updateVehicleStatus(vehicleId: string, status: VehicleStatusType): Promise<VehicleType> {
  try {
    const vehicle = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.vehicles,
      vehicleId,
      { status }
    )
    
    return toVehicleType(vehicle)
  } catch (error) {
    console.error('Error updating vehicle status:', error)
    throw new Error('Failed to update vehicle status')
  }
}

// Update vehicle battery/fuel levels
export async function updateVehicleLevels(
  vehicleId: string, 
  batteryLevel?: number, 
  fuelLevel?: number
): Promise<VehicleType> {
  try {
    const updateData: any = {}
    
    if (batteryLevel !== undefined) {
      updateData.batteryLevel = batteryLevel
    }
    
    if (fuelLevel !== undefined) {
      updateData.fuelLevel = fuelLevel
    }
    
    const vehicle = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.vehicles,
      vehicleId,
      updateData
    )
    
    return toVehicleType(vehicle)
  } catch (error) {
    console.error('Error updating vehicle levels:', error)
    throw new Error('Failed to update vehicle levels')
  }
}

// Get vehicle statistics
export async function getVehicleStatistics() {
  try {
    const [allVehicles, activeVehicles, availableVehicles, maintenanceVehicles] = await Promise.all([
      databases.listDocuments(appwriteConfig.database, appwriteConfig.vehicles),
      getVehiclesByStatus('active'),
      getVehiclesByStatus('available'),
      getVehiclesByStatus('maintenance')
    ])
    
    return {
      total: allVehicles.total,
      active: activeVehicles.length,
      available: availableVehicles.length,
      maintenance: maintenanceVehicles.length,
      unavailable: allVehicles.total - activeVehicles.length - availableVehicles.length - maintenanceVehicles.length
    }
  } catch (error) {
    console.error('Error fetching vehicle statistics:', error)
    throw new Error('Failed to fetch vehicle statistics')
  }
}