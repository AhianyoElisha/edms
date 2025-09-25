'use client'

// React Imports
import { useState, useRef } from 'react'

// Next Imports
import dynamic from 'next/dynamic'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Grow from '@mui/material/Grow'
import Paper from '@mui/material/Paper'
import Popper from '@mui/material/Popper'
import MenuItem from '@mui/material/MenuItem'
import MenuList from '@mui/material/MenuList'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'
import { useTheme } from '@mui/material/styles'

// Third-party Imports
import type { ApexOptions } from 'apexcharts'
import LoaderDark from '@/components/layout/shared/LoaderDark'

// Styled Component Imports
const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

interface CreatorData {
  name: string
  avatar: string
  salesTotal: number
  salesPackages: number
  documents: any[]
}

interface StackedSeriesData {
  name: string
  data: number[]
}

interface CategoryData {
  title: string
  salesTotal: number
  salesPackages: number
  stackedSalesData: StackedSeriesData[] // Daily stacked data by creator
  dayLabels: number[] // Day numbers (1-31)
  stackedWeeklyData: StackedSeriesData[] // Weekly stacked data by creator
  weeklyTotal: number
  creators: CreatorData[] // Creators in this category
  detailedSalesData: any[]
}

interface SalesStatisticsProps {
  monthlyEstimate?: {
    categories?: CategoryData[]
    creators?: any[]
    overallSalesTotal?: string | number
    overallSalesPackages?: string | number
    daysInMonth?: number
    month?: string
    year?: number
    allCreators?: string[] // List of all creators for consistent colors
  }, 
  isLoading?: boolean
}

