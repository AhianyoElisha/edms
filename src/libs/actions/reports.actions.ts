// Reports Actions for EDMS
// Provides data fetching for operational and financial reports

import { Query } from 'appwrite'
import { appwriteConfig, databases, tablesDB } from '@/libs/appwrite.config'
import { listTripsForInvoiceMonth } from './tripMonth.actions'
import { getAllExpenses } from './expense.actions'

/**
 * Which trips count towards revenue, shared with the dashboard (edms-dashboard.actions).
 *
 * A trip earns its price once it is booked, unless it was cancelled or deleted. The
 * reports used to count only `completed` trips, but most trips are never moved to
 * that status (about 1 in 10 are), so the Revenue and Profitability reports showed a
 * fraction of what the dashboard did and a margin of -4245%.
 */
export const tripEarnsRevenue = (trip: any) => trip.status !== 'cancelled' && trip.status !== 'deleted'

export const tripRevenue = (trip: any) => Number(trip.tripCost) || Number(trip.clientRate) || 0

/**
 * A month's trips, in the shape the old one-page queries returned. Trips are counted
 * in their invoice month: one moved to a later month's invoice leaves this month.
 */
const monthTrips = async (month: number, year: number, api: 'rows' | 'documents') => {
  const rows = await listTripsForInvoiceMonth<any>(month, year, api)

  return { rows, documents: rows, total: rows.length }
}

// ============================================
// OPERATIONAL REPORTS
// ============================================

/**
 * Get daily operations report data
 */
export async function getDailyOperationsReport(date?: string) {
  try {
    const targetDate = date ? new Date(date) : new Date()
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0)).toISOString()
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999)).toISOString()

    // Get trips for the day
    const trips = await tablesDB.listRows(
      appwriteConfig.database,
      appwriteConfig.trips,
      [
        Query.greaterThanEqual('tripDate', startOfDay),
        Query.lessThanEqual('tripDate', endOfDay),
        Query.select(['*', 'vehicle.*', 'driver.*', 'route.*']),
        Query.notEqual('status', 'deleted'),
        Query.limit(100)
      ]
    )

    // Get manifests for the day
    const manifests = await tablesDB.listRows(
      appwriteConfig.database,
      appwriteConfig.manifests,
      [
        Query.greaterThanEqual('$createdAt', startOfDay),
        Query.lessThanEqual('$createdAt', endOfDay),
        Query.limit(500)
      ]
    )

    // Get expenses for the day
    const expenses = await tablesDB.listRows(
      appwriteConfig.database,
      appwriteConfig.expenses,
      [
        Query.greaterThanEqual('expenseDate', startOfDay),
        Query.lessThanEqual('expenseDate', endOfDay),
        Query.select(['*', 'tripId.*', 'vehicleId.*']),
        Query.limit(500)
      ]
    )

    // Calculate statistics
    const totalTrips = trips.total
    const completedTrips = trips.rows.filter((t: any) => t.status === 'completed').length
    const inProgressTrips = trips.rows.filter((t: any) => t.status === 'in_progress').length
    const cancelledTrips = trips.rows.filter((t: any) => t.status === 'cancelled').length

    const totalManifests = manifests.total
    const deliveredManifests = manifests.rows.filter((m: any) => m.status === 'delivered').length
    
    // Package counts from manifests
    const totalPackages = manifests.rows.reduce((sum: number, m: any) => sum + (m.packageCount || 0), 0)
    const deliveredPackages = manifests.rows.reduce((sum: number, m: any) => sum + (m.deliveredCount || 0), 0)
    const totalExpenses = expenses.rows.reduce((sum: number, e: any) => sum + (e.amount || 0), 0)

    // Get unique drivers and vehicles
    const uniqueDrivers = new Set(trips.rows.map((t: any) => t.driver).filter(Boolean))
    const uniqueVehicles = new Set(trips.rows.map((t: any) => t.vehicle).filter(Boolean))

    return {
      date: targetDate.toISOString().split('T')[0],
      trips: {
        total: totalTrips,
        completed: completedTrips,
        inProgress: inProgressTrips,
        cancelled: cancelledTrips,
        completionRate: totalTrips > 0 ? ((completedTrips / totalTrips) * 100).toFixed(1) : '0',
        list: trips.rows
      },
      manifests: {
        total: totalManifests,
        delivered: deliveredManifests,
        pending: totalManifests - deliveredManifests,
        list: manifests.rows
      },
      packages: {
        total: totalPackages,
        delivered: deliveredPackages,
        pending: totalPackages - deliveredPackages,
        deliveryRate: totalPackages > 0 ? ((deliveredPackages / totalPackages) * 100).toFixed(1) : '0'
      },
      expenses: {
        total: totalExpenses,
        count: expenses.total,
        list: expenses.rows
      },
      resources: {
        driversActive: uniqueDrivers.size,
        vehiclesActive: uniqueVehicles.size
      }
    }
  } catch (error) {
    console.error('Error fetching daily operations report:', error)
    throw new Error('Failed to fetch daily operations report')
  }
}

