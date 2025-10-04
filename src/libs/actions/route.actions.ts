// Appwrite Imports
import { databases, tablesDB } from '@/libs/appwrite.config'
import { appwriteConfig } from '@/libs/appwrite.config'
import { ID, Query } from 'appwrite'

// Type Imports
import type { RouteType, RouteFilters, RouteStopType } from '@/types/apps/deliveryTypes'

/**
 * Get all routes with optional filtering
 */
export async function getAllRoutes(filters?: RouteFilters): Promise<RouteType[]> {
  try {
    const queries: string[] = []

    if (filters) {
      if (filters.search) {
        queries.push(Query.search('routeName', filters.search), Query.select(['*', 'intermediateStops.*', 'startLocation.*', 'endLocation.*']))
      }
      if (filters.isActive !== undefined) {
        queries.push(Query.equal('isActive', filters.isActive), Query.select(['*', 'intermediateStops.*', 'startLocation.*', 'endLocation.*']))
      }
      if (filters.startLocation) {
        queries.push(Query.equal('startLocation', filters.startLocation), Query.select(['*', 'intermediateStops.*', 'startLocation.*', 'endLocation.*']))
      }
      if (filters.endLocation) {
        queries.push(Query.equal('endLocation', filters.endLocation), Query.select(['*', 'intermediateStops.*', 'startLocation.*', 'endLocation.*']))
      }
    }

    queries.push(Query.orderDesc('$createdAt'), Query.select(['*', 'intermediateStops.*', 'startLocation.*', 'endLocation.*']))

    const response = await tablesDB.listRows(
      appwriteConfig.database,
      appwriteConfig.routes,
      queries
    )

    return response.rows as unknown as RouteType[]
  } catch (error) {
    console.error('Error fetching routes:', error)
    throw new Error('Failed to fetch routes')
  }
}

/**
 * Get a specific route by ID
 */
export async function getRouteById(routeId: string): Promise<RouteType> {
  try {
    const route = await tablesDB.getRow(
      appwriteConfig.database,
      appwriteConfig.routes,
      routeId,
      [Query.select(['*', 'intermediateStops.*', 'startLocation.*', 'endLocation.*'])]
    )

    return route as unknown as RouteType
  } catch (error) {
    console.error('Error fetching route:', error)
    throw new Error('Failed to fetch route')
  }
}

/**
 * Create a new route
 */
export async function createRoute(
  routeData: Omit<RouteType, '$id' | '$createdAt' | '$updatedAt'>
): Promise<RouteType> {
  try {
    const route = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.routes,
      ID.unique(),
      {
        routeName: routeData.routeName,
        routeCode: routeData.routeCode,
        // Many-to-one relationships: pass as single string
        startLocation: routeData.startLocation,
        endLocation: routeData.endLocation,
        // Many-to-many relationship: pass array of location IDs
        intermediateStops: routeData.intermediateStops && routeData.intermediateStops.length > 0 
          ? routeData.intermediateStops.map(stop => stop.locationId)
          : [],
        distance: routeData.distance || 0,
        estimatedDuration: routeData.estimatedDuration || 0,
        baseRate: routeData.baseRate,
        isActive: routeData.isActive !== undefined ? routeData.isActive : true
      }
    )

    return route as unknown as RouteType
  } catch (error) {
    console.error('Error creating route:', error)
    throw new Error('Failed to create route')
  }
}

/**
 * Update a route
 */
export async function updateRoute(
  routeId: string,
  updateData: Partial<Omit<RouteType, '$id' | '$createdAt' | '$updatedAt'>>
): Promise<RouteType> {
  try {
    const dataToUpdate: any = { ...updateData }
    
    // Many-to-one relationships (startLocation, endLocation): keep as strings
    // They are already strings, no conversion needed
    
    // Many-to-many relationship (intermediateStops): convert to array of IDs
    if (dataToUpdate.intermediateStops && Array.isArray(dataToUpdate.intermediateStops)) {
      dataToUpdate.intermediateStops = dataToUpdate.intermediateStops.map((stop: any) => 
        typeof stop === 'string' ? stop : stop.locationId
      )
    }

    const route = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.routes,
      routeId,
      dataToUpdate
    )

    return route as unknown as RouteType
  } catch (error) {
    console.error('Error updating route:', error)
    throw new Error('Failed to update route')
  }
}

/**
 * Delete a route
 */
export async function deleteRoute(routeId: string): Promise<void> {
  try {
    await databases.deleteDocument(
      appwriteConfig.database,
      appwriteConfig.routes,
      routeId
    )
  } catch (error) {
    console.error('Error deleting route:', error)
    throw new Error('Failed to delete route')
  }
}

/**
 * Get all dropoff locations for a route (including intermediates and end)
 */
export async function getRouteDropoffLocations(routeId: string): Promise<RouteStopType[]> {
  try {
    const route = await getRouteById(routeId)
    const stops: RouteStopType[] = []

    // Process intermediate stops (these are dropoff locations)
    if (route.intermediateStops && route.intermediateStops.length > 0) {
      route.intermediateStops.forEach((stop: any, index: number) => {
        // Handle both populated objects and IDs
        if (typeof stop === 'object' && stop.$id) {
          stops.push({
            locationId: stop.$id,
            locationName: stop.locationName || '',
            address: stop.address || '',
            sequence: index + 1,
            estimatedArrival: stop.estimatedArrival
          })
        } else if (typeof stop === 'string') {
          // If it's just an ID, we'll need to fetch the location details
          // For now, store minimal info
          stops.push({
            locationId: stop,
            locationName: '',
            address: '',
            sequence: index + 1
          })
        } else if (stop.locationId) {
          // If it's already a RouteStopType
          stops.push({
            ...stop,
            sequence: index + 1
          })
        }
      })
    }

    // Add final destination as the last stop
    const endLoc = route.endLocation as any
    if (typeof endLoc === 'object' && endLoc.$id) {
      stops.push({
        locationId: endLoc.$id,
        locationName: endLoc.locationName || route.endLocationName || '',
        address: endLoc.address || '',
        sequence: stops.length + 1
      })
    } else {
      stops.push({
        locationId: typeof endLoc === 'string' ? endLoc : (endLoc?.$id || ''),
        locationName: route.endLocationName || '',
        address: '',
        sequence: stops.length + 1
      })
    }

    return stops
  } catch (error) {
    console.error('Error fetching route dropoff locations:', error)
    throw new Error('Failed to fetch route dropoff locations')
  }
}

/**
 * Toggle route active status
 */
export async function toggleRouteStatus(routeId: string): Promise<RouteType> {
  try {
    const route = await getRouteById(routeId)
    return await updateRoute(routeId, { isActive: !route.isActive })
  } catch (error) {
    console.error('Error toggling route status:', error)
    throw new Error('Failed to toggle route status')
  }
}