const SalesStatistics = ({ monthlyEstimate, isLoading }: SalesStatisticsProps) => {
  // Hooks
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState(0)
  const anchorRef = useRef<HTMLDivElement>(null)

  // Toggle options
  const options = ['This Month', 'This Week']

  // Data preparation
  const isWeeklyView = selectedIndex === 1
  const categories = monthlyEstimate?.categories || []
  const currentCategoryData = categories[selectedCategory]
  const allCreators = monthlyEstimate?.allCreators || []
  
  const daysInMonth = monthlyEstimate?.daysInMonth || 31
  const monthName = monthlyEstimate?.month || 'Current Month'
  
  // Use current category data if available, otherwise use empty arrays
  const dayLabels = currentCategoryData?.dayLabels || Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const stackedDailyData = currentCategoryData?.stackedSalesData || []
  const stackedWeeklyData = currentCategoryData?.stackedWeeklyData || []
  
  const currentStackedData = isWeeklyView ? stackedWeeklyData : stackedDailyData
  const currentTotal = isWeeklyView ? currentCategoryData?.weeklyTotal : currentCategoryData?.salesTotal
  
  // Generate consistent colors for creators
  const generateCreatorColors = (creators: string[]) => {
    const baseColors = [
      'var(--mui-palette-primary-main)',
      'var(--mui-palette-secondary-main)',
      'var(--mui-palette-success-main)',
      'var(--mui-palette-warning-main)',
      'var(--mui-palette-error-main)',
      'var(--mui-palette-info-main)',
      '#9C27B0', // Purple
      '#FF5722', // Deep Orange
      '#795548', // Brown
      '#607D8B', // Blue Grey
      '#E91E63', // Pink
      '#00BCD4', // Cyan
      '#8BC34A', // Light Green
      '#FFC107', // Amber
      '#FF9800', // Orange
    ]
    
    const colorMap = new Map()
    creators.forEach((creator, index) => {
      colorMap.set(creator, baseColors[index % baseColors.length])
    })
    
    return colorMap
  }

  const creatorColorMap = generateCreatorColors(allCreators)

  // Chart series for stacked data
  const series = currentStackedData.map(creatorData => ({
    name: creatorData.name,
    data: creatorData.data
  }))
  
  // Colors for stacked series
  const chartColors = currentStackedData.map(creatorData => 
    creatorColorMap.get(creatorData.name) || 'var(--mui-palette-grey-500)'
  )

  // Chart options for monthly view (stacked bar chart)
  const monthlyChartOptions: ApexOptions = {
    chart: {
      type: 'bar',
      stacked: true,
      parentHeightOffset: 0,
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 4,
        columnWidth: '60%',
        dataLabels: {
          total: {
            enabled: false
          }
        }
      }
    },
    legend: { 
      show: true,
      position: 'bottom',
      horizontalAlign: 'center',
      fontSize: '12px',
      fontFamily: theme.typography.fontFamily,
      labels: {
        colors: 'var(--mui-palette-text-primary)',
        useSeriesColors: false
      },
      markers: {
        width: 12,
        height: 12,
        radius: 2
      },
      itemMargin: {
        horizontal: 8,
        vertical: 4
      }
    },
    tooltip: { 
      enabled: true,
      shared: true,
      intersect: false,
      followCursor: true,
      y: {
        formatter: (val, { seriesIndex, dataPointIndex, w }) => {
          const formattedValue = new Intl.NumberFormat('en-GH', {
            style: 'currency',
            currency: 'GHS'
          }).format(val);
          return formattedValue;
        }
      },
      x: {
        formatter: (val, { seriesIndex, dataPointIndex, w }) => {
          const day = dayLabels[dataPointIndex];
          return `Day ${day}`;
        }
      }
    },
    dataLabels: { enabled: false },
    colors: chartColors,
    states: {
      hover: {
        filter: { type: 'darken', value: 0.1 }
      },
      active: {
        filter: { type: 'darken', value: 0.2 }
      }
    },
    grid: {
      show: true,
      borderColor: 'var(--mui-palette-divider)',
      strokeDashArray: 3,
      padding: {
        top: 0,
        left: 10,
        right: 10,
        bottom: 10
      }
    },
    xaxis: {
      categories: dayLabels,
      title: {
        text: `Days in ${monthName}`,
        style: {
          color: 'var(--mui-palette-text-secondary)',
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.caption.fontSize as string
        }
      },
      axisTicks: { show: true },
      axisBorder: { show: true },
      tickPlacement: 'on',
      labels: {
        show: true,
        rotate: -45,
        style: {
          colors: 'var(--mui-palette-text-disabled)',
          fontFamily: theme.typography.fontFamily,
          fontSize: '10px'
        }
      }
    },
    yaxis: { 
      show: true,
      min: 0,
      max: function(max) {
        // Add 10% padding to the top to ensure better visibility
        return Math.ceil(max * 1.1);
      },
      tickAmount: 8,
      title: {
        text: 'Sales (GHS)',
        style: {
          color: 'var(--mui-palette-text-secondary)',
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.caption.fontSize as string
        }
      },
      labels: {
        style: {
          colors: 'var(--mui-palette-text-disabled)',
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.body2.fontSize as string
        },
        formatter: (val) => new Intl.NumberFormat('en-GH', {
          style: 'currency',
          currency: 'GHS',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
          notation: val > 10000 ? 'compact' : 'standard'
        }).format(val)
      }
    },
    responsive: [
      {
        breakpoint: 600,
        options: {
          chart: {
            width: 275
          },
          xaxis: {
            labels: {
              rotate: -90
            }
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    ]
  }

  // Chart options for weekly view (stacked bar chart)
  const weeklyChartOptions: ApexOptions = {
    chart: {
      type: 'bar',
      stacked: true,
      parentHeightOffset: 0,
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 7,
        columnWidth: '50%',
        dataLabels: {
          total: {
            enabled: false
          }
        }
      }
    },
    legend: { 
      show: true,
      position: 'bottom',
      horizontalAlign: 'center',
      fontSize: '12px',
      fontFamily: theme.typography.fontFamily,
      labels: {
        colors: 'var(--mui-palette-text-primary)',
        useSeriesColors: false
      },
      markers: {
        width: 12,
        height: 12,
        radius: 2
      },
      itemMargin: {
        horizontal: 8,
        vertical: 4
      }
    },
    tooltip: { 
      enabled: true,
      shared: true,
      intersect: false,
      followCursor: true,
      y: {
        formatter: (val, { seriesIndex, dataPointIndex, w }) => {
          const formattedValue = new Intl.NumberFormat('en-GH', {
            style: 'currency',
            currency: 'GHS'
          }).format(val);
          return formattedValue;
        }
      },
      x: {
        formatter: (val, { seriesIndex, dataPointIndex, w }) => {
          const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][dataPointIndex];
          return day;
        }
      }
    },
    dataLabels: { enabled: false },
    colors: chartColors,
    states: {
      hover: {
        filter: { type: 'darken', value: 0.1 }
      },
      active: {
        filter: { type: 'darken', value: 0.2 }
      }
    },
    grid: {
      show: true,
      borderColor: 'var(--mui-palette-divider)',
      strokeDashArray: 3,
      padding: {
        top: 0,
        left: 10,
        right: 10,
        bottom: 10
      }
    },
    xaxis: {
      categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      title: {
        text: 'Current Week',
        style: {
          color: 'var(--mui-palette-text-secondary)',
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.caption.fontSize as string
        }
      },
      axisTicks: { show: true },
      axisBorder: { show: true },
      tickPlacement: 'on',
      labels: {
        show: true,
        style: {
          colors: 'var(--mui-palette-text-disabled)',
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.body2.fontSize as string
        }
      }
    },
    yaxis: { 
      show: true,
      min: 0,
      max: function(max) {
        // Add 10% padding to the top to ensure better visibility
        return Math.ceil(max * 1.1);
      },
      tickAmount: 8,
      title: {
        text: 'Sales (GHS)',
        style: {
          color: 'var(--mui-palette-text-secondary)',
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.caption.fontSize as string
        }
      },
      labels: {
        style: {
          colors: 'var(--mui-palette-text-disabled)',
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.body2.fontSize as string
        },
        formatter: (val) => new Intl.NumberFormat('en-GH', {
          style: 'currency',
          currency: 'GHS',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
          notation: val > 10000 ? 'compact' : 'standard'
        }).format(val)
      }
    },
    responsive: [
      {
        breakpoint: 600,
        options: {
          chart: {
            width: 275
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    ]
  }

  // Format currency
  const formattedTotal = new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number.parseInt(currentTotal?.toString() || '0') || 0)

  // Handle dropdown toggle
  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen)
  }

  const handleClose = (event: Event | React.SyntheticEvent) => {
    if (anchorRef.current && anchorRef.current.contains(event.target as HTMLElement)) {
      return
    }
    setOpen(false)
  }

  const handleMenuItemClick = (event: React.MouseEvent<HTMLLIElement, MouseEvent>, index: number) => {
    setSelectedIndex(index)
    setOpen(false)
  }

  const handleCategoryChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedCategory(newValue)
  }

  // If loading, show loader
  if (isLoading) {
    return (
      <Card>
        <CardHeader title='Sales Statistics' />
        <CardContent sx={{ textAlign: 'center' }}>
          <div>
            <LoaderDark />
            <Typography>Loading...</Typography>
            <Typography>This may take up to 1 minute.</Typography>
          </div>
        </CardContent>
      </Card>
    )
  }

  // If no categories available, show a message
  if (!categories || categories.length === 0) {
    return (
      <Card>
        <CardHeader title='Sales Statistics' />
        <CardContent>
          <Typography variant="body1" color="text.secondary" align="center">
            No sales data available for the current month.
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader 
        title='Sales Statistics'
        action={
          <ButtonGroup variant='outlined' ref={anchorRef} aria-label='split button' size='small'>
            <Button>{options[selectedIndex]}</Button>
            <Button
              className='pli-0'
              aria-haspopup='menu'
              onClick={handleToggle}
              aria-label='select time period'
              aria-expanded={open ? 'true' : undefined}
              aria-controls={open ? 'split-button-menu' : undefined}
            >
              <i className='ri-arrow-down-s-line text-lg' />
            </Button>
          </ButtonGroup>
        }
      />
      <CardContent>
        {/* Category Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', marginBottom: 2 }}>
          <Tabs 
            value={selectedCategory} 
            onChange={handleCategoryChange} 
            aria-label="category tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            {categories.map((category, index) => (
              <Tab 
                key={category.title} 
                label={category.title} 
                id={`category-tab-${index}`}
                aria-controls={`category-tabpanel-${index}`}
              />
            ))}
          </Tabs>
        </Box>

        {/* Current Category Info */}
        <div className='flex items-center gap-2 mb-4'>
          <Typography>
            {isWeeklyView 
              ? `${currentCategoryData?.title} - Current week sales` 
              : `${currentCategoryData?.title} - Daily sales for ${monthName}`
            }
          </Typography>
          <Chip 
            label={formattedTotal} 
            color="primary" 
            variant="outlined" 
            size="small"
          />
        </div>

        {/* Creators in Category Info */}
        {currentCategoryData?.creators && currentCategoryData.creators.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Creators in this category:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {currentCategoryData.creators.map((creator, index) => (
                <Chip
                  key={creator.name}
                  label={`${creator.name} (${new Intl.NumberFormat('en-GH', {
                    style: 'currency',
                    currency: 'GHS',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(creator.salesTotal)})`}
                  size="small"
                  variant="outlined"
                  sx={{ 
                    bgcolor: creatorColorMap.get(creator.name) + '20',
                    borderColor: creatorColorMap.get(creator.name),
                    color: creatorColorMap.get(creator.name)
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Chart */}
        <AppReactApexCharts 
          type='bar'
          width='100%' 
          height={500} 
          series={series} 
          options={isWeeklyView ? weeklyChartOptions : monthlyChartOptions} 
        />

        {/* Summary Statistics */}
        <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary">
            Total Packages: {currentCategoryData?.salesPackages || 0}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Category: {currentCategoryData?.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Creators: {currentCategoryData?.creators?.length || 0}
          </Typography>
        </Box>

        {/* Dropdown Menu */}
        <Popper
          sx={{ zIndex: 1 }}
          open={open}
          anchorEl={anchorRef.current}
          role={undefined}
          transition
          disablePortal
        >
          {({ TransitionProps, placement }) => (
            <Grow
              {...TransitionProps}
              style={{
                transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom'
              }}
            >
              <Paper>
                <ClickAwayListener onClickAway={handleClose}>
                  <MenuList id='split-button-menu' autoFocusItem>
                    {options.map((option, index) => (
                      <MenuItem
                        key={option}
                        selected={index === selectedIndex}
                        onClick={(event) => handleMenuItemClick(event, index)}
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
      </CardContent>
    </Card>
  )
}

export default SalesStatistics