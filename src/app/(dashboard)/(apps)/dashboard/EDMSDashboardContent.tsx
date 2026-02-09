'use client';

import { useAuth } from '@/contexts/AppwriteProvider';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import ActivityTimeline from '@/views/dashboards/ActivityTimeline';
import { Typography, Box, FormControl, InputLabel, Select, MenuItem, Avatar, Chip, LinearProgress, Divider } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getEDMSDashboardData } from '@/libs/actions/edms-dashboard.actions';
import CardStatWithImage from '@/components/card-statistics/Character';
import HorizontalWithSubtitle from '@/components/card-statistics/HorizontalWithSubtitle';
import Shimmer from '@/components/layout/shared/Shimmer';
import OptionMenu from '@core/components/option-menu';
import CustomAvatar from '@core/components/mui/Avatar';

// Dynamic import for charts
import dynamic from 'next/dynamic';
const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function EDMSDashboardContent() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [chartMounted, setChartMounted] = useState(false)

  // Month selector state
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const years = Array.from({length: 5}, (_, i) => new Date().getFullYear() - i)

  // Ensure chart only renders after mount
  useEffect(() => {
    setChartMounted(true)
  }, [])

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
  const topDrivers = dashboardData?.driverPerformance?.topDrivers?.slice(0, 2) || [];

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0)
  }

  // Prepare chart data with proper fallbacks
  const chartCategories = dashboardData?.packageStats?.dayLabels?.length > 0 
    ? dashboardData.packageStats.dayLabels 
    : Array.from({ length: 30 }, (_, i) => i + 1)
  
  const chartData = dashboardData?.packageStats?.dailyDeliveries?.length > 0 
    ? dashboardData.packageStats.dailyDeliveries 
    : Array(30).fill(0)

  // Chart options for delivery trends
  const deliveryChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'area',
      toolbar: { show: false },
      sparkline: { enabled: false },
      parentHeightOffset: 0,
      width: '100%'
    },
    colors: ['#28C76F'],
    stroke: {
      curve: 'smooth',
      width: 2
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.5,
        opacityTo: 0.1,
        stops: [0, 90, 100]
      }
    },
    xaxis: {
      categories: chartCategories,
      labels: {
        style: { colors: 'var(--mui-palette-text-secondary)', fontSize: '10px' },
        rotate: -45
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        style: { colors: 'var(--mui-palette-text-secondary)' }
      },
      min: 0
    },
    grid: {
      borderColor: 'var(--mui-palette-divider)',
      strokeDashArray: 4,
      padding: {
        left: 10,
        right: 10
      }
    },
    tooltip: {
      theme: 'dark'
    },
    dataLabels: {
      enabled: false
    },
    noData: {
      text: 'No delivery data available',
      align: 'center',
      verticalAlign: 'middle'
    }
  }

  const deliveryChartSeries = [{
    name: 'Packages Delivered',
    data: chartData
  }]

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
        {/* EDMS Financial Overview */}
        <Grid item xs={12}>
          <Card className='bs-full'>
            <CardHeader
              title='Month Overview'
              action={<OptionMenu options={['Refresh', 'Share', 'Update']} />}
              subheader={
                <div className='flex items-center gap-2'>
                  <span>{isLoading ? <Shimmer width={200} height={20} /> : `${months[selectedMonth]} ${selectedYear} Financial Summary`}</span>
                </div>
              }
            />
            <CardContent>
              <div className='flex flex-wrap justify-between gap-4'>
                <div className='flex items-center gap-3'>
                  <CustomAvatar variant='rounded' skin='light' color='success'>
                    <i className='ri-money-dollar-circle-line'></i>
                  </CustomAvatar>
                  <div>
                    <Typography variant='h5'>
                      {isLoading ? <Shimmer width={120} height={30} /> : `GH₵ ${(dashboardData?.tripStats?.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </Typography>
                    <Typography>Total Revenue</Typography>
                  </div>
                </div>
                <div className='flex items-center gap-3'>
                  <CustomAvatar variant='rounded' skin='light' color='error'>
                    <i className='ri-exchange-funds-line'></i>
                  </CustomAvatar>
                  <div>
                    <Typography variant='h5'>
                      {isLoading ? <Shimmer width={120} height={30} /> : `GH₵ ${(dashboardData?.expenseStats?.totalExpenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </Typography>
                    <Typography>Total Expenses</Typography>
                  </div>
                </div>
                <div className='flex items-center gap-3'>
                  <CustomAvatar variant='rounded' skin='light' color='warning'>
                    <i className='ri-percent-line'></i>
                  </CustomAvatar>
                  <div>
                    <Typography variant='h5'>
                      {isLoading ? <Shimmer width={120} height={30} /> : `GH₵ ${((dashboardData?.tripStats?.totalRevenue || 0) * 0.925).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </Typography>
                    <Typography>Revenue After WHT (7.5%)</Typography>
                  </div>
                </div>
                <div className='flex items-center gap-3'>
                  <CustomAvatar variant='rounded' skin='light' color='primary'>
                    <i className='ri-line-chart-line'></i>
                  </CustomAvatar>
                  <div>
                    <Typography variant='h5'>
                      {isLoading ? <Shimmer width={120} height={30} /> : `GH₵ ${(((dashboardData?.tripStats?.totalRevenue || 0) * 0.925) - (dashboardData?.expenseStats?.totalExpenses || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </Typography>
                    <Typography>Net Profit</Typography>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Grid>

        {/* Stat Cards Row */}
        <Grid item xs={12} sm={6} md={3}>
          <HorizontalWithSubtitle
            title='Total Trips'
            stats={isLoading ? <Shimmer width={70} height={37} /> : (dashboardData?.tripStats?.totalTrips?.toString() || '0')}
            avatarIcon='ri-route-line'
            avatarColor='primary'
            subtitle={`${dashboardData?.tripStats?.completedTrips || 0} completed`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <HorizontalWithSubtitle
            title='Packages Delivered'
            stats={isLoading ? <Shimmer width={70} height={37} /> : (dashboardData?.packageStats?.deliveredPackages?.toLocaleString() || '0')}
            avatarIcon='ri-checkbox-circle-line'
            avatarColor='success'
            subtitle={`${dashboardData?.packageStats?.deliveryRate || 0}% delivery rate`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <HorizontalWithSubtitle
            title='Total Manifests'
            stats={isLoading ? <Shimmer width={70} height={37} /> : (dashboardData?.packageStats?.totalManifests?.toString() || '0')}
            avatarIcon='ri-file-list-3-line'
            avatarColor='info'
            subtitle={`${dashboardData?.packageStats?.deliveredManifests || 0} delivered`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <HorizontalWithSubtitle
            title='Returns'
            stats={isLoading ? <Shimmer width={70} height={37} /> : (dashboardData?.returnStats?.totalReturns?.toString() || '0')}
            avatarIcon='ri-arrow-go-back-line'
            avatarColor='error'
            subtitle={`${dashboardData?.returnStats?.processedReturns || 0} processed`}
          />
        </Grid>
        
        {/* Dynamic driver cards */}
        {topDrivers.map((driver: any, index: number) => (
          <Grid item xs={12} sm={6} md={3} key={driver.driverId || index}>
            <CardStatWithImage
              stats={driver.completedTrips || 0}
              title='This Month Analytics'
              subtitle='Completed Trips'
              trend={driver.completedTrips > 5 ? 'positive' : 'negative'}
              trendNumber={driver.completionRate || '0'}
              chipColor={index === 0 ? 'primary' : 'success'}
              chipText={driver.driverName || 'Unknown Driver'}
              src={driver?.avatar || '/images/avatars/1.png'}
            />
          </Grid>
        ))}
        
        {/* Fallback cards if no drivers data */}
        {isLoading ? (
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
        ) : topDrivers.length === 0 && (
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

        {/* Daily Delivery Trends Chart */}
        <Grid item xs={12}>
          <Card>
            <CardHeader 
              title='Daily Delivery Trends' 
              subheader={`Packages delivered in ${months[selectedMonth]} ${selectedYear}`}
            />
            <CardContent>
              {isLoading || !chartMounted ? (
                <Box display="flex" justifyContent="center" alignItems="center" height={320}>
                  <Shimmer width="100%" height={300} />
                </Box>
              ) : (
                <Box sx={{ width: '100%', minHeight: 320 }}>
                  <ApexChart
                    type='area'
                    height={320}
                    width='100%'
                    options={deliveryChartOptions}
                    series={deliveryChartSeries}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Summary */}
        <Grid item xs={12} lg={4}>
          <Card className='h-full'>
            <CardHeader title='Quick Summary' />
            <CardContent>
              <Box className='flex flex-col gap-4'>
                {/* Trip Stats */}
                <Box className='p-4 rounded-lg' sx={{ bgcolor: 'primary.lightOpacity' }}>
                  <Box className='flex items-center justify-between mb-2'>
                    <Typography variant='subtitle2' fontWeight={600}>Trips Status</Typography>
                    <Chip 
                      size='small' 
                      label={`${dashboardData?.tripStats?.completionRate || 0}% completion`}
                      color='primary'
                      variant='tonal'
                    />
                  </Box>
                  <Box className='flex justify-between'>
                    <Box>
                      <Typography variant='caption' color='text.secondary'>Total</Typography>
                      <Typography variant='h6' fontWeight={600}>
                        {isLoading ? <Shimmer width={40} height={24} /> : (dashboardData?.tripStats?.totalTrips || 0)}
                      </Typography>
                    </Box>
                    <Box className='text-center'>
                      <Typography variant='caption' color='text.secondary'>Completed</Typography>
                      <Typography variant='h6' fontWeight={600} color='success.main'>
                        {isLoading ? <Shimmer width={40} height={24} /> : (dashboardData?.tripStats?.completedTrips || 0)}
                      </Typography>
                    </Box>
                    <Box className='text-right'>
                      <Typography variant='caption' color='text.secondary'>Active</Typography>
                      <Typography variant='h6' fontWeight={600} color='info.main'>
                        {isLoading ? <Shimmer width={40} height={24} /> : (dashboardData?.tripStats?.activeTrips || 0)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Package Stats */}
                <Box className='p-4 rounded-lg' sx={{ bgcolor: 'success.lightOpacity' }}>
                  <Box className='flex items-center justify-between mb-2'>
                    <Typography variant='subtitle2' fontWeight={600}>Packages Status</Typography>
                    <Chip 
                      size='small' 
                      label={`${dashboardData?.packageStats?.deliveryRate || 0}% delivered`}
                      color='success'
                      variant='tonal'
                    />
                  </Box>
                  <Box className='flex justify-between'>
                    <Box>
                      <Typography variant='caption' color='text.secondary'>Total</Typography>
                      <Typography variant='h6' fontWeight={600}>
                        {isLoading ? <Shimmer width={40} height={24} /> : (dashboardData?.packageStats?.totalPackages?.toLocaleString() || 0)}
                      </Typography>
                    </Box>
                    <Box className='text-center'>
                      <Typography variant='caption' color='text.secondary'>Delivered</Typography>
                      <Typography variant='h6' fontWeight={600} color='success.main'>
                        {isLoading ? <Shimmer width={40} height={24} /> : (dashboardData?.packageStats?.deliveredPackages?.toLocaleString() || 0)}
                      </Typography>
                    </Box>
                    <Box className='text-right'>
                      <Typography variant='caption' color='text.secondary'>Pending</Typography>
                      <Typography variant='h6' fontWeight={600} color='warning.main'>
                        {isLoading ? <Shimmer width={40} height={24} /> : (dashboardData?.packageStats?.pendingPackages?.toLocaleString() || 0)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Expense Stats */}
                <Box className='p-4 rounded-lg' sx={{ bgcolor: 'error.lightOpacity' }}>
                  <Box className='flex items-center justify-between mb-2'>
                    <Typography variant='subtitle2' fontWeight={600}>Expenses</Typography>
                    <Chip 
                      size='small' 
                      label={`${dashboardData?.expenseStats?.expenseCount || 0} records`}
                      color='error'
                      variant='tonal'
                    />
                  </Box>
                  <Typography variant='h6' fontWeight={600}>
                    {isLoading ? <Shimmer width={100} height={24} /> : formatCurrency(dashboardData?.expenseStats?.totalExpenses || 0)}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Total for {months[selectedMonth]}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Activity Timeline */}
        <Grid item xs={12} lg={8}>
          <ActivityTimeline 
            history={dashboardData?.recentActivity} 
            isLoading={isLoading} 
          />
        </Grid>

        {/* Driver Performance Table */}
        <Grid item xs={12}>
          <Card>
            <CardHeader 
              title='Top Drivers' 
              subheader={`Performance for ${months[selectedMonth]} ${selectedYear}`}
            />
            <CardContent>
              {isLoading ? (
                <Box className='flex flex-col gap-4'>
                  {[1, 2, 3].map((i) => (
                    <Box key={i} className='flex items-center gap-4'>
                      <Shimmer width={40} height={40} />
                      <Box className='flex-grow'>
                        <Shimmer width="60%" height={20} />
                        <Shimmer width="40%" height={16} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : dashboardData?.driverPerformance?.topDrivers?.length === 0 ? (
                <Box className='text-center py-8'>
                  <Typography variant='body2' color='text.secondary'>
                    No driver activity for this period
                  </Typography>
                </Box>
              ) : (
                <Box className='flex flex-col gap-4'>
                  {dashboardData?.driverPerformance?.topDrivers?.slice(0, 5).map((driver: any, index: number) => (
                    <Box key={driver.driverId || index} className='flex items-center gap-4'>
                      <Avatar src={driver.avatar} alt={driver.driverName} sx={{ width: 40, height: 40 }}>
                        {driver.driverName?.charAt(0) || 'D'}
                      </Avatar>
                      <Box className='flex-grow'>
                        <Box className='flex justify-between items-center'>
                          <Typography variant='body2' fontWeight={500}>
                            {driver.driverName || 'Unknown'}
                          </Typography>
                          <Chip size='small' label={`${driver.completedTrips || 0} trips`} color='success' variant='tonal' />
                        </Box>
                        <Box className='flex items-center gap-2 mt-1'>
                          <LinearProgress 
                            variant='determinate' 
                            value={parseFloat(driver.completionRate) || 0} 
                            color={parseFloat(driver.completionRate) >= 80 ? 'success' : parseFloat(driver.completionRate) >= 50 ? 'warning' : 'error'}
                            sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                          />
                          <Typography variant='caption' fontWeight={600}>{driver.completionRate || 0}%</Typography>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
}