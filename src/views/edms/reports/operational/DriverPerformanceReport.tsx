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
import Tooltip from '@mui/material/Tooltip'

// Chart Import
import dynamic from 'next/dynamic'
const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

// Action Imports
import { getDriverPerformanceReport } from '@/libs/actions/reports.actions'

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

const DriverPerformanceReport = () => {
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
      const data = await getDriverPerformanceReport(selectedMonth, selectedYear)
      setReportData(data)
    } catch (err) {
      console.error('Error fetching driver performance report:', err)
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

  // Chart options for top performers
  const topPerformers = reportData?.topPerformers || []
  const hasPerformerData = topPerformers.length > 0

  const performerChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'bar',
      toolbar: { show: false }
    },
    colors: ['#7367F0'],
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: true,
        barHeight: '60%'
      }
    },
    xaxis: {
      categories: topPerformers.map((d: any) => d.driverName?.split(' ')[0] || 'Unknown'),
      labels: {
        style: { colors: 'var(--mui-palette-text-secondary)' }
      }
    },
    yaxis: {
      labels: {
        style: { colors: 'var(--mui-palette-text-secondary)' }
      }
    },
    grid: {
      borderColor: 'var(--mui-palette-divider)'
    },
    tooltip: {
      theme: 'dark'
    },
    noData: {
      text: 'No driver data available',
      align: 'center',
      verticalAlign: 'middle'
    }
  }

  const performerChartSeries = [{
    name: 'Completed Trips',
    data: topPerformers.map((d: any) => d.completedTrips || 0)
  }]

  return (
    <Grid container spacing={6}>
      {/* Header with Filters */}
      <Grid item xs={12}>
        <Card>
          <CardContent className='flex flex-wrap items-center justify-between gap-4'>
            <Box>
              <Typography variant='h5' fontWeight={600}>
                Driver Performance Report
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Driver metrics for {reportData.period.monthName} {reportData.period.year}
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
          title='Active Drivers'
          value={reportData.totalDrivers}
          subtitle='with trips this month'
          icon='ri-user-line'
          color='primary'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title='Total Trips'
          value={reportData.summary.totalTrips}
          subtitle={`${reportData.summary.completedTrips} completed`}
          icon='ri-truck-line'
          color='success'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title='Total Revenue'
          value={`KES ${reportData.summary.totalRevenue.toLocaleString()}`}
          icon='ri-money-dollar-circle-line'
          color='info'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title='Total Expenses'
          value={`KES ${reportData.summary.totalExpenses.toLocaleString()}`}
          icon='ri-wallet-3-line'
          color='warning'
        />
      </Grid>

      {/* Top Performers Chart */}
      <Grid item xs={12} lg={5}>
        <Card className='h-full'>
          <CardHeader title='Top Performers' subheader='By completed trips' />
          <CardContent>
            <Box sx={{ minHeight: 300 }}>
              {chartMounted && hasPerformerData ? (
                <ApexChart
                  type='bar'
                  height={300}
                  width='100%'
                  options={performerChartOptions}
                  series={performerChartSeries}
                />
              ) : chartMounted ? (
                <Box className='text-center py-12'>
                  <Typography variant='body2' color='text.secondary'>
                    No driver data available
                  </Typography>
                </Box>
              ) : null}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Top Performers List */}
      <Grid item xs={12} lg={7}>
        <Card className='h-full'>
          <CardHeader title='Driver Leaderboard' subheader='Top 5 performers this month' />
          <CardContent>
            <Box className='flex flex-col gap-4'>
              {reportData.topPerformers.slice(0, 5).map((driver: any, index: number) => (
                <Box 
                  key={driver.driverId} 
                  className='flex items-center gap-4 p-3 rounded-lg'
                  sx={{ bgcolor: index === 0 ? 'primary.lightOpacity' : 'action.hover' }}
                >
                  <Box className='flex items-center justify-center w-8'>
                    {index === 0 ? (
                      <i className='ri-medal-fill text-xl text-warning'></i>
                    ) : index === 1 ? (
                      <i className='ri-medal-fill text-xl' style={{ color: '#C0C0C0' }}></i>
                    ) : index === 2 ? (
                      <i className='ri-medal-fill text-xl' style={{ color: '#CD7F32' }}></i>
                    ) : (
                      <Typography variant='body2' fontWeight={600}>{index + 1}</Typography>
                    )}
                  </Box>
                  <Avatar src={driver.avatar} alt={driver.driverName}>
                    {driver.driverName?.charAt(0) || 'D'}
                  </Avatar>
                  <Box className='flex-grow'>
                    <Typography variant='body1' fontWeight={500}>{driver.driverName || 'Unknown Driver'}</Typography>
                    <Typography variant='caption' color='text.secondary'>{driver.email}</Typography>
                  </Box>
                  <Box className='text-right'>
                    <Typography variant='body2' fontWeight={600}>{driver.completedTrips} trips</Typography>
                    <Typography variant='caption' color='success.main'>
                      KES {Number(driver.totalRevenue).toLocaleString()}
                    </Typography>
                  </Box>
                  <Chip 
                    size='small' 
                    label={`${driver.completionRate}%`}
                    color={parseFloat(driver.completionRate) >= 80 ? 'success' : parseFloat(driver.completionRate) >= 50 ? 'warning' : 'error'}
                    variant='tonal'
                  />
                </Box>
              ))}
              {reportData.topPerformers.length === 0 && (
                <Box className='text-center py-8'>
                  <Typography variant='body2' color='text.secondary'>
                    No driver data available for this period
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* All Drivers Table */}
      <Grid item xs={12}>
        <Card>
          <CardHeader 
            title='All Driver Performance' 
            subheader={`${reportData.drivers.length} drivers with activity this month`}
          />
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Driver</TableCell>
                  <TableCell align='center'>Total Trips</TableCell>
                  <TableCell align='center'>Completed</TableCell>
                  <TableCell align='center'>Cancelled</TableCell>
                  <TableCell align='center'>Completion Rate</TableCell>
                  <TableCell align='right'>Revenue</TableCell>
                  <TableCell align='right'>Expenses</TableCell>
                  <TableCell align='right'>Profit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.drivers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align='center' className='py-8'>
                      <Typography variant='body2' color='text.secondary'>
                        No driver activity recorded for this period
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData.drivers.map((driver: any) => (
                    <TableRow key={driver.driverId} hover>
                      <TableCell>
                        <Box className='flex items-center gap-3'>
                          <Avatar src={driver.avatar} alt={driver.driverName} sx={{ width: 36, height: 36 }}>
                            {driver.driverName?.charAt(0) || 'D'}
                          </Avatar>
                          <Box>
                            <Typography variant='body2' fontWeight={500}>
                              {driver.driverName || 'Unknown'}
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {driver.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align='center'>
                        <Typography variant='body2' fontWeight={500}>{driver.totalTrips}</Typography>
                      </TableCell>
                      <TableCell align='center'>
                        <Chip size='small' label={driver.completedTrips} color='success' variant='tonal' />
                      </TableCell>
                      <TableCell align='center'>
                        <Chip size='small' label={driver.cancelledTrips} color='error' variant='tonal' />
                      </TableCell>
                      <TableCell align='center'>
                        <Box className='flex items-center gap-2'>
                          <LinearProgress 
                            variant='determinate' 
                            value={parseFloat(driver.completionRate)} 
                            color={parseFloat(driver.completionRate) >= 80 ? 'success' : parseFloat(driver.completionRate) >= 50 ? 'warning' : 'error'}
                            sx={{ width: 60, height: 6, borderRadius: 3 }}
                          />
                          <Typography variant='caption' fontWeight={600}>{driver.completionRate}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' color='success.main' fontWeight={500}>
                          KES {Number(driver.totalRevenue).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' color='error.main' fontWeight={500}>
                          KES {Number(driver.totalExpenses).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography 
                          variant='body2' 
                          fontWeight={600}
                          color={driver.profit >= 0 ? 'success.main' : 'error.main'}
                        >
                          KES {Number(driver.profit).toLocaleString()}
                        </Typography>
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

export default DriverPerformanceReport
