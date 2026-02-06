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
import Divider from '@mui/material/Divider'

// Chart Import
import dynamic from 'next/dynamic'
const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

// Action Imports
import { getInvoicingReport } from '@/libs/actions/reports.actions'

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

const InvoicingReport = () => {
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [reportData, setReportData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getInvoicingReport(selectedMonth, selectedYear)
      setReportData(data)
    } catch (err) {
      console.error('Error fetching invoicing report:', err)
      setError('Failed to fetch report data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [selectedMonth, selectedYear])

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

  // Invoice status chart
  const statusChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'donut'
    },
    colors: ['#28C76F', '#FF9F43', '#EA5455'],
    labels: ['Paid', 'Pending', 'Partial'],
    legend: {
      show: true,
      position: 'bottom'
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val.toFixed(1)}%`
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
              formatter: (val) => `KES ${Number(val).toLocaleString()}`
            },
            total: {
              show: true,
              label: 'Total Billed',
              fontSize: '12px',
              formatter: () => `KES ${reportData.summary.totalBilled.toLocaleString()}`
            }
          }
        }
      }
    }
  }

  const statusChartSeries = reportData.byStatus.map((s: any) => s.amount)

  // Invoice rate chart
  const invoiceRateChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'radialBar'
    },
    colors: ['#7367F0'],
    plotOptions: {
      radialBar: {
        hollow: {
          size: '60%'
        },
        track: {
          background: 'var(--mui-palette-action-hover)'
        },
        dataLabels: {
          name: {
            show: true,
            fontSize: '12px',
            offsetY: -5
          },
          value: {
            show: true,
            fontSize: '24px',
            fontWeight: 600,
            formatter: (val) => `${val.toFixed(1)}%`
          }
        }
      }
    },
    labels: ['Invoice Rate']
  }

  const invoiceRateChartSeries = [parseFloat(reportData.summary.invoiceRate)]

  return (
    <Grid container spacing={6}>
      {/* Header with Filters */}
      <Grid item xs={12}>
        <Card>
          <CardContent className='flex flex-wrap items-center justify-between gap-4'>
            <Box>
              <Typography variant='h5' fontWeight={600}>
                Invoicing Report
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Invoice and payment tracking for {reportData.period.monthName} {reportData.period.year}
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
          title='Total Billed'
          value={`KES ${reportData.summary.totalBilled.toLocaleString()}`}
          subtitle={`${reportData.summary.invoicedTrips} invoiced trips`}
          icon='ri-file-list-3-line'
          color='primary'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title='Collected'
          value={`KES ${reportData.summary.totalPaid.toLocaleString()}`}
          subtitle={`${reportData.summary.collectionRate}% collection rate`}
          icon='ri-checkbox-circle-line'
          color='success'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title='Pending'
          value={`KES ${reportData.summary.totalPending.toLocaleString()}`}
          icon='ri-time-line'
          color='warning'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title='Uninvoiced Trips'
          value={reportData.summary.uninvoicedTrips}
          subtitle='Pending invoice generation'
          icon='ri-draft-line'
          color='error'
        />
      </Grid>

      {/* Invoice Status Chart */}
      <Grid item xs={12} md={5}>
        <Card className='h-full'>
          <CardHeader title='Payment Status Distribution' subheader='By invoice status' />
          <CardContent>
            {reportData.byStatus.some((s: any) => s.amount > 0) ? (
              <ApexChart
                type='donut'
                height={300}
                options={statusChartOptions}
                series={statusChartSeries}
              />
            ) : (
              <Box className='text-center py-12'>
                <Typography variant='body2' color='text.secondary'>
                  No invoice data available
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Invoice Rate & Collection */}
      <Grid item xs={12} md={7}>
        <Card className='h-full'>
          <CardHeader title='Invoice & Collection Rates' />
          <CardContent>
            <Grid container spacing={4}>
              <Grid item xs={12} sm={6}>
                <Box className='text-center'>
                  <ApexChart
                    type='radialBar'
                    height={200}
                    options={invoiceRateChartOptions}
                    series={invoiceRateChartSeries}
                  />
                  <Typography variant='caption' color='text.secondary'>
                    {reportData.summary.invoicedTrips} of {reportData.summary.invoicedTrips + reportData.summary.uninvoicedTrips} trips invoiced
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box className='flex flex-col gap-4 h-full justify-center'>
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
                  <Box className='flex flex-col gap-2'>
                    {reportData.byStatus.map((status: any) => (
                      <Box key={status.status} className='flex justify-between items-center'>
                        <Box className='flex items-center gap-2'>
                          <Chip 
                            size='small' 
                            label={status.status}
                            color={status.status === 'paid' ? 'success' : status.status === 'pending' ? 'warning' : 'error'}
                            variant='tonal'
                          />
                        </Box>
                        <Typography variant='body2' fontWeight={500}>
                          {status.count} ({status.percentage}%)
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Status Breakdown Cards */}
      <Grid item xs={12}>
        <Grid container spacing={4}>
          {reportData.byStatus.map((status: any) => (
            <Grid item xs={12} sm={4} key={status.status}>
              <Card>
                <CardContent>
                  <Box className='flex items-center justify-between mb-4'>
                    <Chip 
                      label={status.status.toUpperCase()}
                      color={status.status === 'paid' ? 'success' : status.status === 'pending' ? 'warning' : 'error'}
                      variant='tonal'
                    />
                    <Typography variant='caption' color='text.secondary'>
                      {status.percentage}% of total
                    </Typography>
                  </Box>
                  <Typography variant='h4' fontWeight={600} className='mb-1'>
                    KES {status.amount.toLocaleString()}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {status.count} invoices
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* Completed Trips Table */}
      <Grid item xs={12}>
        <Card>
          <CardHeader 
            title='Completed Trips' 
            subheader={`${reportData.trips.length} trips with billing information`}
          />
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Trip ID</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Route</TableCell>
                  <TableCell>Driver</TableCell>
                  <TableCell>Invoice Status</TableCell>
                  <TableCell>Payment Status</TableCell>
                  <TableCell align='right'>Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.trips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align='center' className='py-8'>
                      <Typography variant='body2' color='text.secondary'>
                        No completed trips for this period
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData.trips.map((trip: any) => (
                    <TableRow key={trip.$id} hover>
                      <TableCell>
                        <Typography variant='body2' fontWeight={500}>
                          {trip.$id.slice(0, 8)}...
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>
                          {new Date(trip.tripDate).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>
                          {trip.routeName || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>
                          {trip.driverName || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          size='small' 
                          label={trip.invoiceGenerated ? 'Generated' : 'Not Generated'}
                          color={trip.invoiceGenerated ? 'success' : 'error'}
                          variant='tonal'
                        />
                      </TableCell>
                      <TableCell>
                        {trip.invoiceGenerated ? (
                          <Chip 
                            size='small' 
                            label={trip.paymentStatus || 'pending'}
                            color={trip.paymentStatus === 'paid' ? 'success' : trip.paymentStatus === 'partial' ? 'warning' : 'error'}
                            variant='tonal'
                          />
                        ) : (
                          <Typography variant='caption' color='text.secondary'>N/A</Typography>
                        )}
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' fontWeight={600}>
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

      {/* Action Items */}
      <Grid item xs={12}>
        <Card>
          <CardHeader title='Action Items' />
          <CardContent>
            <Grid container spacing={4}>
              {reportData.summary.uninvoicedTrips > 0 && (
                <Grid item xs={12} md={4}>
                  <Box className='p-4 rounded-lg' sx={{ bgcolor: 'error.lightOpacity' }}>
                    <Box className='flex items-center gap-3 mb-2'>
                      <Avatar sx={{ bgcolor: 'error.main', width: 36, height: 36 }}>
                        <i className='ri-draft-line'></i>
                      </Avatar>
                      <Typography variant='subtitle2' fontWeight={600}>Pending Invoices</Typography>
                    </Box>
                    <Typography variant='body2' color='text.secondary'>
                      {reportData.summary.uninvoicedTrips} completed trips need invoice generation
                    </Typography>
                  </Box>
                </Grid>
              )}
              {reportData.summary.totalPending > 0 && (
                <Grid item xs={12} md={4}>
                  <Box className='p-4 rounded-lg' sx={{ bgcolor: 'warning.lightOpacity' }}>
                    <Box className='flex items-center gap-3 mb-2'>
                      <Avatar sx={{ bgcolor: 'warning.main', width: 36, height: 36 }}>
                        <i className='ri-time-line'></i>
                      </Avatar>
                      <Typography variant='subtitle2' fontWeight={600}>Pending Collection</Typography>
                    </Box>
                    <Typography variant='body2' color='text.secondary'>
                      KES {reportData.summary.totalPending.toLocaleString()} awaiting payment
                    </Typography>
                  </Box>
                </Grid>
              )}
              <Grid item xs={12} md={4}>
                <Box className='p-4 rounded-lg' sx={{ bgcolor: 'success.lightOpacity' }}>
                  <Box className='flex items-center gap-3 mb-2'>
                    <Avatar sx={{ bgcolor: 'success.main', width: 36, height: 36 }}>
                      <i className='ri-checkbox-circle-line'></i>
                    </Avatar>
                    <Typography variant='subtitle2' fontWeight={600}>Collection Status</Typography>
                  </Box>
                  <Typography variant='body2' color='text.secondary'>
                    {reportData.summary.collectionRate}% of billed amount has been collected
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default InvoicingReport