/**
 * Get delivery performance report
 */
export async function getDeliveryPerformanceReport(month?: number, year?: number) {
  try {
    const now = new Date()
    const currentMonth = month !== undefined ? month : now.getMonth()
    const currentYear = year !== undefined ? year : now.getFullYear()

    const startOfMonth = new Date(currentYear, currentMonth, 1)
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)

    const startDate = startOfMonth.toISOString()
    const endDate = endOfMonth.toISOString()

    // Get all trips for the month
    const trips = await monthTrips(currentMonth, currentYear, 'rows')

    // Get all manifests for the month
    const manifests = await tablesDB.listRows(
      appwriteConfig.database,
      appwriteConfig.manifests,
      [
        Query.greaterThanEqual('$createdAt', startDate),
        Query.lessThanEqual('$createdAt', endDate),
        Query.limit(2000)
      ]
    )

    // Calculate daily delivery data
    const daysInMonth = endOfMonth.getDate()
    const dailyStats = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      trips: 0,
      completedTrips: 0,
      manifests: 0,
      deliveredManifests: 0,
      packages: 0,
      deliveredPackages: 0
    }))

    // Aggregate trip data by day
    trips.rows.forEach((trip: any) => {
      // A trip brought in from another month has no day of its own here; it goes on the 1st
      const tripDate = new Date(trip.tripDate)
      const tripDay = tripDate.getMonth() === currentMonth && tripDate.getFullYear() === currentYear ? tripDate.getDate() - 1 : 0
      if (tripDay >= 0 && tripDay < daysInMonth) {
        dailyStats[tripDay].trips++
        if (trip.status === 'completed') {
          dailyStats[tripDay].completedTrips++
        }
      }
    })

    // Aggregate manifest data by day
    manifests.rows.forEach((manifest: any) => {
      const manifestDay = new Date(manifest.$createdAt).getDate() - 1
      if (manifestDay >= 0 && manifestDay < daysInMonth) {
        dailyStats[manifestDay].manifests++
        dailyStats[manifestDay].packages += manifest.packageCount || 0
        if (manifest.status === 'delivered') {
          dailyStats[manifestDay].deliveredManifests++
          dailyStats[manifestDay].deliveredPackages += manifest.deliveredCount || 0
        }
      }
    })

    // Calculate totals
    const totalTrips = trips.total
    const completedTrips = trips.rows.filter((t: any) => t.status === 'completed').length
    const totalManifests = manifests.total
    const deliveredManifests = manifests.rows.filter((m: any) => m.status === 'delivered').length
    const totalPackages = manifests.rows.reduce((sum: number, m: any) => sum + (m.packageCount || 0), 0)
    const deliveredPackages = manifests.rows.reduce((sum: number, m: any) => sum + (m.deliveredCount || 0), 0)
    return {
      period: {
        month: currentMonth,
        year: currentYear,
        monthName: startOfMonth.toLocaleString('default', { month: 'long' })
      },
      summary: {
        totalTrips,
        completedTrips,
        tripCompletionRate: totalTrips > 0 ? ((completedTrips / totalTrips) * 100).toFixed(1) : '0',
        totalManifests,
        deliveredManifests,
        manifestDeliveryRate: totalManifests > 0 ? ((deliveredManifests / totalManifests) * 100).toFixed(1) : '0',
        totalPackages,
        deliveredPackages,
        packageDeliveryRate: totalPackages > 0 ? ((deliveredPackages / totalPackages) * 100).toFixed(1) : '0'
      },
      dailyStats,
      chartData: {
        labels: dailyStats.map(d => d.day.toString()),
        trips: dailyStats.map(d => d.completedTrips),
        deliveries: dailyStats.map(d => d.deliveredPackages)
      }
    }
  } catch (error) {
    console.error('Error fetching delivery performance report:', error)
    throw new Error('Failed to fetch delivery performance report')
  }
}

