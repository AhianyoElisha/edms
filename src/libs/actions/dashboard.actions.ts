import { ID, Query } from "appwrite";
import { databases, storage } from "../appwrite.config";
import { appwriteConfig } from '../appwrite.config';
import { getCustomerList, getSupplierList, getUserList } from "./customer.action";
import { getRequisitionHistoryList } from "./stores.actions";
import { getAllTrips } from "./trip.actions";
import { getManifestStatistics } from "./manifest.actions";

// TypeScript interfaces
interface SalesDocument {
  $id: string;
  salesDate: string;
  totalPrice: number;
  quantity: number;
  packageQuantity: number;
  category?: {
    title: string;
  };
  creator?: {
    name: string;
  };
  vehicle?: {
    vehicleNumber: string;
  };
}

interface ExpenseDocument {
  $id: string;
  expenseDate?: string;
  createdAt: string;
  amount?: number;
  totalAmount?: number;
  vehicle?: {
    vehicleNumber: string;
  };
}

interface ReturnDocument {
  $id: string;
  returnDate: string;
  quantity: number;
}

interface CategoryData {
  title: string;
  salesTotal: number;
  salesPackages: number;
  salesData: number[];
  dayLabels: number[];
  detailedSalesData: Array<{
    totalPrice: number;
    createdAt: string;
    day: number;
  }>;
  weeklyData: number[];
  weeklyTotal: number;
}

interface CreatorData {
  name: string;
  salesTotal: number;
  salesPackages: number;
  formattedSalesTotal: string;
  trendPercentage: string;
  isPositiveTrend: boolean;
  documents: SalesDocument[];
}

interface MonthlyData {
  monthIndex: number;
  monthName: string;
  salesTotal: number;
  expenseTotal: number;
  salesPackages: number;
  salesCount: number;
  expenseCount: number;
  salesToExpenseRatio: string;
  profitLoss: number;
  daysInMonth: number;
  salesData: number[];
  expenseData: number[];
  dayLabels: number[];
  weeklyBreakdown: Array<{
    weekNumber: number;
    weekRange: string;
    weeklySales: number;
    weeklyExpenses: number;
    weeklyRatio: string;
    weeklyProfit: number;
  }>;
  hasData: boolean;
}

