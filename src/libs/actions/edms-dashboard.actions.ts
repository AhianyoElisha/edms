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

    // Get all drivers from users collection
    const drivers = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.users,
      [
        Query.limit(100)
      ]
    )

    // Create driver map for name lookup
    const driverLookup = new Map()
    drivers.documents.forEach((driver: any) => {
      driverLookup.set(driver.$id, {
        name: driver.name || 'Unknown',
        avatar: driver.avatar || `/images/avatars/${Math.floor(Math.random() * 8) + 1}.png`
      })
    })

    // Get trips with driver info for the selected month
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
      // Handle driver as either ID string or object with $id
      const driverId = typeof trip.driver === 'object' ? trip.driver?.$id : trip.driver
      if (!driverId) return

      // Get driver info from lookup
      const driverInfo = driverLookup.get(driverId) || { name: 'Unknown Driver', avatar: '/images/avatars/1.png' }

      if (!driverMap.has(driverId)) {
        driverMap.set(driverId, {
          driverId,
          driverName: typeof trip.driver === 'object' ? trip.driver?.name : driverInfo.name,
          avatar: typeof trip.driver === 'object' ? trip.driver?.avatar : driverInfo.avatar,
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

    // Get all drivers and sort by completed trips
    const topDrivers = Array.from(driverMap.values())
      .sort((a, b) => b.completedTrips - a.completedTrips)
      .map(driver => ({
        ...driver,
        completionRate: driver.totalTrips > 0 ? ((driver.completedTrips / driver.totalTrips) * 100).toFixed(1) : '0',
        avatar: driver.avatar || '/images/avatars/1.png'
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
 */
export async function getRecentActivity(month?: number, year?: number, limit: number = 10) {
  try {
    const now = new Date()
    const currentMonth = month !== undefined ? month : now.getMonth()
    const currentYear = year !== undefined ? year : now.getFullYear()

    const startOfMonth = new Date(currentYear, currentMonth, 1)
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)

    const startDate = startOfMonth.toISOString()
    const endDate = endOfMonth.toISOString()

    // Get recent manifests with status updates
    const recentManifests = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.manifests,
      [
        Query.greaterThanEqual('$updatedAt', startDate),
        Query.lessThanEqual('$updatedAt', endDate),
        Query.orderDesc('$updatedAt'),
        Query.limit(limit)
      ]
    )

    // Transform to DeliveryHistory format for ActivityTimeline
    const activities = recentManifests.documents.map((manifest: any) => ({
      $id: manifest.$id,
      manifestId: manifest.$id,
      manifestNumber: manifest.manifestNumber || 'Unknown',
      status: manifest.status || 'pending',
      location: manifest.destination || 'Unknown location',
      timestamp: manifest.$updatedAt,
      description: `Manifest ${manifest.manifestNumber} - ${(manifest.status || 'pending')?.replace('_', ' ')}`,
      driverName: typeof manifest.trip === 'object' ? manifest.trip?.driver?.name : 'Driver',
      driverId: typeof manifest.trip === 'object' ? manifest.trip?.driver?.$id : null,
      completed: manifest.status === 'delivered' || manifest.status === 'completed',
      $createdAt: manifest.$createdAt,
      $updatedAt: manifest.$updatedAt
    }))

    return activities
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    return []
  }
}

/**
 * Get expense statistics for a given period
 */
export async function getExpenseStatistics(month?: number, year?: number) {
  try {
    const cacheKey = `expense_stats_${month}_${year}`
    const cached = getCachedData(cacheKey)
    if (cached) return cached

    const now = new Date()
    const currentMonth = month !== undefined ? month : now.getMonth()
    const currentYear = year !== undefined ? year : now.getFullYear()

    const startOfMonth = new Date(currentYear, currentMonth, 1)
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)

    const startDate = startOfMonth.toISOString()
    const endDate = endOfMonth.toISOString()

    // Get all expenses for the month
    const expenses = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.expenses,
      [
        Query.greaterThanEqual('expenseDate', startDate),
        Query.lessThanEqual('expenseDate', endDate),
        Query.limit(1000)
      ]
    )

    // Calculate totals
    let totalExpenses = 0
    const expensesByCategory: Record<string, number> = {}

    expenses.documents.forEach((expense: any) => {
      const amount = expense.amount || 0
      totalExpenses += amount
      
      const category = expense.expenseType || 'other'
      expensesByCategory[category] = (expensesByCategory[category] || 0) + amount
    })

    const result = {
      totalExpenses,
      expenseCount: expenses.total,
      expensesByCategory,
      averageExpense: expenses.total > 0 ? totalExpenses / expenses.total : 0
    }

    setCachedData(cacheKey, result)
    return result
  } catch (error) {
    console.error('Error fetching expense statistics:', error)
    return {
      totalExpenses: 0,
      expenseCount: 0,
      expensesByCategory: {},
      averageExpense: 0
    }
  }
}

/**
 * Get return waybill statistics
 */
export async function getReturnWaybillStatistics(month?: number, year?: number) {
  try {
    const cacheKey = `return_stats_${month}_${year}`
    const cached = getCachedData(cacheKey)
    if (cached) return cached

    const now = new Date()
    const currentMonth = month !== undefined ? month : now.getMonth()
    const currentYear = year !== undefined ? year : now.getFullYear()

    const startOfMonth = new Date(currentYear, currentMonth, 1)
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)

    const startDate = startOfMonth.toISOString()
    const endDate = endOfMonth.toISOString()

    // Get all return waybills for the month
    const returns = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.returnwaybills,
      [
        Query.greaterThanEqual('$createdAt', startDate),
        Query.lessThanEqual('$createdAt', endDate),
        Query.limit(1000)
      ]
    )

    // Calculate by status
    let pendingReturns = 0
    let inTransitReturns = 0
    let deliveredReturns = 0
    let processedReturns = 0
    let totalPackagesReturned = 0

    returns.documents.forEach((ret: any) => {
      const status = ret.status
      if (status === 'pending') pendingReturns++
      else if (status === 'in_transit') inTransitReturns++
      else if (status === 'delivered') deliveredReturns++
      else if (status === 'processed') processedReturns++
      
      totalPackagesReturned += ret.packageCount || 0
    })

    const result = {
      totalReturns: returns.total,
      pendingReturns,
      inTransitReturns,
      deliveredReturns,
      processedReturns,
      totalPackagesReturned
    }

    setCachedData(cacheKey, result)
    return result
  } catch (error) {
    console.error('Error fetching return waybill statistics:', error)
    return {
      totalReturns: 0,
      pendingReturns: 0,
      inTransitReturns: 0,
      deliveredReturns: 0,
      processedReturns: 0,
      totalPackagesReturned: 0
    }
  }
}

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
      recentActivity,
      expenseStats,
      returnStats
    ] = await Promise.all([
      getPackageStatistics(month, year),
      getTripStatistics(month, year),
      getDriverPerformance(month, year),
      getRouteStatistics(),
      getVehicleStatistics(),
      getRecentActivity(month, year, 10),
      getExpenseStatistics(month, year),
      getReturnWaybillStatistics(month, year)
    ])

    return {
      packageStats,
      tripStats,
      driverPerformance,
      routeStats,
      vehicleStats,
      recentActivity,
      expenseStats,
      returnStats
    }
  } catch (error) {
    console.error('Error fetching EDMS dashboard data:', error)
    return undefined
  }
}