/**
 * Get driver performance report
 */
export async function getDriverPerformanceReport(month?: number, year?: number) {
  try {
    const now = new Date()
    const currentMonth = month !== undefined ? month : now.getMonth()
    const currentYear = year !== undefined ? year : now.getFullYear()

    const startOfMonth = new Date(currentYear, currentMonth, 1)
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)

    const startDate = startOfMonth.toISOString()
    const endDate = endOfMonth.toISOString()

    // Get all users (drivers)
    const users = await tablesDB.listRows(
      appwriteConfig.database,
      appwriteConfig.users,
      [Query.limit(500)]
    )

    // Get all trips for the month
    const trips = await monthTrips(currentMonth, currentYear, 'rows')

    // The month's expenses, each with the driver it was for where that is known
    // (saved on the expense, or whoever had the vehicle on the expense date)
    const expenses = await getAllExpenses({ dateRange: { start: startDate, end: endDate } })

    // Build driver map
    const driverMap = new Map<string, any>()
    
    // Initialize with all users
    users.rows.forEach((user: any) => {
      driverMap.set(user.$id, {
        driverId: user.$id,
        driverName: user.name || user.email || 'Unknown',
        email: user.email,
        avatar: user.avatar || '/images/avatars/1.png',
        totalTrips: 0,
        completedTrips: 0,
        cancelledTrips: 0,
        totalExpenses: 0,
        totalRevenue: 0,
        totalDistance: 0,
        onTimeDeliveries: 0,
        lateDeliveries: 0
      })
    })

    // Aggregate trip data by driver
    trips.rows.forEach((trip: any) => {
      const driverId = trip.driver
      if (driverId && driverMap.has(driverId)) {
        const driver = driverMap.get(driverId)
        driver.totalTrips++
        if (trip.status === 'completed') {
          driver.completedTrips++
        }
        if (tripEarnsRevenue(trip)) {
          driver.totalRevenue += tripRevenue(trip)
        }
        if (trip.status === 'cancelled') {
          driver.cancelledTrips++
        }
        driver.totalDistance += trip.distanceTraveled || 0
      }
    })

    // Put each expense against its driver. Most expenses are not linked to a vehicle
    // or a trip - the office types the driver's name into the description - so when
    // there is no link, a description naming exactly one driver counts for that driver.
    const driverNames = users.rows
      .filter((user: any) => user.status !== 'deleted')
      .map((user: any) => ({
        id: user.$id,
        words: String(user.name || '').toLowerCase().split(/[^a-z]+/).filter((word: string) => word.length >= 3 && word !== 'driver')
      }))
      .filter((entry: { words: string[] }) => entry.words.length > 0)

    const driverNamedIn = (text: string) => {
      const lower = text.toLowerCase()
      const hits = driverNames.filter((entry: { words: string[] }) => entry.words.every(word => lower.includes(word)))

      if (hits.length === 0) return null

      // "Richard Mensah" beats "Mensah": the fuller name is the better match
      const most = Math.max(...hits.map((entry: { words: string[] }) => entry.words.length))
      const best = hits.filter((entry: { words: string[] }) => entry.words.length === most)

      return best.length === 1 ? best[0].id : null
    }

    let unassignedExpenses = 0
    let unassignedExpenseCount = 0

    expenses.forEach(expense => {
      const amount = expense.amount || 0
      const driverId = (expense.driverId && driverMap.has(expense.driverId) ? expense.driverId : null) || driverNamedIn(expense.description || '')

      if (driverId && driverMap.has(driverId)) {
        driverMap.get(driverId).totalExpenses += amount
      } else {
        unassignedExpenses += amount
        unassignedExpenseCount++
      }
    })

    // Convert to array and calculate rates
    const driverPerformance = Array.from(driverMap.values())
      .filter(d => d.totalTrips > 0 || d.totalExpenses > 0) // Drivers with trips, or with expenses against them
      .map(driver => ({
        ...driver,
        completionRate: driver.totalTrips > 0 ? ((driver.completedTrips / driver.totalTrips) * 100).toFixed(1) : '0',
        profit: driver.totalRevenue - driver.totalExpenses,
        avgRevenuePerTrip: driver.totalTrips - driver.cancelledTrips > 0 ? (driver.totalRevenue / (driver.totalTrips - driver.cancelledTrips)).toFixed(2) : '0',
        avgExpensePerTrip: driver.totalTrips > 0 ? (driver.totalExpenses / driver.totalTrips).toFixed(2) : '0'
      }))
      .sort((a, b) => b.completedTrips - a.completedTrips)

    return {
      period: {
        month: currentMonth,
        year: currentYear,
        monthName: startOfMonth.toLocaleString('default', { month: 'long' })
      },
      totalDrivers: driverPerformance.length,
      drivers: driverPerformance,
      topPerformers: driverPerformance.slice(0, 5),
      summary: {
        totalTrips: trips.total,
        completedTrips: trips.rows.filter((t: any) => t.status === 'completed').length,
        totalRevenue: driverPerformance.reduce((sum, d) => sum + d.totalRevenue, 0),
        totalExpenses: driverPerformance.reduce((sum, d) => sum + d.totalExpenses, 0),

        // Expenses in the month that name no driver (office costs, or a description without a name)
        unassignedExpenses,
        unassignedExpenseCount
      }
    }
  } catch (error) {
    console.error('Error fetching driver performance report:', error)
    throw new Error('Failed to fetch driver performance report')
  }
}

