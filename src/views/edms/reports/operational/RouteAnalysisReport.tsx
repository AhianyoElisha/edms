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
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'

// Chart Import
import dynamic from 'next/dynamic'
const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

// Action Imports
import { getRouteAnalysisReport } from '@/libs/actions/reports.actions'

// Stat Card Component
const StatCard = ({ title, value, subtitle, icon, color = 'primary' }: {
  title: string
  value: string | number
  subtitle?: string
  icon: string
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info'
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
        <Box>
          <Typography variant='h5' fontWeight={600}>{value}</Typography>
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

const RouteAnalysisReport = () => {
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
      const data = await getRouteAnalysisReport(selectedMonth, selectedYear)
      setReportData(data)
    } catch (err) {
      console.error('Error fetching route analysis report:', err)
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

  // Chart options for top routes
  const topRoutes = reportData?.topRoutes || []
  const topRoutesSlice = topRoutes.slice(0, 8)
  const hasTopRoutesData = topRoutesSlice.length > 0
  const allRoutes = reportData?.routes || []

  const topRoutesChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'bar',
      toolbar: { show: false }
    },
    colors: ['#28C76F', '#7367F0'],
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: false,
        columnWidth: '50%'
      }
    },
    dataLabels: {
      enabled: false
    },
    xaxis: {
      categories: topRoutesSlice.map((r: any) => (r.routeName || 'Unknown').substring(0, 15)),
      labels: {
        style: { colors: 'var(--mui-palette-text-secondary)', fontSize: '10px' },
        rotate: -45,
        rotateAlways: true
      }
    },
    yaxis: [
      {
        title: { text: 'Trips' },
        labels: {
          style: { colors: 'var(--mui-palette-text-secondary)' }
        }
      },
      {
        opposite: true,
        title: { text: 'Revenue (GH₵)' },
        labels: {
          style: { colors: 'var(--mui-palette-text-secondary)' },
          formatter: (val) => val != null ? `${(val / 1000).toFixed(0)}K` : '0K'
        }
      }
    ],
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
      text: 'No route data available',
      align: 'center',
      verticalAlign: 'middle'
    }
  }

  const topRoutesChartSeries = [
    { name: 'Trips', data: topRoutesSlice.map((r: any) => r.totalTrips || 0) },
    { name: 'Revenue', data: topRoutesSlice.map((r: any) => r.totalRevenue || 0) }
  ]

  // Utilization chart
  const utilizationChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'donut'
    },
    colors: ['#28C76F', '#7367F0', '#FF9F43', '#EA5455'],
    labels: ['High (70%+)', 'Medium (40-70%)', 'Low (10-40%)', 'Unused (<10%)'],
    legend: {
      show: true,
      position: 'bottom'
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => val != null ? `${val.toFixed(0)}%` : '0%'
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
              label: 'Total Routes',
              fontSize: '14px',
              formatter: () => String(reportData?.totalRoutes || 0)
            }
          }
        }
      }
    },
    noData: {
      text: 'No route data',
      align: 'center',
      verticalAlign: 'middle'
    }
  }

  // Calculate utilization distribution
  const utilizationData = allRoutes.reduce((acc: any, route: any) => {
    const score = route.utilizationScore || 0
    if (score >= 70) acc.high++
    else if (score >= 40) acc.medium++
    else if (score >= 10) acc.low++
    else acc.unused++
    return acc
  }, { high: 0, medium: 0, low: 0, unused: 0 })

  const utilizationChartSeries = [utilizationData.high, utilizationData.medium, utilizationData.low, utilizationData.unused]
  const hasUtilizationData = utilizationChartSeries.some((v: number) => v > 0)

  return (
    <Grid container spacing={6}>
      {/* Header with Filters */}
      <Grid item xs={12}>
        <Card>
          <CardContent className='flex flex-wrap items-center justify-between gap-4'>
            <Box>
              <Typography variant='h5' fontWeight={600}>
                Route Analysis Report
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Route performance for {reportData.period.monthName} {reportData.period.year}
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
          title='Total Routes'
          value={reportData.totalRoutes}
          subtitle={`${reportData.activeRoutes} active`}
          icon='ri-road-map-line'
          color='primary'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title='Total Trips'
          value={reportData.summary.totalTrips}
          icon='ri-truck-line'
          color='success'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title='Total Revenue'
          value={`GH₵ ${reportData.summary.totalRevenue.toLocaleString()}`}
          icon='ri-money-dollar-circle-line'
          color='info'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title='Avg Trips/Route'
          value={reportData.summary.avgTripsPerRoute}
          icon='ri-bar-chart-line'
          color='warning'
        />
      </Grid>

      {/* Top Routes Chart */}
      <Grid item xs={12} lg={8}>
        <Card>
          <CardHeader title='Top Routes Performance' subheader='Trips and revenue by route' />
          <CardContent>
            <Box sx={{ minHeight: 350 }}>
              {chartMounted && hasTopRoutesData ? (
                <ApexChart
                  type='bar'
                  height={350}
                  width='100%'
                  options={topRoutesChartOptions}
                  series={topRoutesChartSeries}
                />
              ) : chartMounted ? (
                <Box className='text-center py-12'>
                  <Typography variant='body2' color='text.secondary'>
                    No route data available
                  </Typography>
                </Box>
              ) : null}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Utilization Distribution */}
      <Grid item xs={12} lg={4}>
        <Card className='h-full'>
          <CardHeader title='Route Utilization' subheader='Distribution by usage level' />
          <CardContent>
            <Box sx={{ minHeight: 300 }}>
              {chartMounted && hasUtilizationData ? (
                <ApexChart
                  type='donut'
                  height={300}
                  width='100%'
                  options={utilizationChartOptions}
                  series={utilizationChartSeries}
                />
              ) : chartMounted ? (
                <Box className='text-center py-12'>
                  <Typography variant='body2' color='text.secondary'>
                    No utilization data available
                  </Typography>
                </Box>
              ) : null}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Top Routes Cards */}
      <Grid item xs={12}>
        <Card>
          <CardHeader title='Top Performing Routes' subheader='Routes with highest trip volume' />
          <CardContent>
            <Grid container spacing={4}>
              {reportData.topRoutes.slice(0, 6).map((route: any, index: number) => (
                <Grid item xs={12} sm={6} md={4} key={route.routeId}>
                  <Card variant='outlined'>
                    <CardContent>
                      <Box className='flex items-center justify-between mb-3'>
                        <Box className='flex items-center gap-2'>
                          <Avatar 
                            variant='rounded' 
                            sx={{ 
                              width: 32, 
                              height: 32, 
                              bgcolor: index < 3 ? 'primary.main' : 'action.selected',
                              fontSize: '0.875rem'
                            }}
                          >
                            {index + 1}
                          </Avatar>
                          <Typography variant='subtitle2' fontWeight={600} noWrap sx={{ maxWidth: 150 }}>
                            {route.routeName || 'Unknown Route'}
                          </Typography>
                        </Box>
                        <Chip 
                          size='small' 
                          label={route.status || 'active'} 
                          color={route.status === 'active' ? 'success' : 'default'}
                          variant='tonal'
                        />
                      </Box>
                      
                      <Box className='mb-3'>
                        <Typography variant='caption' color='text.secondary' className='block'>
                          <i className='ri-map-pin-line mr-1'></i>
                          {route.origin || 'N/A'}
                        </Typography>
                        <Typography variant='caption' color='text.secondary' className='block'>
                          <i className='ri-map-pin-2-line mr-1'></i>
                          {route.destination?.substring(0, 40) || 'N/A'}
                        </Typography>
                      </Box>

                      <Box className='flex justify-between items-center mb-2'>
                        <Typography variant='caption'>Utilization</Typography>
                        <Typography variant='caption' fontWeight={600}>{route.utilizationScore}%</Typography>
                      </Box>
                      <LinearProgress 
                        variant='determinate' 
                        value={route.utilizationScore} 
                        color={route.utilizationScore >= 70 ? 'success' : route.utilizationScore >= 40 ? 'warning' : 'error'}
                        sx={{ height: 6, borderRadius: 3, mb: 2 }}
                      />

                      <Box className='flex justify-between'>
                        <Box>
                          <Typography variant='caption' color='text.secondary'>Trips</Typography>
                          <Typography variant='body2' fontWeight={600}>{route.totalTrips}</Typography>
                        </Box>
                        <Box className='text-right'>
                          <Typography variant='caption' color='text.secondary'>Revenue</Typography>
                          <Typography variant='body2' fontWeight={600} color='success.main'>
                            GH₵ {Number(route.totalRevenue).toLocaleString()}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* All Routes Table */}
      <Grid item xs={12}>
        <Card>
          <CardHeader 
            title='All Routes Performance' 
            subheader={`${reportData.routes.length} routes in system`}
          />
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Route Name</TableCell>
                  <TableCell>Origin</TableCell>
                  <TableCell>Destination</TableCell>
                  <TableCell align='center'>Total Trips</TableCell>
                  <TableCell align='center'>Completed</TableCell>
                  <TableCell align='center'>Completion Rate</TableCell>
                  <TableCell align='right'>Revenue</TableCell>
                  <TableCell align='center'>Utilization</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.routes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align='center' className='py-8'>
                      <Typography variant='body2' color='text.secondary'>
                        No routes found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData.routes.map((route: any) => (
                    <TableRow key={route.routeId} hover>
                      <TableCell>
                        <Typography variant='body2' fontWeight={500}>
                          {route.routeName || 'Unknown'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary' noWrap sx={{ maxWidth: 150 }}>
                          {route.origin || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary' noWrap sx={{ maxWidth: 150 }}>
                          {route.destination?.substring(0, 30) || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell align='center'>
                        <Typography variant='body2' fontWeight={500}>{route.totalTrips}</Typography>
                      </TableCell>
                      <TableCell align='center'>
                        <Chip size='small' label={route.completedTrips} color='success' variant='tonal' />
                      </TableCell>
                      <TableCell align='center'>
                        <Typography variant='body2' fontWeight={500}>{route.completionRate}%</Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' color='success.main' fontWeight={500}>
                          GH₵ {Number(route.totalRevenue).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align='center'>
                        <Box className='flex items-center gap-2'>
                          <LinearProgress 
                            variant='determinate' 
                            value={route.utilizationScore} 
                            color={route.utilizationScore >= 70 ? 'success' : route.utilizationScore >= 40 ? 'warning' : 'error'}
                            sx={{ width: 50, height: 6, borderRadius: 3 }}
                          />
                          <Typography variant='caption' fontWeight={600}>{route.utilizationScore}%</Typography>
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
    </Grid>
  )
}

export default RouteAnalysisReport
