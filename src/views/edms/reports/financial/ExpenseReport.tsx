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
import { getExpenseReport } from '@/libs/actions/reports.actions'

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

// Category icons mapping
const categoryIcons: Record<string, string> = {
  fuel: 'ri-gas-station-line',
  maintenance: 'ri-tools-line',
  tools: 'ri-hammer-line',
  equipment: 'ri-settings-3-line',
  vehicle_purchase: 'ri-car-line',
  office: 'ri-building-2-line',
  salary: 'ri-money-dollar-circle-line',
  communication: 'ri-phone-line',
  utilities: 'ri-lightbulb-line',
  trip_related: 'ri-truck-line',
  other: 'ri-more-line'
}

const ExpenseReport = () => {
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
      const data = await getExpenseReport(selectedMonth, selectedYear)
      setReportData(data)
    } catch (err) {
      console.error('Error fetching expense report:', err)
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

  // Expense trend chart options
  const chartLabels = reportData?.chartData?.labels || []
  const chartExpenses = reportData?.chartData?.expenses || []
  const categoryLabels = reportData?.chartData?.categoryLabels || []
  const categoryAmounts = reportData?.chartData?.categoryAmounts || []

  const expenseTrendChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'bar',
      toolbar: { show: false }
    },
    colors: ['#EA5455'],
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '60%'
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
      text: 'No expense data available',
      align: 'center',
      verticalAlign: 'middle'
    }
  }

  const expenseTrendChartSeries = [{
    name: 'Expenses',
    data: chartExpenses
  }]

  // Category breakdown chart
  const hasCategoryData = categoryAmounts.length > 0 && categoryAmounts.some((a: number) => a > 0)

  const categoryChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'pie'
    },
    colors: ['#7367F0', '#28C76F', '#FF9F43', '#EA5455', '#00CFE8', '#9C9C9C', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
    labels: categoryLabels.map((label: string) => (label || 'other').replace('_', ' ').toUpperCase()),
    legend: {
      show: true,
      position: 'bottom',
      fontSize: '12px'
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => val != null ? `${val.toFixed(1)}%` : '0%'
    },
    plotOptions: {
      pie: {
        donut: {
          size: '0%'
        }
      }
    },
    noData: {
      text: 'No category data',
      align: 'center',
      verticalAlign: 'middle'
    }
  }

  const categoryChartSeries = categoryAmounts

  return (
    <Grid container spacing={6}>
      {/* Header with Filters */}
      <Grid item xs={12}>
        <Card>
          <CardContent className='flex flex-wrap items-center justify-between gap-4'>
            <Box>
              <Typography variant='h5' fontWeight={600}>
                Expense Report
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Expense analysis for {reportData.period.monthName} {reportData.period.year}
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
          title='Total Expenses'
          value={`KES ${reportData.summary.totalExpenses.toLocaleString()}`}
          icon='ri-wallet-3-line'
          color='error'
          trend={reportData.comparison?.trend}
          trendValue={String(reportData.comparison?.change ?? 0)}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title='Expense Count'
          value={reportData.summary.expenseCount}
          subtitle='Total transactions'
          icon='ri-file-list-3-line'
          color='primary'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title='Paid'
          value={`KES ${reportData.summary.paidExpenses.toLocaleString()}`}
          icon='ri-checkbox-circle-line'
          color='success'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title='Average Expense'
          value={`KES ${Number(reportData.summary.avgExpense).toLocaleString()}`}
          subtitle='Per transaction'
          icon='ri-calculator-line'
          color='info'
        />
      </Grid>

      {/* Expense Trend Chart */}
      <Grid item xs={12} lg={8}>
        <Card>
          <CardHeader title='Daily Expense Trend' subheader='Expenses recorded each day' />
          <CardContent>
            <Box sx={{ minHeight: 350 }}>
              {chartMounted && (
                <ApexChart
                  type='bar'
                  height={350}
                  width='100%'
                  options={expenseTrendChartOptions}
                  series={expenseTrendChartSeries}
                />
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Category Breakdown */}
      <Grid item xs={12} lg={4}>
        <Card className='h-full'>
          <CardHeader title='Category Breakdown' subheader='Expenses by category' />
          <CardContent>
            <Box sx={{ minHeight: 300 }}>
              {chartMounted && hasCategoryData ? (
                <ApexChart
                  type='pie'
                  height={300}
                  width='100%'
                  options={categoryChartOptions}
                  series={categoryChartSeries}
                />
              ) : chartMounted ? (
                <Box className='text-center py-12'>
                  <Typography variant='body2' color='text.secondary'>
                    No expense data available
                  </Typography>
                </Box>
              ) : null}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Category Details */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title='Expenses by Category' />
          <CardContent>
            <Box className='flex flex-col gap-3'>
              {reportData.byCategory.length === 0 ? (
                <Typography variant='body2' color='text.secondary' className='text-center py-8'>
                  No expense categories found
                </Typography>
              ) : (
                reportData.byCategory.map((category: any, index: number) => (
                  <Box key={category.category}>
                    <Box className='flex items-center justify-between mb-2'>
                      <Box className='flex items-center gap-3'>
                        <Avatar 
                          variant='rounded' 
                          sx={{ 
                            width: 36, 
                            height: 36, 
                            bgcolor: `${['primary', 'success', 'warning', 'error', 'info'][index % 5]}.lightOpacity`,
                            color: `${['primary', 'success', 'warning', 'error', 'info'][index % 5]}.main`
                          }}
                        >
                          <i className={categoryIcons[category.category] || 'ri-more-line'}></i>
                        </Avatar>
                        <Box>
                          <Typography variant='body2' fontWeight={500} textTransform='capitalize'>
                            {category.category.replace('_', ' ')}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {category.count} transactions
                          </Typography>
                        </Box>
                      </Box>
                      <Box className='text-right'>
                        <Typography variant='body2' fontWeight={600}>
                          KES {category.amount.toLocaleString()}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {category.percentage}%
                        </Typography>
                      </Box>
                    </Box>
                    <LinearProgress 
                      variant='determinate' 
                      value={parseFloat(category.percentage)} 
                      color={['primary', 'success', 'warning', 'error', 'info'][index % 5] as any}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                    {index < reportData.byCategory.length - 1 && <Divider sx={{ mt: 2 }} />}
                  </Box>
                ))
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Month Comparison */}
      <Grid item xs={12} md={6}>
        <Card className='h-full'>
          <CardHeader title='Month Comparison' />
          <CardContent>
            <Box className='flex flex-col gap-4'>
              <Box className='p-4 rounded-lg' sx={{ bgcolor: 'error.lightOpacity' }}>
                <Box className='flex justify-between items-center mb-2'>
                  <Typography variant='body2'>Current Month</Typography>
                  <Typography variant='h6' fontWeight={600} color='error.main'>
                    KES {reportData.summary.totalExpenses.toLocaleString()}
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

              <Box className='p-3 rounded-lg' sx={{ bgcolor: reportData.comparison.change <= 0 ? 'success.lightOpacity' : 'warning.lightOpacity' }}>
                <Typography variant='caption'>
                  {reportData.comparison.change <= 0 
                    ? '✓ Expenses have decreased compared to last month' 
                    : '⚠ Expenses have increased compared to last month'}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Expenses Table */}
      <Grid item xs={12}>
        <Card>
          <CardHeader title='Recent Expenses' subheader='Latest expense transactions' />
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Payment Status</TableCell>
                  <TableCell align='right'>Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.recentExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align='center' className='py-8'>
                      <Typography variant='body2' color='text.secondary'>
                        No expenses recorded for this period
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData.recentExpenses.map((expense: any) => (
                    <TableRow key={expense.$id} hover>
                      <TableCell>
                        <Typography variant='body2' fontWeight={500}>
                          {expense.description || 'No description'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          size='small' 
                          label={expense.expenseType?.replace('_', ' ') || 'other'} 
                          variant='outlined'
                          icon={<i className={categoryIcons[expense.expenseType] || 'ri-more-line'}></i>}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>
                          {new Date(expense.expenseDate).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          size='small' 
                          label={expense.paymentStatus || 'pending'} 
                          color={expense.paymentStatus === 'paid' ? 'success' : expense.paymentStatus === 'partial' ? 'warning' : 'error'}
                          variant='tonal'
                        />
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' fontWeight={600} color='error.main'>
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

export default ExpenseReport