/**
 * Get route analysis report
 */
export async function getRouteAnalysisReport(month?: number, year?: number) {
  try {
    const now = new Date()
    const currentMonth = month !== undefined ? month : now.getMonth()
    const currentYear = year !== undefined ? year : now.getFullYear()

    const startOfMonth = new Date(currentYear, currentMonth, 1)
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)

    const startDate = startOfMonth.toISOString()
    const endDate = endOfMonth.toISOString()

    // Get all routes
    const routes = await tablesDB.listRows(
      appwriteConfig.database,
      appwriteConfig.routes,
      [
        Query.limit(500),
        Query.select(['*', 'startLocation.*', 'endLocation.*']) 
      ]
    )

    // Get all trips for the month
    const trips = await monthTrips(currentMonth, currentYear, 'rows')

    // Get rate cards
    const rateCards = await tablesDB.listRows(
      appwriteConfig.database,
      appwriteConfig.ratecards,
      [Query.limit(500)]
    )

    // Build route map
    const routeMap = new Map<string, any>()
    
    routes.rows.forEach((route: any) => {
      const rateCard = rateCards.rows.find((rc: any) => rc.routeId === route.$id)
      routeMap.set(route.$id, {
        routeId: route.$id,
        routeName: route.routeName || 'Unknown Route',
        origin: route.startLocation.locationName,
        destination: route.endLocation.locationName,
        distance: route.distance || 0,
        status: route.status,
        baseRate: rateCard?.baseRate || 0,
        totalTrips: 0,
        completedTrips: 0,
        totalRevenue: 0,
        totalExpenses: 0,
        totalPackages: 0,
        deliveredPackages: 0
      })
    })

    // Aggregate trip data by route
    trips.rows.forEach((trip: any) => {
      const routeId = trip.route
      if (routeId && routeMap.has(routeId)) {
        const route = routeMap.get(routeId)
        route.totalTrips++
        if (trip.status === 'completed') {
          route.completedTrips++
        }
        if (tripEarnsRevenue(trip)) {
          route.revenueTrips = (route.revenueTrips || 0) + 1
          route.totalRevenue += tripRevenue(trip)
        }
      }
    })

    // Convert to array and calculate metrics
    const routeAnalysis = Array.from(routeMap.values())
      .map(route => ({
        ...route,
        completionRate: route.totalTrips > 0 ? ((route.completedTrips / route.totalTrips) * 100).toFixed(1) : '0',
        profit: route.totalRevenue - route.totalExpenses,
        avgRevenuePerTrip: route.revenueTrips > 0 ? (route.totalRevenue / route.revenueTrips).toFixed(2) : '0',
        utilizationScore: route.totalTrips > 0 ? Math.min(100, route.totalTrips * 10) : 0
      }))
      .sort((a, b) => b.totalTrips - a.totalTrips)

    return {
      period: {
        month: currentMonth,
        year: currentYear,
        monthName: startOfMonth.toLocaleString('default', { month: 'long' })
      },
      totalRoutes: routes.total,
      activeRoutes: routes.rows.filter((r: any) => r.status === 'active').length,
      routes: routeAnalysis,
      topRoutes: routeAnalysis.slice(0, 10),
      summary: {
        totalTrips: trips.total,
        totalRevenue: routeAnalysis.reduce((sum, r) => sum + r.totalRevenue, 0),
        avgTripsPerRoute: routeAnalysis.length > 0 ? (trips.total / routeAnalysis.length).toFixed(1) : '0'
      }
    }
  } catch (error) {
    console.error('Error fetching route analysis report:', error)
    throw new Error('Failed to fetch route analysis report')
  }
}

