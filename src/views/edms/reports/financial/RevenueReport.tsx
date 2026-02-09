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
import Divider from '@mui/material/Divider'

// Chart Import
import dynamic from 'next/dynamic'
const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

// Action Imports
import { getRevenueReport } from '@/libs/actions/reports.actions'

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

const RevenueReport = () => {
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
      const data = await getRevenueReport(selectedMonth, selectedYear)
      setReportData(data)
    } catch (err) {
      console.error('Error fetching revenue report:', err)
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

  // Revenue trend chart options
  const chartLabels = reportData?.chartData?.labels || []
  const chartRevenue = reportData?.chartData?.revenue || []

  const revenueTrendChartOptions: ApexCharts.ApexOptions = {
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
      categories: chartLabels,
      labels: {
        style: { colors: 'var(--mui-palette-text-secondary)' }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      min: 0,
      labels: {
        style: { colors: 'var(--mui-palette-text-secondary)' },
        formatter: (val) => val != null ? `KES ${(val / 1000).toFixed(0)}K` : 'KES 0K'
      }
    },
    grid: {
      borderColor: 'var(--mui-palette-divider)',
      strokeDashArray: 4
    },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: (val) => val != null ? `KES ${val.toLocaleString()}` : 'KES 0'
      }
    },
    dataLabels: {
      enabled: false
    },
    noData: {
      text: 'No revenue data available',
      align: 'center',
      verticalAlign: 'middle'
    }
  }

  const revenueTrendChartSeries = [{
    name: 'Revenue',
    data: chartRevenue
  }]

  // Collection status chart
  const paidRevenue = reportData?.summary?.paidRevenue || 0
  const pendingRevenue = reportData?.summary?.pendingRevenue || 0
  const totalRevenue = reportData?.summary?.totalRevenue || 0
  const hasCollectionData = paidRevenue > 0 || pendingRevenue > 0

  const collectionChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'donut'
    },
    colors: ['#28C76F', '#FF9F43'],
    labels: ['Collected', 'Pending'],
    legend: {
      show: true,
      position: 'bottom'
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => val != null ? `${val.toFixed(1)}%` : '0%'
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            name: { show: true, fontSize: '14px' },
            value: { 
              show: true, 
              fontSize: '18px', 
              fontWeight: 600,
              formatter: (val) => val != null ? `KES ${Number(val).toLocaleString()}` : 'KES 0'
            },
            total: {
              show: true,
              label: 'Total Revenue',
              fontSize: '12px',
              formatter: () => `KES ${totalRevenue.toLocaleString()}`
            }
          }
        }
      }
    },
    noData: {
      text: 'No collection data',
      align: 'center',
      verticalAlign: 'middle'
    }
  }

  const collectionChartSeries = hasCollectionData ? [paidRevenue, pendingRevenue] : [0, 0]

  return (
    <Grid container spacing={6}>
      {/* Header with Filters */}
      <Grid item xs={12}>
        <Card>
          <CardContent className='flex flex-wrap items-center justify-between gap-4'>
            <Box>
              <Typography variant='h5' fontWeight={600}>
                Revenue Report
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Financial performance for {reportData.period.monthName} {reportData.period.year}
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
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title='Total Revenue'
          value={`KES ${reportData.summary.totalRevenue.toLocaleString()}`}
          icon='ri-money-dollar-circle-line'
          color='success'
          trend={reportData.comparison?.trend}
          trendValue={String(reportData.comparison?.change ?? 0)}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title='Collected'
          value={`KES ${reportData.summary.paidRevenue.toLocaleString()}`}
          subtitle={`${reportData.summary.collectionRate}% collection rate`}
          icon='ri-checkbox-circle-line'
          color='primary'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title='Pending Collection'
          value={`KES ${reportData.summary.pendingRevenue.toLocaleString()}`}
          icon='ri-time-line'
          color='warning'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title='Avg per Trip'
          value={`KES ${Number(reportData.summary.avgRevenuePerTrip).toLocaleString()}`}
          subtitle={`${reportData.summary.totalTrips} completed trips`}
          icon='ri-bar-chart-line'
          color='info'
        />
      </Grid>

      {/* Revenue Trend Chart */}
      <Grid item xs={12} lg={8}>
        <Card>
          <CardHeader title='Daily Revenue Trend' subheader='Revenue generated each day' />
          <CardContent>
            <Box sx={{ minHeight: 350 }}>
              {chartMounted && (
                <ApexChart
                  type='area'
                  height={350}
                  width='100%'
                  options={revenueTrendChartOptions}
                  series={revenueTrendChartSeries}
                />
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Collection Status */}
      <Grid item xs={12} lg={4}>
        <Card className='h-full'>
          <CardHeader title='Collection Status' subheader='Revenue collection breakdown' />
          <CardContent>
            <Box sx={{ minHeight: 280 }}>
              {chartMounted && hasCollectionData ? (
                <ApexChart
                  type='donut'
                  height={280}
                  width='100%'
                  options={collectionChartOptions}
                  series={collectionChartSeries}
                />
              ) : chartMounted ? (
                <Box className='flex items-center justify-center' sx={{ height: 280 }}>
                  <Typography variant='body2' color='text.secondary'>No collection data available</Typography>
                </Box>
              ) : null}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Month Comparison */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title='Month Comparison' />
          <CardContent>
            <Box className='flex flex-col gap-4'>
              <Box className='p-4 rounded-lg' sx={{ bgcolor: 'success.lightOpacity' }}>
                <Box className='flex justify-between items-center mb-2'>
                  <Typography variant='body2'>Current Month</Typography>
                  <Typography variant='h6' fontWeight={600} color='success.main'>
                    KES {reportData.summary.totalRevenue.toLocaleString()}
                  </Typography>
                </Box>
                <Typography variant='caption' color='text.secondary'>
                  {reportData.period.monthName} {reportData.period.year}
                </Typography>
              </Box>

              <Box className='p-4 rounded-lg' sx={{ bgcolor: 'action.hover' }}>
                <Box className='flex justify-between items-center mb-2'>
                  <Typography variant='body2'>Previous Month</Typography>
                  <Typography variant='h6' fontWeight={600}>
                    KES {reportData.comparison.previousMonth.toLocaleString()}
                  </Typography>
                </Box>
                <Typography variant='caption' color='text.secondary'>
                  {months[(selectedMonth === 0 ? 11 : selectedMonth - 1)].label} {selectedMonth === 0 ? selectedYear - 1 : selectedYear}
                </Typography>
              </Box>

              <Divider />

              <Box className='flex justify-between items-center'>
                <Typography variant='body2'>Change</Typography>
                <Box className='flex items-center gap-2'>
                  <i className={`ri-arrow-${reportData.comparison.trend === 'up' ? 'up' : 'down'}-line text-${reportData.comparison.trend === 'up' ? 'success' : 'error'}`}></i>
                  <Typography 
                    variant='h6' 
                    fontWeight={600}
                    color={reportData.comparison.trend === 'up' ? 'success.main' : 'error.main'}
                  >
                    {reportData.comparison.change}%
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Key Metrics */}
      <Grid item xs={12} md={6}>
        <Card className='h-full'>
          <CardHeader title='Key Revenue Metrics' />
          <CardContent>
            <Box className='flex flex-col gap-4'>
              <Box>
                <Box className='flex justify-between mb-2'>
                  <Typography variant='body2'>Collection Rate</Typography>
                  <Typography variant='body2' fontWeight={600}>{reportData.summary.collectionRate}%</Typography>
                </Box>
                <LinearProgress 
                  variant='determinate' 
                  value={parseFloat(reportData.summary.collectionRate)} 
                  color='success'
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>

              <Divider />

              <Box className='flex justify-between items-center p-3 rounded' sx={{ bgcolor: 'action.hover' }}>
                <Box className='flex items-center gap-3'>
                  <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity', color: 'primary.main', width: 40, height: 40 }}>
                    <i className='ri-truck-line'></i>
                  </Avatar>
                  <Box>
                    <Typography variant='body2' fontWeight={500}>Completed Trips</Typography>
                    <Typography variant='caption' color='text.secondary'>Revenue-generating trips</Typography>
                  </Box>
                </Box>
                <Typography variant='h6' fontWeight={600}>{reportData.summary.totalTrips}</Typography>
              </Box>

              <Box className='flex justify-between items-center p-3 rounded' sx={{ bgcolor: 'action.hover' }}>
                <Box className='flex items-center gap-3'>
                  <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity', color: 'success.main', width: 40, height: 40 }}>
                    <i className='ri-coins-line'></i>
                  </Avatar>
                  <Box>
                    <Typography variant='body2' fontWeight={500}>Average Revenue</Typography>
                    <Typography variant='caption' color='text.secondary'>Per completed trip</Typography>
                  </Box>
                </Box>
                <Typography variant='h6' fontWeight={600}>KES {Number(reportData.summary.avgRevenuePerTrip).toLocaleString()}</Typography>
              </Box>

              <Box className='flex justify-between items-center p-3 rounded' sx={{ bgcolor: 'action.hover' }}>
                <Box className='flex items-center gap-3'>
                  <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity', color: 'warning.main', width: 40, height: 40 }}>
                    <i className='ri-calendar-line'></i>
                  </Avatar>
                  <Box>
                    <Typography variant='body2' fontWeight={500}>Days in Period</Typography>
                    <Typography variant='caption' color='text.secondary'>Active tracking days</Typography>
                  </Box>
                </Box>
                <Typography variant='h6' fontWeight={600}>{reportData.dailyRevenue.length}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default RevenueReport
