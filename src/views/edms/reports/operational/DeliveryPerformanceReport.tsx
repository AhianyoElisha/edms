'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Avatar from '@mui/material/Avatar'
import LinearProgress from '@mui/material/LinearProgress'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'

// Chart Import
import dynamic from 'next/dynamic'
const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

// Action Imports
import { getDeliveryPerformanceReport } from '@/libs/actions/reports.actions'

// Stat Card Component
const StatCard = ({ title, value, subtitle, icon, color = 'primary', trend, trendValue }: {
  title: string
  value: string | number
  subtitle?: string
  icon: string
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  trend?: 'up' | 'down'
  trendValue?: string
}) => {
  const colorMap = {
    primary: { bg: 'var(--mui-palette-primary-lightOpacity)', text: 'var(--mui-palette-primary-main)' },
    success: { bg: 'var(--mui-palette-success-lightOpacity)', text: 'var(--mui-palette-success-main)' },
    warning: { bg: 'var(--mui-palette-warning-lightOpacity)', text: 'var(--mui-palette-warning-main)' },
    error: { bg: 'var(--mui-palette-error-lightOpacity)', text: 'var(--mui-palette-error-main)' },
    info: { bg: 'var(--mui-palette-info-lightOpacity)', text: 'var(--mui-palette-info-main)' }
  }

  return (
    <Card>
      <CardContent className='flex items-center gap-4'>
        <Avatar
          variant='rounded'
          sx={{
            width: 50,
            height: 50,
            backgroundColor: colorMap[color].bg,
            color: colorMap[color].text
          }}
        >
          <i className={`${icon} text-2xl`}></i>
        </Avatar>
        <Box className='flex-grow'>
          <Box className='flex items-center gap-2'>
            <Typography variant='h5' fontWeight={600}>{value}</Typography>
            {trend && trendValue && (
              <Chip 
                size='small' 
                label={`${trend === 'up' ? '+' : ''}${trendValue}%`}
                color={trend === 'up' ? 'success' : 'error'}
                variant='tonal'
              />
            )}
          </Box>
          <Typography variant='body2' color='text.secondary'>{title}</Typography>
          {subtitle && (
            <Typography variant='caption' color='text.disabled'>{subtitle}</Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}

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

const DeliveryPerformanceReport = () => {
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [reportData, setReportData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [chartMounted, setChartMounted] = useState(false)

  const fetchReport = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getDeliveryPerformanceReport(selectedMonth, selectedYear)
      setReportData(data)
    } catch (err) {
      console.error('Error fetching delivery performance report:', err)
      setError('Failed to fetch report data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [selectedMonth, selectedYear])

  useEffect(() => {
    const timer = setTimeout(() => setChartMounted(true), 300)
    return () => clearTimeout(timer)
  }, [])

  // Generate year options
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  if (loading) {
    return (
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Skeleton variant='text' width='40%' height={40} />
              <Skeleton variant='rectangular' height={200} sx={{ mt: 2 }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    )
  }

  if (error || !reportData) {
    return (
      <Card>
        <CardContent className='text-center py-12'>
          <i className='ri-error-warning-line text-5xl text-error mb-4'></i>
          <Typography variant='h6' color='error'>{error || 'No data available'}</Typography>
          <Button variant='contained' onClick={fetchReport} className='mt-4'>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Chart options for delivery trends
  const chartLabels = reportData?.chartData?.labels || []
  const chartTrips = reportData?.chartData?.trips || []
  const chartDeliveries = reportData?.chartData?.deliveries || []

  const deliveryChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'area',
      toolbar: { show: false },
      sparkline: { enabled: false }
    },
    colors: ['#7367F0', '#28C76F'],
    stroke: {
      curve: 'smooth',
      width: 2
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 90, 100]
      }
    },
    xaxis: {
      categories: chartLabels,
      labels: {
        style: { colors: 'var(--mui-palette-text-secondary)' }
      }
    },
    yaxis: {
      min: 0,
      labels: {
        style: { colors: 'var(--mui-palette-text-secondary)' }
      }
    },
    legend: {
      show: true,
      position: 'top'
    },
    grid: {
      borderColor: 'var(--mui-palette-divider)'
    },
    tooltip: {
      theme: 'dark'
    },
    noData: {
      text: 'No delivery data available',
      align: 'center',
      verticalAlign: 'middle'
    }
  }

  const deliveryChartSeries = [
    { name: 'Completed Trips', data: chartTrips },
    { name: 'Delivered Packages', data: chartDeliveries }
  ]

  return (
    <Grid container spacing={6}>
      {/* Header with Filters */}
      <Grid item xs={12}>
        <Card>
          <CardContent className='flex flex-wrap items-center justify-between gap-4'>
            <Box>
              <Typography variant='h5' fontWeight={600}>
                Delivery Performance Report
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Performance metrics for {reportData.period.monthName} {reportData.period.year}
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
              <IconButton onClick={fetchReport} color='primary'>
                <i className='ri-refresh-line'></i>
              </IconButton>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Summary Stats */}
      <Grid item xs={12} sm={6} md={4}>
        <StatCard
          title='Total Trips'
          value={reportData.summary.totalTrips}
          subtitle={`${reportData.summary.completedTrips} completed`}
          icon='ri-truck-line'
          color='primary'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard
          title='Trip Completion Rate'
          value={`${reportData.summary.tripCompletionRate}%`}
          icon='ri-checkbox-circle-line'
          color='success'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard
          title='Total Manifests'
          value={reportData.summary.totalManifests}
          subtitle={`${reportData.summary.deliveredManifests} delivered`}
          icon='ri-file-list-3-line'
          color='info'
        />
      </Grid>

      {/* Package Stats */}
      <Grid item xs={12} sm={6} md={4}>
        <StatCard
          title='Total Packages'
          value={reportData.summary.totalPackages.toLocaleString()}
          icon='ri-archive-line'
          color='warning'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard
          title='Delivered Packages'
          value={reportData.summary.deliveredPackages.toLocaleString()}
          icon='ri-checkbox-circle-line'
          color='success'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard
          title='Package Delivery Rate'
          value={`${reportData.summary.packageDeliveryRate}%`}
          icon='ri-percent-line'
          color='primary'
        />
      </Grid>

      {/* Delivery Trends Chart */}
      <Grid item xs={12} lg={8}>
        <Card>
          <CardHeader title='Daily Delivery Trends' />
          <CardContent>
            <Box sx={{ minHeight: 350 }}>
              {chartMounted && (
                <ApexChart
                  type='area'
                  height={350}
                  width='100%'
                  options={deliveryChartOptions}
                  series={deliveryChartSeries}
                />
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Performance Summary */}
      <Grid item xs={12} lg={4}>
        <Card className='h-full'>
          <CardHeader title='Performance Summary' />
          <CardContent>
            <Box className='flex flex-col gap-4'>
              <Box>
                <Box className='flex justify-between mb-2'>
                  <Typography variant='body2'>Trip Completion</Typography>
                  <Typography variant='body2' fontWeight={600}>{reportData.summary.tripCompletionRate}%</Typography>
                </Box>
                <LinearProgress 
                  variant='determinate' 
                  value={parseFloat(reportData.summary.tripCompletionRate)} 
                  color='primary'
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
              <Box>
                <Box className='flex justify-between mb-2'>
                  <Typography variant='body2'>Manifest Delivery</Typography>
                  <Typography variant='body2' fontWeight={600}>{reportData.summary.manifestDeliveryRate}%</Typography>
                </Box>
                <LinearProgress 
                  variant='determinate' 
                  value={parseFloat(reportData.summary.manifestDeliveryRate)} 
                  color='success'
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
              <Box>
                <Box className='flex justify-between mb-2'>
                  <Typography variant='body2'>Package Delivery</Typography>
                  <Typography variant='body2' fontWeight={600}>{reportData.summary.packageDeliveryRate}%</Typography>
                </Box>
                <LinearProgress 
                  variant='determinate' 
                  value={parseFloat(reportData.summary.packageDeliveryRate)} 
                  color='info'
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
            </Box>

            {/* Key Insights */}
            <Box className='mt-6 p-4 rounded-lg' sx={{ bgcolor: 'action.hover' }}>
              <Typography variant='subtitle2' fontWeight={600} className='mb-3'>
                Key Insights
              </Typography>
              <Box className='flex flex-col gap-2'>
                <Box className='flex items-center gap-2'>
                  <i className='ri-arrow-right-s-line text-primary'></i>
                  <Typography variant='caption'>
                    {reportData.summary.completedTrips} of {reportData.summary.totalTrips} trips completed
                  </Typography>
                </Box>
                <Box className='flex items-center gap-2'>
                  <i className='ri-arrow-right-s-line text-primary'></i>
                  <Typography variant='caption'>
                    {reportData.summary.deliveredPackages.toLocaleString()} packages delivered this month
                  </Typography>
                </Box>
                <Box className='flex items-center gap-2'>
                  <i className='ri-arrow-right-s-line text-primary'></i>
                  <Typography variant='caption'>
                    Avg. {Math.round(reportData.summary.deliveredPackages / (reportData.dailyStats.length || 1))} packages/day
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Daily Breakdown */}
      <Grid item xs={12}>
        <Card>
          <CardHeader title='Daily Breakdown' />
          <CardContent>
            <Box sx={{ overflowX: 'auto' }}>
              <Box className='flex gap-2' sx={{ minWidth: reportData.dailyStats.length * 60 }}>
                {reportData.dailyStats.map((day: any, index: number) => (
                  <Box 
                    key={index} 
                    className='flex flex-col items-center p-2 rounded-lg min-w-[50px]'
                    sx={{ 
                      bgcolor: day.completedTrips > 0 ? 'primary.lightOpacity' : 'action.hover',
                      border: 1,
                      borderColor: day.completedTrips > 0 ? 'primary.main' : 'divider'
                    }}
                  >
                    <Typography variant='caption' fontWeight={600}>{day.day}</Typography>
                    <Typography variant='caption' color='text.secondary'>{day.trips} trips</Typography>
                    <Typography variant='caption' color='success.main'>{day.deliveredPackages} pkg</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default DeliveryPerformanceReport
