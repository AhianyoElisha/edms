import { Query } from 'appwrite'
import { appwriteConfig, databases } from '@/libs/appwrite.config'

// Cache for dashboard data
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

function getCachedData(key: string): any | null {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  return null
}

function setCachedData(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() })
}

/**
 * Get manifest statistics for a given period
 * Previously was getPackageStatistics - now uses manifests with packageCount/deliveredCount
 */
export async function getPackageStatistics(month?: number, year?: number) {
  try {
    const cacheKey = `manifest_stats_${month}_${year}`
    const cached = getCachedData(cacheKey)
    if (cached) return cached

    const now = new Date()
    const currentMonth = month !== undefined ? month : now.getMonth()
    const currentYear = year !== undefined ? year : now.getFullYear()

    const startOfMonth = new Date(currentYear, currentMonth, 1)
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)

    const startDate = startOfMonth.toISOString()
    const endDate = endOfMonth.toISOString()

    // Get all manifests for the month
    const allManifests = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.manifests,
      [
        Query.greaterThanEqual('$createdAt', startDate),
        Query.lessThanEqual('$createdAt', endDate),
        Query.limit(1000)
      ]
    )

    // Get delivered manifests
    const deliveredManifests = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.manifests,
      [
        Query.equal('status', 'delivered'),
        Query.limit(1000)
      ]
    )

    // Get pending manifests (status = pending or loaded)
    const pendingManifests = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.manifests,
      [
        Query.contains('status', ['pending', 'loaded']),
        Query.limit(1000)
      ]
    )

    // Get in-transit manifests
    const inTransitManifests = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.manifests,
      [
        Query.equal('status', 'in-transit'),
        Query.limit(1000)
      ]
    )

    // Calculate total packages from manifests
    let totalPackages = 0
    let deliveredPackagesCount = 0
    
    allManifests.documents.forEach((manifest: any) => {
      totalPackages += manifest.packageCount || 0
      deliveredPackagesCount += manifest.deliveredCount || 0
    })

    // Calculate daily delivery data from delivered manifests
    const daysInMonth = endOfMonth.getDate()
    const dailyDeliveries = Array(daysInMonth).fill(0)

    deliveredManifests.documents.forEach((manifest: any) => {
      if (manifest.$updatedAt) {
        const deliveryDay = new Date(manifest.$updatedAt).getDate()
        const monthOfDelivery = new Date(manifest.$updatedAt).getMonth()
        if (monthOfDelivery === currentMonth) {
          dailyDeliveries[deliveryDay - 1] += manifest.deliveredCount || 0
        }
      }
    })

    const result = {
      totalPackages,
      deliveredPackages: deliveredPackagesCount,
      pendingPackages: totalPackages - deliveredPackagesCount,
      inTransitPackages: inTransitManifests.documents.reduce((acc: number, m: any) => acc + (m.packageCount || 0) - (m.deliveredCount || 0), 0),
      deliveryRate: totalPackages > 0 ? ((deliveredPackagesCount / totalPackages) * 100).toFixed(1) : '0',
      dailyDeliveries,
      dayLabels: Array.from({ length: daysInMonth }, (_, i) => i + 1),
      // Additional manifest-level stats
      totalManifests: allManifests.total,
      deliveredManifests: deliveredManifests.total,
      pendingManifests: pendingManifests.total,
      inTransitManifests: inTransitManifests.total
    }

    setCachedData(cacheKey, result)
    return result
  } catch (error) {
    console.error('Error fetching manifest/package statistics:', error)
    return {
      totalPackages: 0,
      deliveredPackages: 0,
      pendingPackages: 0,
      inTransitPackages: 0,
      deliveryRate: '0',
      dailyDeliveries: [],
      dayLabels: [],
      totalManifests: 0,
      deliveredManifests: 0,
      pendingManifests: 0,
      inTransitManifests: 0
    }
  }
}

/**
 * Get trip statistics
 */
export async function getTripStatistics(month?: number, year?: number) {
  try {
    const cacheKey = `trip_stats_${month}_${year}`
    const cached = getCachedData(cacheKey)
    if (cached) return cached

    const now = new Date()
    const currentMonth = month !== undefined ? month : now.getMonth()
    const currentYear = year !== undefined ? year : now.getFullYear()

    const startOfMonth = new Date(currentYear, currentMonth, 1)
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)

    const startDate = startOfMonth.toISOString()
    const endDate = endOfMonth.toISOString()

    // Get all trips
    const allTrips = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.trips,
      [
        Query.greaterThanEqual('$createdAt', startDate),
        Query.lessThanEqual('$createdAt', endDate),
        Query.limit(1000)
      ]
    )

    // Get completed trips
    const completedTrips = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.trips,
      [
        Query.equal('status', 'completed'),
        Query.greaterThanEqual('$createdAt', startDate),
        Query.lessThanEqual('$createdAt', endDate),
        Query.limit(1000)
      ]
    )

    // Get active trips
    const activeTrips = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.trips,
      [
        Query.equal('status', 'in-progress'),
        Query.limit(1000)
      ]
    )

    const result = {
      totalTrips: allTrips.total,
      completedTrips: completedTrips.total,
      activeTrips: activeTrips.total,
      completionRate: allTrips.total > 0 ? ((completedTrips.total / allTrips.total) * 100).toFixed(1) : '0'
    }

    setCachedData(cacheKey, result)
    return result
  } catch (error) {
    console.error('Error fetching trip statistics:', error)
    return {
      totalTrips: 0,
      completedTrips: 0,
      activeTrips: 0,
      completionRate: '0'
    }
  }
}

