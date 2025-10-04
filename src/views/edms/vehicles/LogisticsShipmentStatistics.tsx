'use client'

// React Imports
import { useRef, useState, useEffect, useMemo } from 'react'
import type { SyntheticEvent } from 'react'

// Next Imports
import dynamic from 'next/dynamic'

// Mui Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grow from '@mui/material/Grow'
import Paper from '@mui/material/Paper'
import Button from '@mui/material/Button'
import Popper from '@mui/material/Popper'
import MenuItem from '@mui/material/MenuItem'
import MenuList from '@mui/material/MenuList'
import ButtonGroup from '@mui/material/ButtonGroup'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import Box from '@mui/material/Box'
import { useTheme } from '@mui/material/styles'

// Third Party Imports
import type { ApexOptions } from 'apexcharts'

// Types
import { Logistics } from '@/types/apps/ecommerceTypes'
import type { VehicleAnalyticsData } from './fleet'

// Styled Component Imports
const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

// Style Imports
import './styles.css'

const monthOptions = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const weekOptions = ['Week 1', 'Week 2', 'Week 3', 'Week 4']

type Props = {
  selectedLogistics: Logistics | null
  vehicleAnalyticsData: VehicleAnalyticsData | null
  isLoadingAnalytics: boolean
}

const MonthButton = ({ 
  selectedIndex, 
  onMonthChange, 
  disabled = false 
}: { 
  selectedIndex: number
  onMonthChange: (index: number) => void
  disabled?: boolean
}) => {
  // States
  const [open, setOpen] = useState<boolean>(false)

  // Refs
  const anchorRef = useRef<HTMLDivElement | null>(null)

  const handleMenuItemClick = (event: SyntheticEvent, index: number) => {
    onMonthChange(index)
    setOpen(false)
  }

  const handleToggle = () => {
    if (!disabled) {
      setOpen(prevOpen => !prevOpen)
    }
  }

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <>
      <ButtonGroup variant='outlined' ref={anchorRef} aria-label='split button' size='small'>
        <Button disabled={disabled}>{monthOptions[selectedIndex]}</Button>
        <Button
          className='pli-0'
          disabled={disabled}
          aria-haspopup='menu'
          onClick={handleToggle}
          aria-label='select merge strategy'
          aria-expanded={open ? 'true' : undefined}
          aria-controls={open ? 'split-button-menu' : undefined}
        >
          <i className='ri-arrow-down-s-line text-lg' />
        </Button>
      </ButtonGroup>
      <Popper open={open} anchorEl={anchorRef.current} role={undefined} transition placement='bottom-end'>
        {({ TransitionProps, placement }) => (
          <Grow {...TransitionProps} style={{ transformOrigin: placement === 'bottom-end' ? 'right top' : 'left top' }}>
            <Paper className='shadow-lg'>
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList id='split-button-menu'>
                  {monthOptions.map((option, index) => (
                    <MenuItem
                      key={option}
                      selected={index === selectedIndex}
                      onClick={event => handleMenuItemClick(event, index)}
                    >
                      {option}
                    </MenuItem>
                  ))}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </>
  )
}

const WeekButton = ({ 
  selectedIndex, 
  onWeekChange, 
  disabled = false 
}: { 
  selectedIndex: number
  onWeekChange: (index: number) => void
  disabled?: boolean
}) => {
  // States
  const [open, setOpen] = useState<boolean>(false)

  // Refs
  const anchorRef = useRef<HTMLDivElement | null>(null)

  const handleMenuItemClick = (event: SyntheticEvent, index: number) => {
    onWeekChange(index)
    setOpen(false)
  }

  const handleToggle = () => {
    if (!disabled) {
      setOpen(prevOpen => !prevOpen)
    }
  }

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <>
      <ButtonGroup variant='outlined' ref={anchorRef} aria-label='week split button' size='small'>
        <Button disabled={disabled}>{weekOptions[selectedIndex]}</Button>
        <Button
          className='pli-0'
          disabled={disabled}
          aria-haspopup='menu'
          onClick={handleToggle}
          aria-label='select week'
          aria-expanded={open ? 'true' : undefined}
          aria-controls={open ? 'week-split-button-menu' : undefined}
        >
          <i className='ri-arrow-down-s-line text-lg' />
        </Button>
      </ButtonGroup>
      <Popper open={open} anchorEl={anchorRef.current} role={undefined} transition placement='bottom-end'>
        {({ TransitionProps, placement }) => (
          <Grow {...TransitionProps} style={{ transformOrigin: placement === 'bottom-end' ? 'right top' : 'left top' }}>
            <Paper className='shadow-lg'>
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList id='week-split-button-menu'>
                  {weekOptions.map((option, index) => (
                    <MenuItem
                      key={option}
                      selected={index === selectedIndex}
                      onClick={event => handleMenuItemClick(event, index)}
                    >
                      {option}
                    </MenuItem>
                  ))}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </>
  )
}

// Helper function to split data into weeks
const splitDataIntoWeeks = (salesData: number[], expenseData: number[], dayLabels: any[]) => {
  const weeks = []
  const daysPerWeek = 7
  
  for (let weekIndex = 0; weekIndex < 4; weekIndex++) {
    const startDay = weekIndex * daysPerWeek
    const endDay = Math.min(startDay + daysPerWeek, salesData.length)
    
    const weekSalesData = salesData.slice(startDay, endDay)
    const weekExpenseData = expenseData.slice(startDay, endDay)
    const weekDayLabels = dayLabels.slice(startDay, endDay)
    
    const weekSalesTotal = weekSalesData.reduce((sum, val) => sum + val, 0)
    const weekExpenseTotal = weekExpenseData.reduce((sum, val) => sum + val, 0)
    
    weeks.push({
      salesData: weekSalesData,
      expenseData: weekExpenseData,
      dayLabels: weekDayLabels,
      salesTotal: weekSalesTotal,
      expenseTotal: weekExpenseTotal,
      profitLoss: weekSalesTotal - weekExpenseTotal,
      weekNumber: weekIndex + 1
    })
  }
  
  return weeks
}

const LogisticsShipmentStatistics = ({ 
  selectedLogistics, 
  vehicleAnalyticsData, 
  isLoadingAnalytics 
}: Props) => {
  // Hooks
  const theme = useTheme()
  
  // States
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(new Date().getMonth())
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(0)
  const [viewMode, setViewMode] = useState<'monthly' | 'daily'>('monthly')

  // Update selected month when new data is loaded
  useEffect(() => {
    if (vehicleAnalyticsData) {
      const currentMonth = new Date().getMonth()
      setSelectedMonthIndex(currentMonth)
    }
  }, [vehicleAnalyticsData])

  // Reset week selection when month changes
  useEffect(() => {
    setSelectedWeekIndex(0)
  }, [selectedMonthIndex])

  // Memoized chart data based on view mode
  const chartData = useMemo(() => {
    if (!vehicleAnalyticsData) {
      return {
        series: [],
        categories: [],
        title: 'No Data Available',
        subtitle: 'Select a vehicle to view statistics'
      }
    }

    if (viewMode === 'monthly') {
      // Monthly view - show all 12 months
      const series = [
        {
          name: 'Sales',
          type: 'column',
          data: vehicleAnalyticsData.monthlySalesChart
        },
        {
          name: 'Expenses',
          type: 'line',
          data: vehicleAnalyticsData.monthlyExpenseChart
        }
      ]

      return {
        series,
        categories: vehicleAnalyticsData.monthLabels.map((month: any) => month.slice(0, 3)), // Short month names
        title: `${vehicleAnalyticsData.vehicleName} - ${vehicleAnalyticsData.year}`,
        subtitle: `Total Sales: ${vehicleAnalyticsData.overallSalesTotal.toLocaleString()} | Total Expenses: ${vehicleAnalyticsData.overallExpenseTotal.toLocaleString()} | Profit: ${vehicleAnalyticsData.overallProfitLoss.toLocaleString()}`
      }
    } else {
      // Daily view - show selected week's daily data
      const selectedMonth = vehicleAnalyticsData.months[selectedMonthIndex]
      
      if (!selectedMonth) {
        return {
          series: [],
          categories: [],
          title: 'No Data Available',
          subtitle: 'No data for selected month'
        }
      }

      // Split month data into weeks
      const weeks = splitDataIntoWeeks(
        selectedMonth.salesData, 
        selectedMonth.expenseData, 
        selectedMonth.dayLabels
      )

      const selectedWeek = weeks[selectedWeekIndex]

      if (!selectedWeek || selectedWeek.salesData.length === 0) {
        return {
          series: [],
          categories: [],
          title: 'No Data Available',
          subtitle: 'No data for selected week'
        }
      }

      const series = [
        {
          name: 'Sales',
          type: 'column',
          data: selectedWeek.salesData
        },
        {
          name: 'Expenses',
          type: 'line',
          data: selectedWeek.expenseData
        }
      ]

      // Generate day categories with better formatting
      const categories = selectedWeek.dayLabels.map((day: any) => `Day ${day}`)

      return {
        series,
        categories,
        title: `${vehicleAnalyticsData.vehicleName} - ${selectedMonth.monthName} ${vehicleAnalyticsData.year} (Week ${selectedWeek.weekNumber})`,
        subtitle: `Sales: ${selectedWeek.salesTotal.toLocaleString()} | Expenses: ${selectedWeek.expenseTotal.toLocaleString()} | Profit: ${selectedWeek.profitLoss.toLocaleString()}`
      }
    }
  }, [vehicleAnalyticsData, selectedMonthIndex, selectedWeekIndex, viewMode])

  const options: ApexOptions = {
    chart: {
      type: 'line',
      stacked: false,
      parentHeightOffset: 0,
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: false,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false
        }
      },
      zoom: {
        enabled: false
      }
    },
    markers: {
      size: 5,
      colors: '#fff',
      strokeColors: 'var(--mui-palette-primary-main)',
      hover: {
        size: 6
      },
      radius: 4
    },
    stroke: {
      curve: 'smooth',
      width: [0, 3],
      lineCap: 'round'
    },
    legend: {
      show: true,
      position: 'bottom',
      markers: {
        width: 8,
        height: 8,
        offsetY: 1,
        offsetX: theme.direction === 'rtl' ? 8 : -4
      },
      height: 40,
      itemMargin: {
        horizontal: 10,
        vertical: 0
      },
      fontSize: '15px',
      fontFamily: 'Open Sans',
      fontWeight: 400,
      labels: {
        colors: 'var(--mui-palette-text-primary)'
      },
      offsetY: 10
    },
    grid: {
      strokeDashArray: 8,
      borderColor: 'var(--mui-palette-divider)'
    },
    colors: ['var(--mui-palette-warning-main)', 'var(--mui-palette-primary-main)'],
    fill: {
      opacity: [1, 1]
    },
    plotOptions: {
      bar: {
        columnWidth: viewMode === 'monthly' ? '40%' : '60%',
        borderRadius: 4,
        borderRadiusApplication: 'end'
      }
    },
    dataLabels: {
      enabled: false
    },
    xaxis: {
      categories: chartData.categories,
      labels: {
        style: {
          colors: 'var(--mui-palette-text-disabled)',
          fontSize: '13px',
          fontWeight: 400
        },
        rotate: 0
      },
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: 'var(--mui-palette-text-disabled)',
          fontSize: '13px',
          fontWeight: 400
        },
        formatter: (value) => {
          return value.toLocaleString()
        }
      }
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (value, { seriesIndex }) => {
          const prefix = seriesIndex === 0 ? 'Sales: ' : 'Expenses: '
          return prefix + value.toLocaleString()
        }
      }
    }
  }

  const handleMonthChange = (monthIndex: number) => {
    setSelectedMonthIndex(monthIndex)
  }

  const handleWeekChange = (weekIndex: number) => {
    setSelectedWeekIndex(weekIndex)
  }

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'monthly' ? 'daily' : 'monthly')
  }

  if (isLoadingAnalytics) {
    return (
      <Card>
        <CardHeader 
          title={<Skeleton width={200} />} 
          subheader={<Skeleton width={300} />}
          action={<Skeleton width={100} height={40} />}
        />
        <CardContent>
          <Skeleton variant="rectangular" height={313} />
        </CardContent>
      </Card>
    )
  }

  if (!selectedLogistics) {
    return (
      <Card>
        <CardHeader title='Shipment Statistics' subheader='Select a vehicle to view analytics' />
        <CardContent>
          <Box 
            display="flex" 
            justifyContent="center" 
            alignItems="center" 
            height={313}
            flexDirection="column"
            gap={2}
          >
            <i className='ri-truck-line text-6xl text-gray-400' />
            <Typography variant="h6" color="textSecondary">
              No Vehicle Selected
            </Typography>
            <Typography variant="body2" color="textSecondary" textAlign="center">
              Please select a vehicle from the sidebar to view detailed analytics
            </Typography>
          </Box>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader 
        title={chartData.title}
        subheader={chartData.subtitle}
        action={
          <Box display="flex" gap={1} alignItems="center">
            <Button
              variant={viewMode === 'monthly' ? 'contained' : 'outlined'}
              size="small"
              onClick={toggleViewMode}
              disabled={!vehicleAnalyticsData}
            >
              {viewMode === 'monthly' ? 'Monthly' : 'Weekly'}
            </Button>
            {viewMode === 'daily' && (
              <>
                <MonthButton 
                  selectedIndex={selectedMonthIndex}
                  onMonthChange={handleMonthChange}
                  disabled={!vehicleAnalyticsData}
                />
                <WeekButton 
                  selectedIndex={selectedWeekIndex}
                  onWeekChange={handleWeekChange}
                  disabled={!vehicleAnalyticsData}
                />
              </>
            )}
          </Box>
        }
      />
      <CardContent>
        {chartData.series.length > 0 ? (
          <AppReactApexCharts
            id='shipment-statistics'
            type='line'
            height={313}
            width='100%'
            series={chartData.series}
            options={options}
          />
        ) : (
          <Box 
            display="flex" 
            justifyContent="center" 
            alignItems="center" 
            height={313}
            flexDirection="column"
            gap={2}
          >
            <i className='ri-bar-chart-line text-6xl text-gray-400' />
            <Typography variant="h6" color="textSecondary">
              No Data Available
            </Typography>
            <Typography variant="body2" color="textSecondary" textAlign="center">
              This vehicle has no sales or expense data for the selected period
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default LogisticsShipmentStatistics