// ============================================
// FINANCIAL REPORTS
// ============================================

/**
 * Get revenue report
 */
export async function getRevenueReport(month?: number, year?: number) {
  try {
    const now = new Date()
    const currentMonth = month !== undefined ? month : now.getMonth()
    const currentYear = year !== undefined ? year : now.getFullYear()

    const startOfMonth = new Date(currentYear, currentMonth, 1)
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)

    const startDate = startOfMonth.toISOString()
    const endDate = endOfMonth.toISOString()

    // Get the month's trips
    const trips = await monthTrips(currentMonth, currentYear, 'documents')

    // Calculate daily revenue
    const daysInMonth = endOfMonth.getDate()
    const dailyRevenue = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      revenue: 0,
      trips: 0
    }))

    let totalRevenue = 0
    let totalTrips = 0
    let paidRevenue = 0
    let pendingRevenue = 0

    // The total, the daily chart and last month's figure all use the same rule, so they add up
    trips.documents.forEach((trip: any) => {
      if (!tripEarnsRevenue(trip)) return

      const tripDay = new Date(trip.tripDate).getDate() - 1
      const revenue = tripRevenue(trip)

      if (tripDay >= 0 && tripDay < daysInMonth) {
        dailyRevenue[tripDay].revenue += revenue
        dailyRevenue[tripDay].trips++
      }

      totalRevenue += revenue
      totalTrips++

      if (trip.paymentStatus === 'paid') {
        paidRevenue += revenue
      } else {
        pendingRevenue += revenue
      }
    })

    // Get previous month for comparison
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
    const prevStartOfMonth = new Date(prevYear, prevMonth, 1)
    const prevEndOfMonth = new Date(prevYear, prevMonth + 1, 0, 23, 59, 59, 999)

    const prevTrips = await monthTrips(prevMonth, prevYear, 'documents')

    const prevRevenue = prevTrips.documents.filter(tripEarnsRevenue).reduce((sum: number, t: any) => sum + tripRevenue(t), 0)
    const revenueChange = prevRevenue > 0 ? (((totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : '0'

    return {
      period: {
        month: currentMonth,
        year: currentYear,
        monthName: startOfMonth.toLocaleString('default', { month: 'long' })
      },
      summary: {
        totalRevenue,
        totalTrips,
        paidRevenue,
        pendingRevenue,
        avgRevenuePerTrip: totalTrips > 0 ? (totalRevenue / totalTrips).toFixed(2) : '0',
        collectionRate: totalRevenue > 0 ? ((paidRevenue / totalRevenue) * 100).toFixed(1) : '0'
      },
      comparison: {
        previousMonth: prevRevenue,
        change: parseFloat(revenueChange),
        trend: parseFloat(revenueChange) >= 0 ? 'up' : 'down'
      },
      dailyRevenue,
      chartData: {
        labels: dailyRevenue.map(d => d.day.toString()),
        revenue: dailyRevenue.map(d => d.revenue)
      }
    }
  } catch (error) {
    console.error('Error fetching revenue report:', error)
    throw new Error('Failed to fetch revenue report')
  }
}

/**
 * Get expense report
 */
export async function getExpenseReport(month?: number, year?: number) {
  try {
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
        Query.limit(2000)
      ]
    )

    // Calculate daily expenses
    const daysInMonth = endOfMonth.getDate()
    const dailyExpenses = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      amount: 0,
      count: 0
    }))

    // Group by category
    const categoryTotals: Record<string, { amount: number; count: number }> = {}

    let totalExpenses = 0
    let paidExpenses = 0
    let pendingExpenses = 0

    expenses.documents.forEach((expense: any) => {
      const expenseDay = new Date(expense.expenseDate).getDate() - 1
      const amount = expense.amount || 0
      const category = expense.expenseType || 'other'

      if (expenseDay >= 0 && expenseDay < daysInMonth) {
        dailyExpenses[expenseDay].amount += amount
        dailyExpenses[expenseDay].count++
      }

      totalExpenses += amount
      
      if (expense.paymentStatus === 'paid') {
        paidExpenses += amount
      } else {
        pendingExpenses += amount
      }

      if (!categoryTotals[category]) {
        categoryTotals[category] = { amount: 0, count: 0 }
      }
      categoryTotals[category].amount += amount
      categoryTotals[category].count++
    })

    // Convert category totals to array
    const byCategory = Object.entries(categoryTotals)
      .map(([category, data]) => ({
        category,
        ...data,
        percentage: totalExpenses > 0 ? ((data.amount / totalExpenses) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.amount - a.amount)

    // Get previous month for comparison
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
    const prevStartOfMonth = new Date(prevYear, prevMonth, 1)
    const prevEndOfMonth = new Date(prevYear, prevMonth + 1, 0, 23, 59, 59, 999)

    const prevExpenses = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.expenses,
      [
        Query.greaterThanEqual('expenseDate', prevStartOfMonth.toISOString()),
        Query.lessThanEqual('expenseDate', prevEndOfMonth.toISOString()),
        Query.limit(2000)
      ]
    )

    const prevTotal = prevExpenses.documents.reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
    const expenseChange = prevTotal > 0 ? (((totalExpenses - prevTotal) / prevTotal) * 100).toFixed(1) : '0'

    return {
      period: {
        month: currentMonth,
        year: currentYear,
        monthName: startOfMonth.toLocaleString('default', { month: 'long' })
      },
      summary: {
        totalExpenses,
        expenseCount: expenses.total,
        paidExpenses,
        pendingExpenses,
        avgExpense: expenses.total > 0 ? (totalExpenses / expenses.total).toFixed(2) : '0'
      },
      comparison: {
        previousMonth: prevTotal,
        change: parseFloat(expenseChange),
        trend: parseFloat(expenseChange) <= 0 ? 'up' : 'down' // Lower expenses is better
      },
      byCategory,
      dailyExpenses,
      chartData: {
        labels: dailyExpenses.map(d => d.day.toString()),
        expenses: dailyExpenses.map(d => d.amount),
        categoryLabels: byCategory.map(c => c.category),
        categoryAmounts: byCategory.map(c => c.amount)
      },
      recentExpenses: expenses.documents.slice(0, 10)
    }
  } catch (error) {
    console.error('Error fetching expense report:', error)
    throw new Error('Failed to fetch expense report')
  }
}