// Simple cache for database results
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCachedData(key: string): any | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setCachedData(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export async function getCurrentMonthEstimates(month?: number, year?: number) {
  try {
    // Get the current date info or use provided parameters
    const now = new Date();
    const currentMonth = month !== undefined ? month : now.getMonth(); // 0-11
    const currentYear = year !== undefined ? year : now.getFullYear();
    
    // Create start and end dates for the specified month
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
    
    // Convert to ISO strings for query
    const startDate = startOfMonth.toISOString();
    const endDate = endOfMonth.toISOString();
    
    // Get number of days in current month
    const daysInMonth = endOfMonth.getDate();
    
    // Query for sales estimates in current month and expenses for net profit calculation
    const [salesEstimateList, expensesList] = await Promise.all([
      databases.listDocuments(
        appwriteConfig.database,
        appwriteConfig.orders,
        [
          Query.greaterThanEqual('salesDate', startDate),
          Query.lessThanEqual('salesDate', endDate),
          Query.limit(500)
        ]
      ),
      databases.listDocuments(
        appwriteConfig.database,
        appwriteConfig.expenses,
        [
          Query.greaterThanEqual('expenseDate', startDate),
          Query.lessThanEqual('expenseDate', endDate),
          Query.limit(500)
        ]
      )
    ]);
    
    if (!salesEstimateList) throw Error;

    // Extract unique IDs for optimized batch fetching
    const categoryIds = [...new Set(
      salesEstimateList.documents
        .map(doc => doc.category)
        .filter(Boolean)
    )];
    
    const creatorIds = [...new Set(
      salesEstimateList.documents
        .map(doc => doc.creator)
        .filter(Boolean)
    )];

    // Optimized batch fetch all related documents in parallel
    const [categories, creators] = await Promise.all([
      categoryIds.length > 0 ? databases.listDocuments(
        appwriteConfig.database,
        appwriteConfig.productioncategory, // Update this to your actual category collection name
        [Query.equal('$id', categoryIds), Query.limit(categoryIds.length)]
      ) : { documents: [] },
      creatorIds.length > 0 ? databases.listDocuments(
        appwriteConfig.database,
        appwriteConfig.users, // Update this to your actual creator/user collection name
        [Query.equal('$id', creatorIds), Query.limit(creatorIds.length)]
      ) : { documents: [] }
    ]);
    
    // Create optimized lookup maps for O(1) access
    const categoryMap = new Map(categories.documents.map(cat => [cat.$id, cat]));
    const creatorMap = new Map(creators.documents.map(creator => [creator.$id, creator]));
    
    // Populate relationships with fallback values
    const processedDocuments: any = salesEstimateList.documents.map(doc => ({
      ...doc,
      category: doc.category ? 
        categoryMap.get(doc.category) || { title: 'Unknown Category', $id: doc.category } : 
        { title: 'Uncategorized', $id: null },
      creator: doc.creator ? 
        creatorMap.get(doc.creator) || { name: 'Unknown Creator', avatar: 'Unknown Avatar', $id: doc.creator } : 
        { name: 'Unknown Creator', avatar: 'Unknown Avatar', $id: null }
    }));
    // Calculate credit sales and cash sales
    const creditSales = processedDocuments.filter((doc: any) => doc.paymentStatus === 'credit' );
    const cashSales = processedDocuments.filter((doc: any) => doc.paymentStatus !== 'credit');

    const creditSalesTotal = creditSales.reduce((total: number, item: any) => total + (item.totalPrice || 0), 0);
    const cashSalesTotal = cashSales.reduce((total: number, item: any) => total + (item.totalPrice || 0), 0);
    const creditSalesPackages = creditSales.reduce((total: number, item: any) => total + (item.packageQuantity || 0), 0);

    // Calculate total expenses for the month
    const totalExpenses = expensesList?.documents?.reduce((total: number, expense: any) => total + (expense.amount || expense.totalAmount || 0), 0) || 0;
    
    // Calculate overall totals across all categories
    const overallSalesTotal = processedDocuments.reduce((total: number, item: any) => total + (item.totalPrice || 0), 0);
    const overallSalesPackages = processedDocuments.reduce((total: number, item: any) => total + (item.packageQuantity || 0), 0);

    // Calculate net profit (total sales - total expenses)
    const netProfit = overallSalesTotal - totalExpenses;
    const profitMargin = overallSalesTotal > 0 ? ((netProfit / overallSalesTotal) * 100).toFixed(2) : '0.00';
    
    // Group orders by category
    const categorizedData = new Map();
    
    // Group orders by creator (for current month/year only)
    const creatorData = new Map();
    
    // Get all unique creators for consistent color mapping
    const allCreators = new Set();
    processedDocuments.forEach((item: any) => {
      const creatorName = item.creator?.name || 'Unknown Creator';
      allCreators.add(creatorName);
    });
    
    // Process each document and group by category and creator
    processedDocuments.forEach((item: any) => {
      // Category grouping (existing logic)
      const categoryTitle = item.category?.title || 'Uncategorized';
      
      if (!categorizedData.has(categoryTitle)) {
        categorizedData.set(categoryTitle, {
          title: categoryTitle,
          documents: [],
          salesTotal: 0,
          salesPackages: 0,
          creatorSales: new Map() // Track sales by creator within this category
        });
      }
      
      const categoryData = categorizedData.get(categoryTitle);
      categoryData.documents.push(item);
      // @ts-ignore
      categoryData.salesTotal += (item as any).totalPrice || 0;
      // @ts-ignore
      categoryData.salesPackages += (item as any).quantity || 0;

      // Track creator sales within this category
      const creatorName = item.creator?.name || 'Unknown Creator';
      if (!categoryData.creatorSales.has(creatorName)) {
        categoryData.creatorSales.set(creatorName, {
          name: creatorName,
          avatar: item.creator?.avatar || 'Unknown Avatar',
          salesTotal: 0,
          salesPackages: 0,
          documents: []
        });
      }
      
      const creatorInfo = categoryData.creatorSales.get(creatorName);
      creatorInfo.documents.push(item);
      // @ts-ignore
      creatorInfo.salesTotal += (item as any).totalPrice || 0;
      // @ts-ignore
      creatorInfo.salesPackages += (item as any).packageQuantity || 0;

      // Creator grouping - FIXED: only accumulate sales for current month/year
      if (!creatorData.has(creatorName)) {
        creatorData.set(creatorName, {
          name: creatorName,
          avatar: item.creator?.avatar || 'Unknown Avatar',
          documents: [],
          salesTotal: 0,
          salesPackages: 0
        });
      }
      
      const globalCreatorInfo = creatorData.get(creatorName);
      globalCreatorInfo.documents.push(item);
      // @ts-ignore
      globalCreatorInfo.salesTotal += (item as any).totalPrice || 0;
      // @ts-ignore
      globalCreatorInfo.salesPackages += (item as any).packageQuantity || 0;
    });
    
    // Process each category to generate daily and weekly data with creator breakdown
    const processedCategories = Array.from(categorizedData.values()).map(category => {
      // Get all creators in this category
      const categoryCreators = Array.from(category.creatorSales.keys());
      
      // Group sales by day and creator for this category
      const dailyCreatorSalesMap = new Map();
      
      // Initialize all days with empty creator data
      for (let day = 1; day <= daysInMonth; day++) {
        dailyCreatorSalesMap.set(day, new Map());
        categoryCreators.forEach(creator => {
          dailyCreatorSalesMap.get(day).set(creator, 0);
        });
      }
      
      // Aggregate sales by day and creator for this category
      category.documents.forEach((item: any) => {
        const createdDate = new Date(item.salesDate);
        const day = createdDate.getDate();
        const creatorName = item.creator?.name || 'Unknown Creator';
        
        const dayMap = dailyCreatorSalesMap.get(day);
        const currentTotal = dayMap.get(creatorName) || 0;
        dayMap.set(creatorName, currentTotal + (item.totalPrice || 0));
      });
      
      // Convert to stacked chart format
      const stackedSalesData = categoryCreators.map(creator => ({
        name: creator,
        data: Array.from({length: daysInMonth}, (_, i) => {
          const day = i + 1;
          return dailyCreatorSalesMap.get(day).get(creator) || 0;
        })
      }));
      
      const dayLabels = Array.from({length: daysInMonth}, (_, i) => i + 1);
      
      // Generate current week data (Monday to Sunday) for this category with creator breakdown
      const today = new Date();
      const currentDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Calculate start of current week (Monday)
      const startOfWeek = new Date(today);
      const daysToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
      startOfWeek.setDate(today.getDate() - daysToMonday);
      startOfWeek.setHours(0, 0, 0, 0);
      
      // Initialize weekly data for Mon-Sun with creator breakdown
      const weeklyCreatorSalesMap = new Map();
      const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      weekDays.forEach(day => {
        weeklyCreatorSalesMap.set(day, new Map());
        categoryCreators.forEach(creator => {
          weeklyCreatorSalesMap.get(day).set(creator, 0);
        });
      });
      
      // Aggregate sales for current week for this category by creator
      category.documents.forEach((item:any) => {
        const itemDate = new Date(item.salesDate);
        const itemDayOfWeek = itemDate.getDay();
        const creatorName = item.creator?.name || 'Unknown Creator';
        
        // Check if item is within current week
        const weekStart = new Date(startOfWeek);
        const weekEnd = new Date(startOfWeek);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        if (itemDate >= weekStart && itemDate <= weekEnd) {
          // Convert Sunday (0) to index 6, Monday (1) to index 0, etc.
          const dayIndex = itemDayOfWeek === 0 ? 6 : itemDayOfWeek - 1;
          const dayName = weekDays[dayIndex];
          const dayMap = weeklyCreatorSalesMap.get(dayName);
          const currentTotal = dayMap.get(creatorName) || 0;
          dayMap.set(creatorName, currentTotal + (item.totalPrice || 0));
        }
      });
      
      // Convert weekly data to stacked format
      const stackedWeeklyData = categoryCreators.map(creator => ({
        name: creator,
        data: weekDays.map(day => weeklyCreatorSalesMap.get(day).get(creator) || 0)
      }));
      
      const weeklyTotal = stackedWeeklyData.reduce((total, creator) => 
        total + creator.data.reduce((sum, val) => sum + val, 0), 0
      );
      
      return {
        title: category.title,
        salesTotal: category.salesTotal,
        salesPackages: category.salesPackages,
        stackedSalesData, // Stacked daily data by creator
        dayLabels, // Day numbers array
        stackedWeeklyData, // Stacked weekly data by creator
        weeklyTotal, // Total for current week
        creators: Array.from(category.creatorSales.values()), // Creators in this category
        detailedSalesData: category.documents.map((item: any) => ({
          totalPrice: item.totalPrice || 0,
          createdAt: item.salesDate,
          day: new Date(item.salesDate).getDate(),
          creator: item.creator?.name || 'Unknown Creator'
        }))
      };
    });

    // Process creators data for dashboard cards (existing logic)
    const processedCreators = Array.from(creatorData.values()).map(creator => {
      // Group sales by day for this creator
      const dailySalesMap = new Map();
      
      // Initialize all days with 0
      for (let day = 1; day <= daysInMonth; day++) {
        dailySalesMap.set(day, 0);
      }
      
      // Aggregate sales by day for this creator
      creator.documents.forEach((item: any) => {
        const createdDate = new Date(item.salesDate);
        const day = createdDate.getDate();
        const currentTotal = dailySalesMap.get(day) || 0;
        dailySalesMap.set(day, currentTotal + (item.totalPrice || 0));
      });
      
      // Calculate percentage change from previous period (you can implement this logic)
      // For now, we'll use a placeholder calculation
      const totalSales = creator.salesTotal;
      const averageDailySales = totalSales / daysInMonth;
      const trendPercentage = Math.random() * 30; // Replace with actual calculation
      const isPositiveTrend = Math.random() > 0.5; // Replace with actual logic
      
      return {
        name: creator.name,
        avatar: creator.avatar,
        salesTotal: creator.salesTotal,
        salesPackages: creator.salesPackages,
        formattedSalesTotal: (creator.salesTotal / 1000).toFixed(1) + 'k', // Format for display
        trendPercentage: trendPercentage.toFixed(1) + '%',
        isPositiveTrend,
        documents: creator.documents
      };
    });
    
    return { 
      categories: processedCategories,
      creators: processedCreators,
      overallSalesTotal,
      overallSalesPackages,
      creditSalesTotal,
      cashSalesTotal,
      creditSalesPackages,
      creditSalesCount: creditSales.length,
      totalExpenses,
      netProfit,
      profitMargin,
      daysInMonth,
      month: new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' }),
      year: currentYear,
      allCreators: Array.from(allCreators)
    };
  } catch (error) {
    console.log(error);
    return undefined;
  }
}


export async function getAllMonthsLogisticsToExpenseEstimate(vehicleId: any) {
  try {
    // Get the current year for the analysis
    const currentYear = new Date().getFullYear();
    
    // Create start and end dates for the entire current year
    const startOfYear = new Date(currentYear, 0, 1); // January 1st
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999); // December 31st
    
    // Convert to ISO strings for query
    const startDate = startOfYear.toISOString();
    const endDate = endOfYear.toISOString();
    
    // Query for sales with specific vehicleId
    const tripCostEstimate = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.trips,
      [
        Query.greaterThanEqual('tripDate', startDate),
        Query.lessThanEqual('tripDate', endDate),
        Query.equal('vehicle', vehicleId),
        Query.notEqual('status', 'deleted'),
        Query.limit(500)
      ]
    );
    
    // Query for expenses with specific vehicleId
    const expensesList = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.expenses,
      [
        Query.greaterThanEqual('expenseDate', startDate),
        Query.lessThanEqual('expenseDate', endDate),
        Query.equal('vehicleId', vehicleId),
        Query.limit(500)
      ]
    );
    
    // Fetch vehicle information directly using the vehicleId
    const vehiclePromise = databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.vehicles, // Update this to your actual vehicles collection name
      vehicleId
    );
    
    // Wait for all queries to complete
    const [tripResult, expensesResult, vehicleResult] = await Promise.allSettled([
      tripCostEstimate,
      expensesList,
      vehiclePromise
    ]);
    
    // Handle results with error checking
    if (tripResult.status === 'rejected' || expensesResult.status === 'rejected') {
      throw new Error('Failed to fetch trip or expenses data');
    }
    
    const tripData = tripResult.value;
    const expensesData = expensesResult.value;
    const vehicleData = vehicleResult.status === 'fulfilled' ? vehicleResult.value : null;
    
    if (!tripData || !expensesData) throw Error;

    // Initialize monthly data structure
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const monthlyData = new Map();
    
    // Initialize all months with empty data
    monthNames.forEach((monthName, index) => {
      monthlyData.set(index, {
        monthIndex: index,
        monthName,
        tripDocuments: [],
        expenseDocuments: [],
        tripCostTotal: 0,
        expenseTotal: 0,
        deliveredPackages: 0,
        tripCount: 0,
        expenseCount: 0
      });
    });
    
    // Process trip data and group by month
    tripData.documents.forEach((item) => {
      const tripDate = new Date(item.tripDate);
      const monthIndex = tripDate.getMonth(); // 0-11
      
      const monthInfo = monthlyData.get(monthIndex);
      monthInfo.tripDocuments.push(item);
      monthInfo.tripCostTotal += item.tripCost || 0;
      monthInfo.tripCount += 1;
    });
    
    // Process expenses data and group by month
    expensesData.documents.forEach((item) => {
      const expenseDate = new Date(item.expenseDate || item.createdAt);
      const monthIndex = expenseDate.getMonth(); // 0-11
      
      const monthInfo = monthlyData.get(monthIndex);
      monthInfo.expenseDocuments.push(item);
      monthInfo.expenseTotal += item.amount || item.totalAmount || 0;
      monthInfo.expenseCount += 1;
    });
    
    // Process each month to generate detailed data and ratios
    const processedMonths = Array.from(monthlyData.values()).map(month => {
      // Get number of days in this month
      const daysInMonth = new Date(currentYear, month.monthIndex + 1, 0).getDate();
      
      // Group sales by day for this month
      const dailySalesMap = new Map();
      const dailyExpenseMap = new Map();
      
      // Initialize all days with 0
      for (let day = 1; day <= daysInMonth; day++) {
        dailySalesMap.set(day, 0);
        dailyExpenseMap.set(day, 0);
      }
      
      // Aggregate sales by day for this month
      month.tripDocuments.forEach((item: any) => {
        const createdDate = new Date(item.tripDate);
        const day = createdDate.getDate();
        const currentTotal = dailySalesMap.get(day) || 0;
        dailySalesMap.set(day, currentTotal + (item.tripCost || 0));
      });
      
      // Aggregate expenses by day for this month
      month.expenseDocuments.forEach((item: any) => {
        const createdDate = new Date(item.expenseDate || item.createdAt);
        const day = createdDate.getDate();
        const currentTotal = dailyExpenseMap.get(day) || 0;
        dailyExpenseMap.set(day, currentTotal + (item.amount || item.totalAmount || 0));
      });
      
      // Convert to arrays for chart
      const salesData = Array.from(dailySalesMap.values());
      const expenseData = Array.from(dailyExpenseMap.values());
      const dayLabels = Array.from(dailySalesMap.keys());
      
      // Calculate sales to expense ratio for this month
      const salesTotal = month.tripCostTotal;
      const expenseTotal = month.expenseTotal;
      const salesToExpenseRatio = expenseTotal > 0 ? (salesTotal / expenseTotal) : (salesTotal > 0 ? Infinity : 0);
      const formattedRatio = salesToExpenseRatio === Infinity ? '∞' : salesToExpenseRatio.toFixed(2);
      
      // Calculate profit/loss for this month
      const profitLoss = salesTotal - expenseTotal;
      
      // Generate weekly breakdown for current month
      const weeksInMonth = Math.ceil(daysInMonth / 7);
      const weeklyBreakdown = [];
      
      for (let week = 0; week < weeksInMonth; week++) {
        const weekStart = week * 7 + 1;
        const weekEnd = Math.min((week + 1) * 7, daysInMonth);
        
        let weeklySales = 0;
        let weeklyExpenses = 0;
        
        for (let day = weekStart; day <= weekEnd; day++) {
          weeklySales += dailySalesMap.get(day) || 0;
          weeklyExpenses += dailyExpenseMap.get(day) || 0;
        }
        
        const weeklyRatio = weeklyExpenses > 0 ? (weeklySales / weeklyExpenses).toFixed(2) : (weeklySales > 0 ? '∞' : '0.00');
        
        weeklyBreakdown.push({
          weekNumber: week + 1,
          weekRange: `${weekStart}-${weekEnd}`,
          weeklySales,
          weeklyExpenses,
          weeklyRatio,
          weeklyProfit: weeklySales - weeklyExpenses
        });
      }
      
      return {
        monthIndex: month.monthIndex,
        monthName: month.monthName,
        salesTotal: month.tripCostTotal,
        expenseTotal: month.expenseTotal,
        salesPackages: month.deliveredPackages,
        salesCount: month.tripCount,
        expenseCount: month.expenseCount,
        salesToExpenseRatio: formattedRatio,
        profitLoss,
        daysInMonth,
        salesData: salesData, // Daily sales totals array
        expenseData: expenseData, // Daily expense totals array
        dayLabels: dayLabels, // Day numbers array
        weeklyBreakdown: weeklyBreakdown, // Weekly breakdown for the month
        // Chart-friendly data
        hasData: month.tripCount > 0 || month.expenseCount > 0
      };
    });
    
    // Calculate overall totals across all months
    const overallSalesTotal = processedMonths.reduce((total, month) => total + month.salesTotal, 0);
    const overallExpenseTotal = processedMonths.reduce((total, month) => total + month.expenseTotal, 0);
    const overallTripPackages = processedMonths.reduce((total, month) => total + month.salesPackages, 0);
    const overallTripCount = processedMonths.reduce((total, month) => total + month.salesCount, 0);
    const overallExpenseCount = processedMonths.reduce((total, month) => total + month.expenseCount, 0);
    const overallSalesToExpenseRatio = overallExpenseTotal > 0 ? (overallSalesTotal / overallExpenseTotal).toFixed(2) : (overallSalesTotal > 0 ? '∞' : '0.00');
    const overallProfitLoss = overallSalesTotal - overallExpenseTotal;
    
    // Create monthly summary for charts (12 data points)
    const monthlySalesChart = processedMonths.map(month => month.salesTotal);
    const monthlyExpenseChart = processedMonths.map(month => month.expenseTotal);
    const monthlyProfitChart = processedMonths.map(month => month.profitLoss);
    const monthlyRatioChart = processedMonths.map(month => 
      month.salesToExpenseRatio === '∞' || month.salesToExpenseRatio === '0.00' ? 0 : parseFloat(month.salesToExpenseRatio)
    );
    
    // Extract vehicle information from the fetched vehicle document
    const vehicleName = vehicleData ? 
      `${vehicleData.brand ? vehicleData.brand + ' ' : ''}${vehicleData.model ? vehicleData.model + ' - ' : ''}${vehicleData.vehicleNumber || vehicleId}` :
      `Vehicle ${vehicleId}`;
    
    return { 
      vehicleId,
      vehicleName,
      vehicleInfo: vehicleData, // Full vehicle object with all properties
      months: processedMonths, // Array of monthly data (12 months)
      overallSalesTotal,
      overallExpenseTotal,
      overallTripPackages,
      overallTripCount,
      overallExpenseCount,
      overallSalesToExpenseRatio,
      overallProfitLoss,
      year: currentYear,
      // Chart-ready data arrays (12 data points each)
      monthlySalesChart, // Sales for each month [Jan, Feb, ..., Dec]
      monthlyExpenseChart, // Expenses for each month [Jan, Feb, ..., Dec]
      monthlyProfitChart, // Profit/Loss for each month [Jan, Feb, ..., Dec]
      monthlyRatioChart, // Sales-to-expense ratio for each month [Jan, Feb, ..., Dec]
      monthLabels: monthNames, // Month names for chart labels
      activeMonths: processedMonths.filter(month => month.hasData).length // Months with actual data
    };
  } catch (error) {
    console.log(error);
    return undefined;
  }
}


