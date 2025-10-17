'use client';

import { useAuth } from '@/contexts/AppwriteProvider';
import Grid from '@mui/material/Grid';
import Sales from '@/views/dashboards/Sales';
import ActivityTimeline from '@/views/dashboards/ActivityTimeline';
import UserTable from '@/views/dashboards/UserTable';
import { Typography, Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getEDMSDashboardData } from '@/libs/actions/edms-dashboard.actions';
import SalesStatistics from '@/views/dashboards/ReviewsStatistics';
import CardStatWithImage from '@/components/card-statistics/Character';
import Shimmer from '@/components/layout/shared/Shimmer';

export default function EDMSDashboardContent() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<any>(null)

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
        const response = await getEDMSDashboardData(selectedMonth, selectedYear)
        setDashboardData(response)
        console.log('EDMS Dashboard data fetched successfully:', response)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        toast.error('Failed to fetch dashboard data')
      } finally {
        setIsLoading(false)
      }
    }, [selectedMonth, selectedYear])
  
    useEffect(() => {
      fetchDashboardData()
    }, [fetchDashboardData])

  // Get top 2 drivers for the cards
  const topDrivers = dashboardData?.driverPerformance?.slice(0, 2) || [];

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
          <Sales 
            totalCustomers={dashboardData?.vehicleStats?.total || 0} 
            isLoading={isLoading} 
            totalSales={String(dashboardData?.packageStats?.total || 0)} 
            totalTransactions={dashboardData?.tripStats?.total || 0} 
            totalProfit={String(dashboardData?.packageStats?.delivered || 0)}
          />
        </Grid>
        
        {/* Dynamic driver cards */}
        {topDrivers.map((driver: any, index: number) => (
          <Grid item xs={12} sm={6} md={3} key={driver.driverId}>
            <CardStatWithImage
              stats={driver.completedTrips || 0}
              title='This Month Analytics'
              subtitle='Completed Trips'
              trend={driver.isPositiveTrend ? 'positive' : 'negative'}
              trendNumber={driver.trendPercentage || 0}
              chipColor={index === 0 ? 'primary' : 'success'}
              chipText={driver.driverName || 'Unknown Driver'}
              src={driver?.avatar || '/images/avatars/1.png'}
            />
          </Grid>
        ))}
        
        {/* Fallback cards if no drivers data */}
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
        ): topDrivers.length === 0 && (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <CardStatWithImage
                stats={0}
                title={'This Month Analytics'}
                subtitle={'Completed Trips'}
                trendNumber={0}
                chipColor='primary'
                chipText={'No Driver Data Yet'}
                src={'/images/illustrations/characters/13.png'}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <CardStatWithImage
                stats={0}
                title={'This Month Analytics'}
                subtitle={'Completed Trips'}
                trendNumber={0}
                chipColor='primary'
                chipText={'No Driver Data Yet'}
                src={'/images/illustrations/characters/12.png'}
              />
            </Grid>
          </>
        )}

        <Grid item xs={12}>
          <SalesStatistics monthlyEstimate={dashboardData?.packageStats} isLoading={isLoading} />
        </Grid>
        <Grid item xs={12}>
          <ActivityTimeline />
        </Grid>
        <Grid item xs={12} className='max-md:order-3'>
          <UserTable tableData={dashboardData?.driverPerformance} />
        </Grid>
      </Grid>
    </div>
  );
}