/**
 * Get profitability analysis report
 */
export async function getProfitabilityReport(month?: number, year?: number) {
  try {
    const now = new Date()
    const currentMonth = month !== undefined ? month : now.getMonth()
    const currentYear = year !== undefined ? year : now.getFullYear()

    // Get revenue and expense data
    const [revenueData, expenseData] = await Promise.all([
      getRevenueReport(month, year),
      getExpenseReport(month, year)
    ])

    const totalRevenue = revenueData.summary.totalRevenue
    const totalExpenses = expenseData.summary.totalExpenses
    const grossProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0'

    // Calculate daily profit
    const daysInMonth = revenueData.dailyRevenue.length
    const dailyProfit = revenueData.dailyRevenue.map((day, i) => ({
      day: day.day,
      revenue: day.revenue,
      expenses: expenseData.dailyExpenses[i]?.amount || 0,
      profit: day.revenue - (expenseData.dailyExpenses[i]?.amount || 0)
    }))

    // Calculate profit by comparing to previous month
    const prevRevenue = revenueData.comparison.previousMonth
    const prevExpenses = expenseData.comparison.previousMonth
    const prevProfit = prevRevenue - prevExpenses
    const profitChange = prevProfit !== 0 ? (((grossProfit - prevProfit) / Math.abs(prevProfit)) * 100).toFixed(1) : '0'

    return {
      period: {
        month: currentMonth,
        year: currentYear,
        monthName: new Date(currentYear, currentMonth, 1).toLocaleString('default', { month: 'long' })
      },
      summary: {
        totalRevenue,
        totalExpenses,
        grossProfit,
        profitMargin: parseFloat(profitMargin),
        netProfit: grossProfit, // For now, gross = net
        costToRevenueRatio: totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : '0'
      },
      comparison: {
        previousProfit: prevProfit,
        change: parseFloat(profitChange),
        trend: parseFloat(profitChange) >= 0 ? 'up' : 'down'
      },
      breakdown: {
        revenueBreakdown: {
          paid: revenueData.summary.paidRevenue,
          pending: revenueData.summary.pendingRevenue
        },
        expenseBreakdown: expenseData.byCategory
      },
      dailyProfit,
      chartData: {
        labels: dailyProfit.map(d => d.day.toString()),
        revenue: dailyProfit.map(d => d.revenue),
        expenses: dailyProfit.map(d => d.expenses),
        profit: dailyProfit.map(d => d.profit)
      }
    }
  } catch (error) {
    console.error('Error fetching profitability report:', error)
    throw new Error('Failed to fetch profitability report')
  }
}

