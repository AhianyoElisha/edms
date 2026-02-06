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
import { getProfitabilityReport } from '@/libs/actions/reports.actions'

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

const ProfitabilityReport = () => {
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [reportData, setReportData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getProfitabilityReport(selectedMonth, selectedYear)
      setReportData(data)
    } catch (err) {
      console.error('Error fetching profitability report:', err)
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

  // Combined chart options
  const combinedChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'area',
      toolbar: { show: false },
      stacked: false
    },
    colors: ['#28C76F', '#EA5455', '#7367F0'],
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
      categories: reportData.chartData.labels,
      labels: {
        style: { colors: 'var(--mui-palette-text-secondary)' }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        style: { colors: 'var(--mui-palette-text-secondary)' },
        formatter: (val) => `KES ${(val / 1000).toFixed(0)}K`
      }
    },
    legend: {
      show: true,
      position: 'top'
    },
    grid: {
      borderColor: 'var(--mui-palette-divider)',
      strokeDashArray: 4
    },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: (val) => `KES ${val.toLocaleString()}`
      }
    },
    dataLabels: {
      enabled: false
    }
  }

  const combinedChartSeries = [
    { name: 'Revenue', data: reportData.chartData.revenue },
    { name: 'Expenses', data: reportData.chartData.expenses },
    { name: 'Profit', data: reportData.chartData.profit }
  ]

  // Profitability gauge
  const gaugeChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'radialBar'
    },
    colors: [reportData.summary.profitMargin >= 30 ? '#28C76F' : reportData.summary.profitMargin >= 15 ? '#FF9F43' : '#EA5455'],
    plotOptions: {
      radialBar: {
        hollow: {
          size: '70%'
        },
        track: {
          background: 'var(--mui-palette-action-hover)'
        },
        dataLabels: {
          name: {
            show: true,
            fontSize: '14px',
            offsetY: -10
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
    labels: ['Profit Margin']
  }

  const gaugeChartSeries = [Math.max(0, Math.min(100, reportData.summary.profitMargin))]

  return (
    <Grid container spacing={6}>
      {/* Header with Filters */}
      <Grid item xs={12}>
        <Card>
          <CardContent className='flex flex-wrap items-center justify-between gap-4'>
            <Box>
              <Typography variant='h5' fontWeight={600}>
                Profitability Analysis
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Financial health for {reportData.period.monthName} {reportData.period.year}
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
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title='Total Expenses'
          value={`KES ${reportData.summary.totalExpenses.toLocaleString()}`}
          icon='ri-wallet-3-line'
          color='error'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title='Gross Profit'
          value={`KES ${reportData.summary.grossProfit.toLocaleString()}`}
          icon='ri-line-chart-line'
          color={reportData.summary.grossProfit >= 0 ? 'primary' : 'error'}
          trend={reportData.comparison.trend}
          trendValue={reportData.comparison.change.toString()}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title='Profit Margin'
          value={`${reportData.summary.profitMargin}%`}
          subtitle={`${reportData.summary.costToRevenueRatio}% cost ratio`}
          icon='ri-percent-line'
          color={reportData.summary.profitMargin >= 30 ? 'success' : reportData.summary.profitMargin >= 15 ? 'warning' : 'error'}
        />
      </Grid>

      {/* Combined Chart */}
      <Grid item xs={12} lg={8}>
        <Card>
          <CardHeader title='Revenue vs Expenses vs Profit' subheader='Daily financial comparison' />
          <CardContent>
            <ApexChart
              type='area'
              height={350}
              options={combinedChartOptions}
              series={combinedChartSeries}
            />
          </CardContent>
        </Card>
      </Grid>

      {/* Profitability Gauge */}
      <Grid item xs={12} lg={4}>
        <Card className='h-full'>
          <CardHeader title='Profit Margin' subheader='Overall profitability indicator' />
          <CardContent className='flex flex-col items-center'>
            <ApexChart
              type='radialBar'
              height={280}
              options={gaugeChartOptions}
              series={gaugeChartSeries}
            />
            <Box className='w-full mt-4'>
              <Box className='flex items-center justify-between p-3 rounded-lg' sx={{ bgcolor: 'action.hover' }}>
                <Typography variant='body2'>Status</Typography>
                <Chip 
                  size='small' 
                  label={
                    reportData.summary.profitMargin >= 30 ? 'Excellent' :
                    reportData.summary.profitMargin >= 15 ? 'Good' :
                    reportData.summary.profitMargin >= 0 ? 'Low' : 'Loss'
                  }
                  color={
                    reportData.summary.profitMargin >= 30 ? 'success' :
                    reportData.summary.profitMargin >= 15 ? 'warning' :
                    reportData.summary.profitMargin >= 0 ? 'error' : 'error'
                  }
                  variant='tonal'
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Financial Breakdown */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title='Financial Breakdown' />
          <CardContent>
            <Box className='flex flex-col gap-4'>
              {/* Revenue Section */}
              <Box className='p-4 rounded-lg' sx={{ bgcolor: 'success.lightOpacity' }}>
                <Box className='flex items-center justify-between mb-3'>
                  <Box className='flex items-center gap-2'>
                    <i className='ri-arrow-up-circle-line text-success text-xl'></i>
                    <Typography variant='subtitle2' fontWeight={600}>Revenue</Typography>
                  </Box>
                  <Typography variant='h6' fontWeight={600} color='success.main'>
                    KES {reportData.summary.totalRevenue.toLocaleString()}
                  </Typography>
                </Box>
                <Box className='flex justify-between'>
                  <Box>
                    <Typography variant='caption' color='text.secondary'>Collected</Typography>
                    <Typography variant='body2' fontWeight={500}>
                      KES {reportData.breakdown.revenueBreakdown.paid.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box className='text-right'>
                    <Typography variant='caption' color='text.secondary'>Pending</Typography>
                    <Typography variant='body2' fontWeight={500}>
                      KES {reportData.breakdown.revenueBreakdown.pending.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Expenses Section */}
              <Box className='p-4 rounded-lg' sx={{ bgcolor: 'error.lightOpacity' }}>
                <Box className='flex items-center justify-between mb-3'>
                  <Box className='flex items-center gap-2'>
                    <i className='ri-arrow-down-circle-line text-error text-xl'></i>
                    <Typography variant='subtitle2' fontWeight={600}>Expenses</Typography>
                  </Box>
                  <Typography variant='h6' fontWeight={600} color='error.main'>
                    KES {reportData.summary.totalExpenses.toLocaleString()}
                  </Typography>
                </Box>
                <Box className='flex flex-wrap gap-2'>
                  {reportData.breakdown.expenseBreakdown.slice(0, 4).map((cat: any) => (
                    <Chip 
                      key={cat.category}
                      size='small'
                      label={`${cat.category.replace('_', ' ')}: KES ${cat.amount.toLocaleString()}`}
                      variant='outlined'
                    />
                  ))}
                </Box>
              </Box>

              <Divider />

              {/* Profit Section */}
              <Box className='p-4 rounded-lg' sx={{ bgcolor: reportData.summary.grossProfit >= 0 ? 'primary.lightOpacity' : 'error.lightOpacity' }}>
                <Box className='flex items-center justify-between'>
                  <Box className='flex items-center gap-2'>
                    <i className={`ri-${reportData.summary.grossProfit >= 0 ? 'check' : 'close'}-circle-line text-${reportData.summary.grossProfit >= 0 ? 'primary' : 'error'} text-xl`}></i>
                    <Typography variant='subtitle2' fontWeight={600}>Net Profit</Typography>
                  </Box>
                  <Typography 
                    variant='h6' 
                    fontWeight={600} 
                    color={reportData.summary.grossProfit >= 0 ? 'primary.main' : 'error.main'}
                  >
                    KES {reportData.summary.grossProfit.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Month Comparison & Insights */}
      <Grid item xs={12} md={6}>
        <Card className='h-full'>
          <CardHeader title='Performance Insights' />
          <CardContent>
            <Box className='flex flex-col gap-4'>
              {/* Cost to Revenue Ratio */}
              <Box>
                <Box className='flex justify-between mb-2'>
                  <Typography variant='body2'>Cost to Revenue Ratio</Typography>
                  <Typography variant='body2' fontWeight={600}>{reportData.summary.costToRevenueRatio}%</Typography>
                </Box>
                <LinearProgress 
                  variant='determinate' 
                  value={Math.min(100, parseFloat(reportData.summary.costToRevenueRatio))} 
                  color={parseFloat(reportData.summary.costToRevenueRatio) <= 70 ? 'success' : parseFloat(reportData.summary.costToRevenueRatio) <= 85 ? 'warning' : 'error'}
                  sx={{ height: 10, borderRadius: 5 }}
                />
                <Typography variant='caption' color='text.secondary'>
                  {parseFloat(reportData.summary.costToRevenueRatio) <= 70 ? 'Healthy' : parseFloat(reportData.summary.costToRevenueRatio) <= 85 ? 'Moderate' : 'High'} cost ratio
                </Typography>
              </Box>

              <Divider />

              {/* Month over Month */}
              <Box className='p-3 rounded-lg' sx={{ bgcolor: 'action.hover' }}>
                <Typography variant='subtitle2' fontWeight={600} className='mb-3'>
                  Month-over-Month Comparison
                </Typography>
                <Box className='flex justify-between items-center'>
                  <Box>
                    <Typography variant='caption' color='text.secondary'>Previous Month Profit</Typography>
                    <Typography variant='body1' fontWeight={500}>
                      KES {reportData.comparison.previousProfit.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box className='text-right'>
                    <Typography variant='caption' color='text.secondary'>Change</Typography>
                    <Box className='flex items-center gap-1'>
                      <i className={`ri-arrow-${reportData.comparison.trend === 'up' ? 'up' : 'down'}-line text-${reportData.comparison.trend === 'up' ? 'success' : 'error'}`}></i>
                      <Typography 
                        variant='body1' 
                        fontWeight={600}
                        color={reportData.comparison.trend === 'up' ? 'success.main' : 'error.main'}
                      >
                        {reportData.comparison.change}%
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* Key Takeaways */}
              <Box className='p-3 rounded-lg' sx={{ bgcolor: 'info.lightOpacity' }}>
                <Typography variant='subtitle2' fontWeight={600} className='mb-2'>
                  <i className='ri-lightbulb-line mr-2'></i>
                  Key Takeaways
                </Typography>
                <Box className='flex flex-col gap-2'>
                  <Typography variant='caption'>
                    • Revenue of KES {reportData.summary.totalRevenue.toLocaleString()} with {reportData.summary.profitMargin}% margin
                  </Typography>
                  <Typography variant='caption'>
                    • {reportData.summary.grossProfit >= 0 ? 'Profitable' : 'Loss-making'} month with KES {Math.abs(reportData.summary.grossProfit).toLocaleString()} {reportData.summary.grossProfit >= 0 ? 'profit' : 'loss'}
                  </Typography>
                  <Typography variant='caption'>
                    • {reportData.comparison.trend === 'up' ? 'Improvement' : 'Decline'} of {Math.abs(reportData.comparison.change)}% from previous month
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default ProfitabilityReport