/**
 * Get driver performance data
 */
export async function getDriverPerformance(month?: number, year?: number) {
  try {
    const cacheKey = `driver_performance_${month}_${year}`
    const cached = getCachedData(cacheKey)
    if (cached) return cached

    const now = new Date()
    const currentMonth = month !== undefined ? month : now.getMonth()
    const currentYear = year !== undefined ? year : now.getFullYear()

    const startOfMonth = new Date(currentYear, currentMonth, 1)
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)

    const startDate = startOfMonth.toISOString()
    const endDate = endOfMonth.toISOString()

    // Get all drivers
    const drivers = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.users,
      [
        Query.limit(100)
      ]
    )

    // Get trips with driver info
    const trips = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.trips,
      [
        Query.greaterThanEqual('$createdAt', startDate),
        Query.lessThanEqual('$createdAt', endDate),
        Query.limit(1000)
      ]
    )

    // Calculate driver performance
    const driverMap = new Map()

    trips.documents.forEach((trip: any) => {
      const driverId = trip.driver
      if (!driverId) return

      if (!driverMap.has(driverId)) {
        driverMap.set(driverId, {
          driverId,
          driverName: 'Driver',
          totalTrips: 0,
          completedTrips: 0,
          deliveredPackages: 0
        })
      }

      const driverData = driverMap.get(driverId)
      driverData.totalTrips++
      if (trip.status === 'completed') {
        driverData.completedTrips++
      }
    })

    // Get top 2 drivers
    const topDrivers = Array.from(driverMap.values())
      .sort((a, b) => b.completedTrips - a.completedTrips)
      .slice(0, 2)
      .map(driver => ({
        ...driver,
        completionRate: driver.totalTrips > 0 ? ((driver.completedTrips / driver.totalTrips) * 100).toFixed(1) : '0',
        avatar: '/images/avatars/1.png'
      }))

    const result = {
      topDrivers,
      totalDrivers: drivers.total
    }

    setCachedData(cacheKey, result)
    return result
  } catch (error) {
    console.error('Error fetching driver performance:', error)
    return {
      topDrivers: [],
      totalDrivers: 0
    }
  }
}

/**
 * Get route statistics
 */
export async function getRouteStatistics() {
  try {
    const cacheKey = 'route_stats'
    const cached = getCachedData(cacheKey)
    if (cached) return cached

    const routes = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.routes,
      [Query.limit(1000)]
    )

    const activeRoutes = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.routes,
      [
        Query.equal('status', 'active'),
        Query.limit(1000)
      ]
    )

    const result = {
      totalRoutes: routes.total,
      activeRoutes: activeRoutes.total
    }

    setCachedData(cacheKey, result)
    return result
  } catch (error) {
    console.error('Error fetching route statistics:', error)
    return {
      totalRoutes: 0,
      activeRoutes: 0
    }
  }
}

/**
 * Get vehicle statistics
 */
export async function getVehicleStatistics() {
  try {
    const cacheKey = 'vehicle_stats'
    const cached = getCachedData(cacheKey)
    if (cached) return cached

    const vehicles = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.vehicles,
      [Query.limit(1000)]
    )

    const activeVehicles = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.vehicles,
      [
        Query.equal('status', 'active'),
        Query.limit(1000)
      ]
    )

    const result = {
      totalVehicles: vehicles.total,
      activeVehicles: activeVehicles.total,
      maintenanceVehicles: vehicles.total - activeVehicles.total
    }

    setCachedData(cacheKey, result)
    return result
  } catch (error) {
    console.error('Error fetching vehicle statistics:', error)
    return {
      totalVehicles: 0,
      activeVehicles: 0,
      maintenanceVehicles: 0
    }
  }
}

/**
 * Get recent activity (recent packages, trips, etc.)
/**
 * Get all EDMS dashboard data
 */
export async function getEDMSDashboardData(month?: number, year?: number) {
  try {
    const [
      packageStats,
      tripStats,
      driverPerformance,
      routeStats,
      vehicleStats,
      // recentActivity
    ] = await Promise.all([
      getPackageStatistics(month, year),
      getTripStatistics(month, year),
      getDriverPerformance(month, year),
      getRouteStatistics(),
      getVehicleStatistics(),
      // getRecentActivity(10)
    ])

    return {
      packageStats,
      tripStats,
      driverPerformance,
      routeStats,
      vehicleStats,
      // recentActivity
    }
  } catch (error) {
    console.error('Error fetching EDMS dashboard data:', error)
    return undefined
  }
}
