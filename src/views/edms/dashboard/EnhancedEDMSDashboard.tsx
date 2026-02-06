'use client'

// React Imports
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import LinearProgress from '@mui/material/LinearProgress'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Divider from '@mui/material/Divider'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import { toast } from 'react-toastify'

// Chart Import
import dynamic from 'next/dynamic'
const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

// Context Import
import { useAuth } from '@/contexts/AppwriteProvider'

// Action Imports
import { getEDMSDashboardData } from '@/libs/actions/edms-dashboard.actions'

// Stat Card Component
const StatCard = ({ title, value, subtitle, icon, color = 'primary', trend, trendValue, onClick }: {
  title: string
  value: string | number
  subtitle?: string
  icon: string
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  trend?: 'up' | 'down'
  trendValue?: string
  onClick?: () => void
}) => {
  const colorMap = {
    primary: { bg: 'var(--mui-palette-primary-lightOpacity)', text: 'var(--mui-palette-primary-main)' },
    success: { bg: 'var(--mui-palette-success-lightOpacity)', text: 'var(--mui-palette-success-main)' },
    warning: { bg: 'var(--mui-palette-warning-lightOpacity)', text: 'var(--mui-palette-warning-main)' },
    error: { bg: 'var(--mui-palette-error-lightOpacity)', text: 'var(--mui-palette-error-main)' },
    info: { bg: 'var(--mui-palette-info-lightOpacity)', text: 'var(--mui-palette-info-main)' }
  }

  return (
    <Card 
      className={onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}
      onClick={onClick}
    >
      <CardContent className='flex items-center gap-4'>
        <Avatar
          variant='rounded'
          sx={{
            width: 56,
            height: 56,
            backgroundColor: colorMap[color].bg,
            color: colorMap[color].text
          }}
        >
          <i className={`${icon} text-2xl`}></i>
        </Avatar>
        <Box className='flex-grow'>
          <Box className='flex items-center gap-2'>
            <Typography variant='h4' fontWeight={600}>{value}</Typography>
            {trend && trendValue && (
              <Chip 
                size='small' 
                label={`${trend === 'up' ? '+' : ''}${trendValue}%`}
                color={trend === 'up' ? 'success' : 'error'}
                variant='tonal'
              />
            )}
          </Box>
          <Typography variant='body1' color='text.secondary'>{title}</Typography>
          {subtitle && (
            <Typography variant='caption' color='text.disabled'>{subtitle}</Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}

// Loading Skeleton
const StatCardSkeleton = () => (
  <Card>
    <CardContent className='flex items-center gap-4'>
      <Skeleton variant='rounded' width={56} height={56} />
      <Box className='flex-grow'>
        <Skeleton variant='text' width='60%' height={40} />
        <Skeleton variant='text' width='80%' />
        <Skeleton variant='text' width='40%' />
      </Box>
    </CardContent>
  </Card>
)

const months = [
  { value: 0, label: 'January' },
  { value: 1, label: 'February' },
  { value: 2, label: 'March' },
  { value: 3, label: 'April' },
  { value: 4, label: 'May' },
  { value: 5, label: 'June' },
  { value: 6, label: 'July' },
  { value: 7, label: 'August' },
  { value: 8, label: 'September' },
  { value: 9, label: 'October' },
  { value: 10, label: 'November' },
  { value: 11, label: 'December' }
]

const EnhancedEDMSDashboard = () => {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [dashboardData, setDashboardData] = useState<any>(null)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getEDMSDashboardData(selectedMonth, selectedYear)
      setDashboardData(data)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to fetch dashboard data')
    } finally {
      setLoading(false)
    }
  }, [selectedMonth, selectedYear])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Navigate to reports
  const navigateToReport = (reportPath: string) => {
    router.push(`/edms/reports/${reportPath}`)
  }

  // Chart options for delivery trends
  const deliveryChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'area',
      toolbar: { show: false },
      sparkline: { enabled: false }
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
      categories: dashboardData?.packageStats?.dayLabels || [],
      labels: {
        style: { colors: 'var(--mui-palette-text-secondary)' }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        style: { colors: 'var(--mui-palette-text-secondary)' }
      }
    },
    grid: {
      borderColor: 'var(--mui-palette-divider)',
      strokeDashArray: 4
    },
    tooltip: {
      theme: 'dark'
    },
    dataLabels: {
      enabled: false
    }
  }

  const deliveryChartSeries = [{
    name: 'Packages Delivered',
    data: dashboardData?.packageStats?.dailyDeliveries || []
  }]

  // Vehicle status chart
  const vehicleStatusChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'donut'
    },
    colors: ['#28C76F', '#7367F0', '#FF9F43', '#EA5455'],
    labels: ['Active', 'Available', 'Maintenance', 'Inactive'],
    legend: {
      show: true,
      position: 'bottom'
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val.toFixed(0)}%`
    },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            name: { show: true },
            value: { show: true, fontSize: '18px', fontWeight: 600 },
            total: {
              show: true,
              label: 'Total',
              fontSize: '14px',
              formatter: () => dashboardData?.vehicleStats?.total?.toString() || '0'
            }
          }
        }
      }
    }
  }

  const vehicleStatusChartSeries = [
    dashboardData?.vehicleStats?.active || 0,
    dashboardData?.vehicleStats?.available || 0,
    dashboardData?.vehicleStats?.maintenance || 0,
    dashboardData?.vehicleStats?.inactive || 0
  ]

  if (loading) {
    return (
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Card>
            <CardContent className='flex flex-wrap items-center justify-between gap-4'>
              <Skeleton variant='text' width={200} height={40} />
              <Box className='flex gap-4'>
                <Skeleton variant='rounded' width={140} height={40} />
                <Skeleton variant='rounded' width={100} height={40} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        {Array.from({ length: 4 }).map((_, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <StatCardSkeleton />
          </Grid>
        ))}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Skeleton variant='text' width='40%' height={40} />
              <Skeleton variant='rectangular' height={300} sx={{ mt: 2 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Skeleton variant='text' width='40%' height={40} />
              <Skeleton variant='circular' width={200} height={200} sx={{ mt: 2, mx: 'auto' }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    )
  }

  return (
    <Grid container spacing={6}>
      {/* Header with Filters */}
      <Grid item xs={12}>
        <Card>
          <CardContent className='flex flex-wrap items-center justify-between gap-4'>
            <Box>
              <Typography variant='h5' fontWeight={600}>
                Welcome back, {user?.name || 'User'}!
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Dashboard Overview for {months[selectedMonth].label} {selectedYear}
              </Typography>
            </Box>
            <Box className='flex items-center gap-4'>
              <FormControl size='small' sx={{ minWidth: 140 }}>
                <InputLabel>Month</InputLabel>
                <Select
                  value={selectedMonth}
                  label='Month'
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                >
                  {months.map((month) => (
                    <MenuItem key={month.value} value={month.value}>
                      {month.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size='small' sx={{ minWidth: 100 }}>
                <InputLabel>Year</InputLabel>
                <Select
                  value={selectedYear}
                  label='Year'
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  {years.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <IconButton onClick={fetchDashboardData} color='primary'>
                <i className='ri-refresh-line'></i>
              </IconButton>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Summary Stats */}
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title='Total Trips'
          value={dashboardData?.tripStats?.totalTrips || 0}
          subtitle={`${dashboardData?.tripStats?.completedTrips || 0} completed`}
          icon='ri-truck-line'
          color='primary'
          onClick={() => navigateToReport('daily-operations')}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title='Packages Delivered'
          value={(dashboardData?.packageStats?.deliveredPackages || 0).toLocaleString()}
          subtitle={`of ${(dashboardData?.packageStats?.totalPackages || 0).toLocaleString()} total`}
          icon='ri-archive-line'
          color='success'
          onClick={() => navigateToReport('delivery-performance')}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title='Active Vehicles'
          value={dashboardData?.vehicleStats?.active || 0}
          subtitle={`${dashboardData?.vehicleStats?.total || 0} total fleet`}
          icon='ri-car-line'
          color='info'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title='Delivery Rate'
          value={`${dashboardData?.packageStats?.deliveryRate || 0}%`}
          subtitle={`${dashboardData?.tripStats?.completionRate || 0}% trip completion`}
          icon='ri-percent-line'
          color='warning'
        />
      </Grid>

      {/* Delivery Trends Chart */}
      <Grid item xs={12} lg={8}>
        <Card>
          <CardHeader 
            title='Daily Delivery Trends' 
            subheader={`Packages delivered in ${months[selectedMonth].label}`}
            action={
              <Button 
                size='small' 
                variant='outlined'
                onClick={() => navigateToReport('delivery-performance')}
              >
                View Report
              </Button>
            }
          />
          <CardContent>
            <ApexChart
              type='area'
              height={320}
              options={deliveryChartOptions}
              series={deliveryChartSeries}
            />
          </CardContent>
        </Card>
      </Grid>

      {/* Vehicle Status */}
      <Grid item xs={12} lg={4}>
        <Card className='h-full'>
          <CardHeader title='Fleet Status' subheader='Current vehicle status distribution' />
          <CardContent>
            <ApexChart
              type='donut'
              height={280}
              options={vehicleStatusChartOptions}
              series={vehicleStatusChartSeries}
            />
          </CardContent>
        </Card>
      </Grid>

      {/* Driver Performance */}
      <Grid item xs={12} lg={7}>
        <Card>
          <CardHeader 
            title='Top Drivers' 
            subheader={`Performance for ${months[selectedMonth].label}`}
            action={
              <Button 
                size='small' 
                variant='outlined'
                onClick={() => navigateToReport('driver-performance')}
              >
                View All
              </Button>
            }
          />
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Driver</TableCell>
                  <TableCell align='center'>Trips</TableCell>
                  <TableCell align='center'>Completed</TableCell>
                  <TableCell align='center'>Completion Rate</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dashboardData?.driverPerformance?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align='center' className='py-8'>
                      <Typography variant='body2' color='text.secondary'>
                        No driver activity for this period
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  dashboardData?.driverPerformance?.slice(0, 5).map((driver: any, index: number) => (
                    <TableRow key={driver.driverId || index} hover>
                      <TableCell>
                        <Box className='flex items-center gap-3'>
                          <Avatar src={driver.avatar} alt={driver.driverName} sx={{ width: 36, height: 36 }}>
                            {driver.driverName?.charAt(0) || 'D'}
                          </Avatar>
                          <Box>
                            <Typography variant='body2' fontWeight={500}>
                              {driver.driverName || 'Unknown'}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align='center'>
                        <Typography variant='body2' fontWeight={500}>{driver.totalTrips || 0}</Typography>
                      </TableCell>
                      <TableCell align='center'>
                        <Chip size='small' label={driver.completedTrips || 0} color='success' variant='tonal' />
                      </TableCell>
                      <TableCell align='center'>
                        <Box className='flex items-center gap-2 justify-center'>
                          <LinearProgress 
                            variant='determinate' 
                            value={parseFloat(driver.completionRate) || 0} 
                            color={parseFloat(driver.completionRate) >= 80 ? 'success' : parseFloat(driver.completionRate) >= 50 ? 'warning' : 'error'}
                            sx={{ width: 60, height: 6, borderRadius: 3 }}
                          />
                          <Typography variant='caption' fontWeight={600}>{driver.completionRate || 0}%</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Grid>

      {/* Quick Actions & Summary */}
      <Grid item xs={12} lg={5}>
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
                    <Typography variant='h6' fontWeight={600}>{dashboardData?.tripStats?.totalTrips || 0}</Typography>
                  </Box>
                  <Box className='text-center'>
                    <Typography variant='caption' color='text.secondary'>Completed</Typography>
                    <Typography variant='h6' fontWeight={600} color='success.main'>{dashboardData?.tripStats?.completedTrips || 0}</Typography>
                  </Box>
                  <Box className='text-right'>
                    <Typography variant='caption' color='text.secondary'>Active</Typography>
                    <Typography variant='h6' fontWeight={600} color='info.main'>{dashboardData?.tripStats?.activeTrips || 0}</Typography>
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
                    <Typography variant='h6' fontWeight={600}>{(dashboardData?.packageStats?.totalPackages || 0).toLocaleString()}</Typography>
                  </Box>
                  <Box className='text-center'>
                    <Typography variant='caption' color='text.secondary'>Delivered</Typography>
                    <Typography variant='h6' fontWeight={600} color='success.main'>{(dashboardData?.packageStats?.deliveredPackages || 0).toLocaleString()}</Typography>
                  </Box>
                  <Box className='text-right'>
                    <Typography variant='caption' color='text.secondary'>Pending</Typography>
                    <Typography variant='h6' fontWeight={600} color='warning.main'>{(dashboardData?.packageStats?.pendingPackages || 0).toLocaleString()}</Typography>
                  </Box>
                </Box>
              </Box>

              <Divider />

              {/* Quick Links */}
              <Box>
                <Typography variant='subtitle2' fontWeight={600} className='mb-3'>Quick Actions</Typography>
                <Box className='flex flex-wrap gap-2'>
                  <Button 
                    size='small' 
                    variant='outlined'
                    startIcon={<i className='ri-add-line'></i>}
                    onClick={() => router.push('/edms/trips/create')}
                  >
                    New Trip
                  </Button>
                  <Button 
                    size='small' 
                    variant='outlined'
                    startIcon={<i className='ri-file-list-3-line'></i>}
                    onClick={() => router.push('/edms/manifests')}
                  >
                    Manifests
                  </Button>
                  <Button 
                    size='small' 
                    variant='outlined'
                    startIcon={<i className='ri-money-dollar-circle-line'></i>}
                    onClick={() => navigateToReport('revenue')}
                  >
                    Revenue
                  </Button>
                  <Button 
                    size='small' 
                    variant='outlined'
                    startIcon={<i className='ri-bar-chart-line'></i>}
                    onClick={() => navigateToReport('profitability')}
                  >
                    Profitability
                  </Button>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Route Statistics */}
      <Grid item xs={12}>
        <Card>
          <CardHeader 
            title='Route Performance' 
            subheader='Top performing routes'
            action={
              <Button 
                size='small' 
                variant='outlined'
                onClick={() => navigateToReport('route-analysis')}
              >
                View Analysis
              </Button>
            }
          />
          <CardContent>
            <Grid container spacing={4}>
              {dashboardData?.routeStats?.topRoutes?.slice(0, 4).map((route: any, index: number) => (
                <Grid item xs={12} sm={6} md={3} key={route.routeId || index}>
                  <Box className='p-4 rounded-lg' sx={{ bgcolor: 'action.hover', border: 1, borderColor: 'divider' }}>
                    <Box className='flex items-center gap-2 mb-2'>
                      <Avatar variant='rounded' sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
                        {index + 1}
                      </Avatar>
                      <Typography variant='subtitle2' fontWeight={600} noWrap>
                        {route.routeName || 'Unknown Route'}
                      </Typography>
                    </Box>
                    <Box className='flex justify-between mt-3'>
                      <Box>
                        <Typography variant='caption' color='text.secondary'>Trips</Typography>
                        <Typography variant='body1' fontWeight={600}>{route.tripCount || 0}</Typography>
                      </Box>
                      <Box className='text-right'>
                        <Typography variant='caption' color='text.secondary'>Utilization</Typography>
                        <Typography variant='body1' fontWeight={600} color='primary.main'>{route.utilizationScore || 0}%</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              ))}
              {(!dashboardData?.routeStats?.topRoutes || dashboardData?.routeStats?.topRoutes?.length === 0) && (
                <Grid item xs={12}>
                  <Box className='text-center py-8'>
                    <Typography variant='body2' color='text.secondary'>
                      No route data available for this period
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default EnhancedEDMSDashboard
