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
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Divider from '@mui/material/Divider'
import Avatar from '@mui/material/Avatar'
import LinearProgress from '@mui/material/LinearProgress'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'

// Date Picker Imports
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers-pro'
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs'
import dayjs, { Dayjs } from 'dayjs'

// Action Imports
import { getDailyOperationsReport } from '@/libs/actions/reports.actions'

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

// Trip Status Chip
const TripStatusChip = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
    completed: { label: 'Completed', color: 'success' },
    in_progress: { label: 'In Progress', color: 'info' },
    scheduled: { label: 'Scheduled', color: 'warning' },
    cancelled: { label: 'Cancelled', color: 'error' }
  }

  const config = statusConfig[status] || { label: status, color: 'default' }
  return <Chip size='small' label={config.label} color={config.color} variant='tonal' />
}

const DailyOperationsReport = () => {
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs())
  const [reportData, setReportData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getDailyOperationsReport(selectedDate?.toISOString())
      setReportData(data)
    } catch (err) {
      console.error('Error fetching daily operations report:', err)
      setError('Failed to fetch report data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [selectedDate])

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

  return (
    <Grid container spacing={6}>
      {/* Header with Date Picker */}
      <Grid item xs={12}>
        <Card>
          <CardContent className='flex flex-wrap items-center justify-between gap-4'>
            <Box>
              <Typography variant='h5' fontWeight={600}>
                Daily Operations Report
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Overview of operations for {dayjs(reportData.date).format('MMMM D, YYYY')}
              </Typography>
            </Box>
            <Box className='flex items-center gap-4'>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label='Select Date'
                  value={selectedDate}
                  onChange={(newValue) => setSelectedDate(newValue)}
                  slotProps={{
                    textField: { size: 'small' }
                  }}
                />
              </LocalizationProvider>
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
          title='Total Trips'
          value={reportData.trips.total}
          subtitle={`${reportData.trips.completionRate}% completion rate`}
          icon='ri-truck-line'
          color='primary'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title='Completed Trips'
          value={reportData.trips.completed}
          subtitle={`${reportData.trips.inProgress} in progress`}
          icon='ri-checkbox-circle-line'
          color='success'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title='Packages Delivered'
          value={reportData.packages.delivered}
          subtitle={`of ${reportData.packages.total} total`}
          icon='ri-archive-line'
          color='info'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title='Daily Expenses'
          value={`KES ${reportData.expenses.total.toLocaleString()}`}
          subtitle={`${reportData.expenses.count} transactions`}
          icon='ri-money-dollar-circle-line'
          color='warning'
        />
      </Grid>

      {/* Resources and Delivery Stats */}
      <Grid item xs={12} md={4}>
        <Card className='h-full'>
          <CardHeader title='Active Resources' />
          <CardContent>
            <Box className='flex flex-col gap-4'>
              <Box className='flex items-center justify-between'>
                <Box className='flex items-center gap-3'>
                  <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity', color: 'primary.main' }}>
                    <i className='ri-user-line'></i>
                  </Avatar>
                  <Box>
                    <Typography variant='body1' fontWeight={500}>Active Drivers</Typography>
                    <Typography variant='caption' color='text.secondary'>Working today</Typography>
                  </Box>
                </Box>
                <Typography variant='h6'>{reportData.resources.driversActive}</Typography>
              </Box>
              <Divider />
              <Box className='flex items-center justify-between'>
                <Box className='flex items-center gap-3'>
                  <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity', color: 'success.main' }}>
                    <i className='ri-car-line'></i>
                  </Avatar>
                  <Box>
                    <Typography variant='body1' fontWeight={500}>Active Vehicles</Typography>
                    <Typography variant='caption' color='text.secondary'>On the road</Typography>
                  </Box>
                </Box>
                <Typography variant='h6'>{reportData.resources.vehiclesActive}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Delivery Performance */}
      <Grid item xs={12} md={8}>
        <Card className='h-full'>
          <CardHeader title='Delivery Performance' />
          <CardContent>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Box className='mb-4'>
                  <Box className='flex justify-between mb-2'>
                    <Typography variant='body2'>Package Delivery Rate</Typography>
                    <Typography variant='body2' fontWeight={600}>{reportData.packages.deliveryRate}%</Typography>
                  </Box>
                  <LinearProgress 
                    variant='determinate' 
                    value={parseFloat(reportData.packages.deliveryRate)} 
                    color='success'
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Box>
                  <Box className='flex justify-between mb-2'>
                    <Typography variant='body2'>Trip Completion Rate</Typography>
                    <Typography variant='body2' fontWeight={600}>{reportData.trips.completionRate}%</Typography>
                  </Box>
                  <LinearProgress 
                    variant='determinate' 
                    value={parseFloat(reportData.trips.completionRate)} 
                    color='primary'
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box className='flex flex-col gap-3'>
                  <Box className='flex justify-between items-center p-3 rounded' sx={{ bgcolor: 'action.hover' }}>
                    <Typography variant='body2'>Total Manifests</Typography>
                    <Chip label={reportData.manifests.total} size='small' color='primary' variant='tonal' />
                  </Box>
                  <Box className='flex justify-between items-center p-3 rounded' sx={{ bgcolor: 'action.hover' }}>
                    <Typography variant='body2'>Delivered</Typography>
                    <Chip label={reportData.manifests.delivered} size='small' color='success' variant='tonal' />
                  </Box>
                  <Box className='flex justify-between items-center p-3 rounded' sx={{ bgcolor: 'action.hover' }}>
                    <Typography variant='body2'>Pending</Typography>
                    <Chip label={reportData.manifests.pending} size='small' color='warning' variant='tonal' />
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Trips Table */}
      <Grid item xs={12}>
        <Card>
          <CardHeader 
            title="Today's Trips" 
            subheader={`${reportData.trips.list.length} trips scheduled for today`}
          />
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Trip ID</TableCell>
                  <TableCell>Driver</TableCell>
                  <TableCell>Vehicle</TableCell>
                  <TableCell>Route</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align='right'>Client Rate</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.trips.list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align='center' className='py-8'>
                      <Typography variant='body2' color='text.secondary'>
                        No trips scheduled for this date
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData.trips.list.map((trip: any) => (
                    <TableRow key={trip.$id} hover>
                      <TableCell>
                        <Typography variant='body2' fontWeight={500}>
                          {trip.$id.slice(0, 8)}...
                        </Typography>
                      </TableCell>
                      <TableCell>{trip.driverName || 'N/A'}</TableCell>
                      <TableCell>{trip.vehicleName || trip.vehicle?.slice(0, 8) || 'N/A'}</TableCell>
                      <TableCell>{trip.routeName || 'N/A'}</TableCell>
                      <TableCell>
                        <TripStatusChip status={trip.status} />
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' fontWeight={500}>
                          KES {(trip.clientRate || 0).toLocaleString()}
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

      {/* Expenses Table */}
      <Grid item xs={12}>
        <Card>
          <CardHeader 
            title="Today's Expenses" 
            subheader={`${reportData.expenses.list.length} expense records`}
          />
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Vehicle</TableCell>
                  <TableCell>Payment Status</TableCell>
                  <TableCell align='right'>Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.expenses.list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align='center' className='py-8'>
                      <Typography variant='body2' color='text.secondary'>
                        No expenses recorded for this date
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData.expenses.list.map((expense: any) => (
                    <TableRow key={expense.$id} hover>
                      <TableCell>
                        <Typography variant='body2' fontWeight={500}>
                          {expense.description || 'No description'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          size='small' 
                          label={expense.expenseType} 
                          variant='outlined'
                        />
                      </TableCell>
                      <TableCell>{expense.vehicleId?.slice(0, 8) || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip 
                          size='small' 
                          label={expense.paymentStatus || 'pending'} 
                          color={expense.paymentStatus === 'paid' ? 'success' : 'warning'}
                          variant='tonal'
                        />
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' fontWeight={500}>
                          KES {(expense.amount || 0).toLocaleString()}
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

export default DailyOperationsReport
