import { Query } from 'appwrite'
import { appwriteConfig, databases } from '@/libs/appwrite.config'
import { listAllDocuments } from '@/libs/actions/paginate'
import { tripEarnsRevenue, tripRevenue } from '@/libs/actions/reports.actions'

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

    // Every manifest created in the month, paged: a single Query.limit(1000) page was
    // about to cut a busy month short (October has 953) with no error.
    const monthManifests = await listAllDocuments<any>(
      appwriteConfig.manifests,
      [
        Query.greaterThanEqual('$createdAt', startDate),
        Query.lessThanEqual('$createdAt', endDate)
      ],
      'dashboard manifests'
    )

    // Status counts describe the selected month. They used to be all-time totals capped
    // at 1,000, so every month showed the same "delivered" figure.
    const countByStatus = (...statuses: string[]) =>
      monthManifests.filter(manifest => statuses.includes(manifest.status)).length

    const inTransitInMonth = monthManifests.filter(manifest => manifest.status === 'in_transit' || manifest.status === 'in-transit')

    // Calculate total packages from manifests
    let totalPackages = 0
    let deliveredPackagesCount = 0

    monthManifests.forEach(manifest => {
      totalPackages += manifest.packageCount || 0
      deliveredPackagesCount += manifest.deliveredCount || 0
    })

    // Daily deliveries: delivered manifests by the day they were delivered in this month
    // (whichever month they were created in). Falls back to the last update for older
    // rows without a delivery time.
    const deliveredInMonth = await listAllDocuments<any>(
      appwriteConfig.manifests,
      [
        Query.equal('status', ['delivered', 'completed']),
        Query.greaterThanEqual('$updatedAt', startDate)
      ],
      'dashboard delivered manifests'
    )

    const daysInMonth = endOfMonth.getDate()
    const dailyDeliveries = Array(daysInMonth).fill(0)

    deliveredInMonth.forEach(manifest => {
      const deliveredOn = new Date(manifest.deliveryTime || manifest.$updatedAt)

      if (deliveredOn >= startOfMonth && deliveredOn <= endOfMonth) {
        dailyDeliveries[deliveredOn.getDate() - 1] += manifest.deliveredCount || 0
      }
    })

    const result = {
      totalPackages,
      deliveredPackages: deliveredPackagesCount,
      pendingPackages: totalPackages - deliveredPackagesCount,
      inTransitPackages: inTransitInMonth.reduce((acc: number, m: any) => acc + (m.packageCount || 0) - (m.deliveredCount || 0), 0),
      deliveryRate: totalPackages > 0 ? ((deliveredPackagesCount / totalPackages) * 100).toFixed(1) : '0',
      dailyDeliveries,
      dayLabels: Array.from({ length: daysInMonth }, (_, i) => i + 1),
      // Additional manifest-level stats
      totalManifests: monthManifests.length,
      deliveredManifests: countByStatus('delivered', 'completed'),
      pendingManifests: countByStatus('pending', 'loaded'),
      inTransitManifests: inTransitInMonth.length
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

    // The month's trips by trip date, the same field the reports and the Trips page
    // filter on. Filtering on $createdAt put a trip logged a few days late in the wrong
    // month, and emptied every past month when a migration re-stamped the rows.
    const monthTrips = await listAllDocuments<any>(
      appwriteConfig.trips,
      [
        Query.greaterThanEqual('tripDate', startDate),
        Query.lessThanEqual('tripDate', endDate),
        Query.notEqual('status', 'deleted')
      ],
      'dashboard trips'
    )

    const completedCount = monthTrips.filter(trip => trip.status === 'completed').length

    // Get active trips
    const activeTrips = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.trips,
      [
        // The stored value is in_progress; 'in-progress' matched nothing, so Active was always 0
        Query.equal('status', 'in_progress'),
        Query.limit(1)
      ]
    )

    // Same revenue rule as the reports (see tripEarnsRevenue)
    const totalRevenue = monthTrips.filter(tripEarnsRevenue).reduce((sum, trip) => sum + tripRevenue(trip), 0)

    const result = {
      totalTrips: monthTrips.length,
      completedTrips: completedCount,
      activeTrips: activeTrips.total,
      completionRate: monthTrips.length > 0 ? ((completedCount / monthTrips.length) * 100).toFixed(1) : '0',
      totalRevenue
    }

    setCachedData(cacheKey, result)
    return result
  } catch (error) {
    console.error('Error fetching trip statistics:', error)
    return {
      totalTrips: 0,
      completedTrips: 0,
      activeTrips: 0,
      completionRate: '0',
      totalRevenue: 0
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
        Query.limit(200)
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

    // Get trips with driver info for the selected month (by trip date, as above)
    const trips = {
      documents: await listAllDocuments<any>(
        appwriteConfig.trips,
        [
          Query.greaterThanEqual('tripDate', startDate),
          Query.lessThanEqual('tripDate', endDate),
          Query.notEqual('status', 'deleted')
        ],
        'dashboard driver trips'
      )
    }

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
