'use client';

import { useAuth } from '@/contexts/AppwriteProvider';
import Grid from '@mui/material/Grid';
import Sales from '@/views/dashboards/Sales';
import SalesMonth from '@/views/dashboards/SalesMonth';
import TotalVisits from '@/views/dashboards/TotalVisits';
import WeeklySalesBg from '@/views/dashboards/WeeklySalesBg';
import OrdersImpressions from '@/views/dashboards/OrdersImpressions';
import StoresAndProduction from '@/views/dashboards/StoresAndProduction';
import WarehouseAndSales from '@/views/dashboards/WareHouseAndSales';
import ActivityTimeline from '@/views/dashboards/ActivityTimeline';
import UserTable from '@/views/dashboards/UserTable';
import { Typography, Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import MaintenanceBanner from '../../../MaintenanceBanner';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getDashboardData } from '@/libs/actions/dashboard.actions';
import { RequisitionHistory } from '@/types/apps/ecommerceTypes';
import SalesStatistics from '@/views/dashboards/ReviewsStatistics'; // Updated import
import UserListCards from '@/views/dashboards/UserListCards';
import CardStatWithImage from '@/components/card-statistics/Character';
import Shimmer from '@/components/layout/shared/Shimmer';

export default function DashboardContent() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true)
  const [supplierListData, setSupplierListData] = useState<any>()
  const [activityTimelineData, setActivityTimelineData] = useState<RequisitionHistory[]>()
  const [costEstimateListData, setCostEstimateListData] = useState<any>()
  const [currentMonthEstimatesListData, setCurrentMonthEstimatesListData] = useState<any>()
  const [userListData, setUserListData] = useState<User[]>()
  const [customerListData, setCustomerListData] = useState<any>()
  const [expenseAndReturnsData, setExpenseAndReturnsData] = useState<any>()

  // Month selector state
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const years = Array.from({length: 5}, (_, i) => new Date().getFullYear() - i)

    const fetchDashboardData = useCallback(async () => {
      try {
        setIsLoading(true)
        const response = await getDashboardData(selectedMonth, selectedYear)
        setSupplierListData(response?.supplierList?.total)
        setActivityTimelineData(response?.activityTimeline?.rows as unknown as RequisitionHistory[])
        setCostEstimateListData(response?.consoleEstimatesList)
        setCurrentMonthEstimatesListData(response?.currentMonthEstimates)
        setExpenseAndReturnsData(response?.expenseAndReturns)
        setUserListData(response?.userList?.rows as unknown as User[])
        setCustomerListData(response?.customerList?.total)
        console.log('Dashboard data fetched successfully:', response?.userList)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        toast.error('Failed to fetch dashboard data as unknown')
      } finally {
        setIsLoading(false)
      }
    }, [selectedMonth, selectedYear])
  
    useEffect(() => {
      fetchDashboardData()
    }, [fetchDashboardData])

  // Get top 2 creators for the cards
  const topCreators = currentMonthEstimatesListData?.creators
    ?.sort((a: any, b: any) => b.salesTotal - a.salesTotal)
    ?.slice(0, 2) || [];

  return (
    <div>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant='h6'>Welcome, {user?.name}</Typography>
        
        {/* Month and Year Selector */}
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Month</InputLabel>
            <Select
              value={selectedMonth}
              label="Month"
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {months.map((month, index) => (
                <MenuItem key={index} value={index}>
                  {month}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Year</InputLabel>
            <Select
              value={selectedYear}
              label="Year"
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {years.map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>
      
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <UserListCards userList={userListData} isLoading={isLoading} supplierList={supplierListData} expenseAndReturns={expenseAndReturnsData}/>
        </Grid>
        <Grid item xs={12} md={6}>
          <Sales totalCustomers={customerListData} isLoading={isLoading} totalSales={costEstimateListData?.salesPackages} totalTransactions={costEstimateListData?.transactionTotal} totalProfit={costEstimateListData?.salesTotal || 0.00} />
        </Grid>
        
        {/* Dynamic creator cards */}
        {topCreators.map((creator: any, index: number) => (
          <Grid item xs={12} sm={6} md={3} key={creator.name}>
            <CardStatWithImage
              stats={creator.formattedSalesTotal}
              title='This Month Analytics'
              subtitle='Total Sales'
              trend={creator.isPositiveTrend ? 'positive' : 'negative'}
              trendNumber={creator.trendPercentage}
              chipColor={index === 0 ? 'primary' : 'success'}
              chipText={creator.name}
              src={creator?.avatar}
            />
          </Grid>
        ))}
        
        {/* Fallback cards if no creators data */}
        {isLoading?  (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <CardStatWithImage
                stats={<Shimmer width={80} height={37} />}
                title={<Shimmer width={100} height={20} />}
                subtitle={<Shimmer width={100} height={20} />}
                trendNumber={<Shimmer width={40} height={37} />}
                chipColor='primary'
                chipText={<Shimmer width={60} height={37} />}
                src={<Shimmer width={100} height={100} />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <CardStatWithImage
                stats={<Shimmer width={80} height={37} />}
                title={<Shimmer width={100} height={20} />}
                subtitle={<Shimmer width={100} height={20} />}
                trendNumber={<Shimmer width={40} height={37} />}
                chipColor='primary'
                chipText={<Shimmer width={60} height={37} />}
                src={<Shimmer width={100} height={100} />}
              />
            </Grid>
          </>
        ): topCreators.length === 0 && (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <CardStatWithImage
                stats={0}
                title={'This Month Analytics'}
                subtitle={'Total Sales'}
                trendNumber={0}
                chipColor='primary'
                chipText={'No Creator Yet this Month'}
                src={'/images/illustrations/characters/13.png'}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <CardStatWithImage
                stats={0}
                title={'This Month Analytics'}
                subtitle={'Total Sales'}
                trendNumber={0}
                chipColor='primary'
                chipText={'No Creator Yet this Month'}
                src={'/images/illustrations/characters/12.png'}
              />
            </Grid>
          </>
        )}

        {/* <Grid item xs={12} md={6}>
          <WeeklySalesBg />
        </Grid> */}
        <Grid item xs={12}>
          <SalesStatistics monthlyEstimate={currentMonthEstimatesListData} isLoading={isLoading} />
        </Grid>
        <Grid item xs={12}>
          <ActivityTimeline />
        </Grid>
        <Grid item xs={12} className='max-md:order-3'>
          <UserTable tableData={userListData} />
        </Grid>
      </Grid>
    </div>
  );
}