export async function getMonthExpenseAndReturnedProducts(month?: number, year?: number) {
  try {
    const cacheKey = `month_expense_returns_${month}_${year}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    // Get the current date info or use provided parameters
    const now = new Date();
    const currentMonth = month !== undefined ? month : now.getMonth(); // 0-11
    const currentYear = year !== undefined ? year : now.getFullYear();
    
    // Create start and end dates for the specified month
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
    
    // Convert to ISO strings for query
    const startDate = startOfMonth.toISOString();
    const endDate = endOfMonth.toISOString();
    
    // PARALLEL QUERIES - Major performance improvement
    const [expensesList, returnedProductsList] = await Promise.all([
      databases.listDocuments(
        appwriteConfig.database,
        appwriteConfig.expenses,
        [
          Query.greaterThanEqual('expenseDate', startDate),
          Query.lessThanEqual('expenseDate', endDate),
          Query.select(['amount']), // Only fetch needed field
          Query.limit(500)
        ]
      ),
      databases.listDocuments(
        appwriteConfig.database,
        appwriteConfig.returns,
        [
          Query.greaterThanEqual('returnDate', startDate),
          Query.lessThanEqual('returnDate', endDate),
          Query.select(['quantity']) // Only fetch needed field
        ]
      )
    ]);

    if (!expensesList) throw Error;
    if (!returnedProductsList) throw Error;
    
    // OPTIMIZED calculation - single pass
    let expensesTotal = 0;
    let returnedPackages = 0;
// @ts-ignore

    expensesList.documents.forEach((item: { amount: number }) => {
      expensesTotal += item.amount;
    });
// @ts-ignore

    returnedProductsList.documents.forEach((item: { quantity: number }) => {
      returnedPackages += item.quantity;
    });
    
    const result = {
      expensesTotal,
      returnedPackages,
    };

    setCachedData(cacheKey, result);
    return result;
  } catch (error) {
    console.log(error);
    return {
      expensesTotal: 0,
      returnedPackages: 0,
    };
  }
}

export async function getConsoleEstimatesList(month?: number, year?: number) {
  try {
    const cacheKey = `console_estimates_${month}_${year}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    // Get the current date info or use provided parameters
    const now = new Date();
    const currentMonth = month !== undefined ? month : now.getMonth(); // 0-11
    const currentYear = year !== undefined ? year : now.getFullYear();
    
    // Create start and end dates for the specified month
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
    
    // Convert to ISO strings for query
    const startDate = startOfMonth.toISOString();
    const endDate = endOfMonth.toISOString();
    
    // Get number of days in current month
    const daysInMonth = endOfMonth.getDate();

    const salesEstimateList = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.orders,
      [
        Query.orderDesc('salesDate'), 
        Query.greaterThanEqual('salesDate', startDate),
        Query.lessThanEqual('salesDate', endDate),
        Query.limit(500),
        Query.select(['totalPrice', 'quantity']) // Only fetch needed fields
      ]
    );

    if (!salesEstimateList) throw Error;

    // OPTIMIZED calculation - single pass
    let salesTotal = 0;
    let salesPackages = 0;
// @ts-ignore
    salesEstimateList.documents.forEach((item: { totalPrice: number; quantity: number }) => {
      salesTotal += item.totalPrice;
      salesPackages += item.quantity;
    });

    const transactionTotal = salesEstimateList.total;

    const result = {
      salesTotal, 
      salesPackages, 
      transactionTotal
    };

    setCachedData(cacheKey, result);
    return result;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

/**
 * Get total trips count
 */
export async function getTripsTotal() {
  try {
    const trips = await getAllTrips();
    return trips?.length || 0;
  } catch (error) {
    console.error('Error fetching trips total:', error);
    return 0;
  }
}

/**
 * Get total delivered packages count (from manifests)
 * Since packages are now tracked as counts on manifests, we sum up deliveredCount from all manifests
 */
export async function getDeliveredPackagesTotal(month?: number, year?: number) {
  try {
    const cacheKey = `delivered_packages_${month}_${year}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const currentMonth = month !== undefined ? month : now.getMonth();
    const currentYear = year !== undefined ? year : now.getFullYear();
    
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
    
    const startDate = startOfMonth.toISOString();
    const endDate = endOfMonth.toISOString();

    // Query manifests that have been delivered (status = 'delivered')
    const deliveredManifests = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.manifests,
      [
        Query.equal('status', 'delivered'),
        Query.greaterThanEqual('manifestDate', startDate),
        Query.lessThanEqual('manifestDate', endDate),
        Query.limit(1000)
      ]
    );

    // Sum up deliveredCount from all delivered manifests
    // If deliveredCount is not available, fall back to packageCount
    const result = deliveredManifests.documents.reduce((total: number, manifest: any) => {
      return total + (manifest.deliveredCount || manifest.packageCount || 0);
    }, 0);

    setCachedData(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching delivered packages:', error);
    return 0;
  }
}

/**
 * Get total manifests count
 */
export async function getManifestsTotal() {
  try {
    const stats = await getManifestStatistics();
    return stats?.total || 0;
  } catch (error) {
    console.error('Error fetching manifests total:', error);
    return 0;
  }
}

export async function getDashboardData(month?: number, year?: number) {
  try {
    // PARALLEL EXECUTION - Major performance improvement
    const [
      userList,
      customerList,
      supplierList,
      consoleEstimatesList,
      currentMonthEstimates,
      activityTimeline,
      expenseAndReturns,
      tripsTotal,
      deliveredPackagesTotal,
      manifestsTotal
    ] = await Promise.all([
      getUserList(),
      getCustomerList(),
      getSupplierList(),
      getConsoleEstimatesList(month, year),
      getCurrentMonthEstimates(month, year),
      getRequisitionHistoryList(5), // Limit to 5 recent activities
      getMonthExpenseAndReturnedProducts(month, year),
      getTripsTotal(),
      getDeliveredPackagesTotal(month, year),
      getManifestsTotal()
    ]);

    return { 
      userList, 
      consoleEstimatesList, 
      currentMonthEstimates, 
      supplierList, 
      activityTimeline, 
      customerList, 
      expenseAndReturns,
      tripsTotal,
      deliveredPackagesTotal,
      manifestsTotal
    };
  } catch (error) {
    console.log(error);
    return undefined;
  }
}