/**
 * Get invoicing report
 */
export async function getInvoicingReport(month?: number, year?: number) {
  try {
    const now = new Date()
    const currentMonth = month !== undefined ? month : now.getMonth()
    const currentYear = year !== undefined ? year : now.getFullYear()

    const startOfMonth = new Date(currentYear, currentMonth, 1)
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)

    const startDate = startOfMonth.toISOString()
    const endDate = endOfMonth.toISOString()

    // The trips on the month's invoice. Every trip that earns its price is billable -
    // not only those marked completed, which most trips never are.
    const allTrips = await listTripsForInvoiceMonth<any>(currentMonth, currentYear, 'rows', [
      Query.select(['$id', 'tripNumber', 'tripDate', 'status', 'tripCost', 'clientRate', 'invoiceGenerated', 'paymentStatus', 'billingMonth', 'driver.name', 'route.routeName'])
    ])

    const billable = allTrips
      .filter(tripEarnsRevenue)
      .sort((a: any, b: any) => String(a.tripDate).localeCompare(String(b.tripDate)))
      .map((trip: any) => ({ ...trip, driverName: trip.driver?.name || '', routeName: trip.route?.routeName || '' }))

    let totalBilled = 0
    let totalPaid = 0
    let totalPending = 0
    let totalUninvoiced = 0
    let invoicedTrips = 0
    let uninvoicedTrips = 0

    const invoiceStatus: Record<string, { count: number; amount: number }> = {
      paid: { count: 0, amount: 0 },
      pending: { count: 0, amount: 0 },
      partial: { count: 0, amount: 0 }
    }

    billable.forEach((trip: any) => {
      const amount = tripRevenue(trip)

      if (!trip.invoiceGenerated) {
        uninvoicedTrips++
        totalUninvoiced += amount

        return
      }

      invoicedTrips++
      totalBilled += amount

      const status = trip.paymentStatus || 'pending'

      if (invoiceStatus[status]) {
        invoiceStatus[status].count++
        invoiceStatus[status].amount += amount
      }

      if (status === 'paid') totalPaid += amount
      else totalPending += amount
    })

    return {
      period: {
        month: currentMonth,
        year: currentYear,
        monthName: startOfMonth.toLocaleString('default', { month: 'long' })
      },
      summary: {
        totalBilled,
        totalPaid,
        totalPending,
        collectionRate: totalBilled > 0 ? ((totalPaid / totalBilled) * 100).toFixed(1) : '0',
        invoicedTrips,
        uninvoicedTrips,
        totalUninvoiced,
        invoiceRate: billable.length > 0 ? ((invoicedTrips / billable.length) * 100).toFixed(1) : '0'
      },
      byStatus: Object.entries(invoiceStatus).map(([status, data]) => ({
        status,
        ...data,
        percentage: totalBilled > 0 ? ((data.amount / totalBilled) * 100).toFixed(1) : '0'
      })),
      trips: billable
    }
  } catch (error) {
    console.error('Error fetching invoicing report:', error)
    throw new Error('Failed to fetch invoicing report')
  }
}
