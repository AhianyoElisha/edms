'use client'

// React Imports
import { useEffect, useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import TimelineDot from '@mui/lab/TimelineDot'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineConnector from '@mui/lab/TimelineConnector'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import { styled, useTheme } from '@mui/material/styles'
import MuiTimeline from '@mui/lab/Timeline'
import type { TimelineProps } from '@mui/lab/Timeline'

// Actions
import LoaderDark from '@/components/layout/shared/LoaderDark'

// Styled Timeline component
const Timeline = styled(MuiTimeline)<TimelineProps>({
  paddingLeft: 0,
  paddingRight: 0,
  '& .MuiTimelineItem-root': {
    width: '100%',
    '&:before': {
      display: 'none'
    },
    '& .MuiTimelineContent-root:last-child': {
      paddingBottom: 0
    }
  }
})

// Helper function to format time since
const getTimeSince = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };
    
    if (seconds < intervals.minute) {
      return `${Math.floor(seconds)} seconds ago`;
    } else if (seconds < intervals.hour) {
      return `${Math.floor(seconds / intervals.minute)} ${Math.floor(seconds / intervals.minute) === 1 ? 'minute' : 'minutes'} ago`;
    } else if (seconds < intervals.day) {
      return `${Math.floor(seconds / intervals.hour)} ${Math.floor(seconds / intervals.hour) === 1 ? 'hour' : 'hours'} ago`;
    } else if (seconds < intervals.week) {
      return `${Math.floor(seconds / intervals.day)} ${Math.floor(seconds / intervals.day) === 1 ? 'day' : 'days'} ago`;
    } else if (seconds < intervals.month) {
      return `${Math.floor(seconds / intervals.week)} ${Math.floor(seconds / intervals.week) === 1 ? 'week' : 'weeks'} ago`;
    } else if (seconds < intervals.year) {
      return `${Math.floor(seconds / intervals.month)} ${Math.floor(seconds / intervals.month) === 1 ? 'month' : 'months'} ago`;
    } else {
      return `${Math.floor(seconds / intervals.year)} ${Math.floor(seconds / intervals.year) === 1 ? 'year' : 'years'} ago`;
    }
  } catch (error) {
    console.error('Error calculating time since:', error);
    return 'Some time ago';
  }
}

// Function to determine timeline dot color based on sales performance
const getDotColor = (status: string, totalProducts: number) => {
  if (status === 'unavailable') {
    return 'error'; // Sold out
  } else if (totalProducts > 50) {
    return 'success'; // High sales
  } else if (totalProducts > 20) {
    return 'warning'; // Medium sales
  } else {
    return 'info'; // Low sales
  }
}

// Function to get category icon
const getCategoryIcon = (categoryTitle: string) => {
  const title = categoryTitle?.toLowerCase() || '';
  if (title.includes('water') || title.includes('sachet')) {
    return 'ri-drop-line';
  } else if (title.includes('bottle')) {
    return 'ri-bottle-line';
  } else if (title.includes('ice')) {
    return 'ri-snowflake-line';
  } else {
    return 'ri-product-hunt-line';
  }
}

const SalesActivity = ({ vehicleId, soldproducts }: { vehicleId: string, soldproducts: any[] }) => {
  const theme = useTheme()
  const [totalSales, setTotalSales] = useState(0)
  const [totalPackages, setTotalPackages] = useState(0)

  // Process the provided soldproducts prop
  useEffect(() => {
    if (soldproducts && soldproducts.length > 0) {
      // Calculate totals from provided data
      const sales = soldproducts.reduce((sum: number, product: any) => sum + (product.totalPrice || 0), 0)
      const packages = soldproducts.reduce((sum: number, product: any) => sum + (product.totalProducts || 0), 0)
      
      setTotalSales(sales)
      setTotalPackages(packages)
    } else {
      setTotalSales(0)
      setTotalPackages(0)
    }
  }, [soldproducts])

  // Sort and limit the soldproducts for display
  const displayProducts = soldproducts
    ? soldproducts
        .sort((a: any, b: any) => new Date(b.$updatedAt).getTime() - new Date(a.$updatedAt).getTime())
        .slice(0, 10)
    : []

  if (displayProducts.length === 0) {
    return (
      <Card>
        <CardHeader title='Sales Activity Timeline' />
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <LoaderDark />
          <Typography>Loading sales activity...</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader 
        title='Sales Activity Timeline' 
        subheader={`Recent sales transactions for this vehicle`}
      />
      <CardContent>
        {/* Summary Cards */}
        <Box className='grid grid-cols-2 gap-4 mb-6'>
          <Box 
            sx={{ 
              p: 3, 
              borderRadius: 2,
              backgroundColor: theme.palette.mode === 'dark' ? 'action.hover' : 'primary.light',
              border: `1px solid ${theme.palette.divider}`
            }}
          >
            <Typography variant='body2' color='text.secondary' className='mb-1'>
              Total Sales Value
            </Typography>
            <Typography 
              variant='h6' 
              className='font-bold'
              sx={{ color: theme.palette.mode === 'dark' ? 'primary.light' : 'primary.dark' }}
            >
              ₵{totalSales.toFixed(2)}
            </Typography>
          </Box>
          <Box 
            sx={{ 
              p: 3, 
              borderRadius: 2,
              backgroundColor: theme.palette.mode === 'dark' ? 'action.hover' : 'success.light',
              border: `1px solid ${theme.palette.divider}`
            }}
          >
            <Typography variant='body2' color='text.secondary' className='mb-1'>
              Total Packages Sold
            </Typography>
            <Typography 
              variant='h6' 
              className='font-bold'
              sx={{ color: theme.palette.mode === 'dark' ? 'success.light' : 'success.dark' }}
            >
              {totalPackages}
            </Typography>
          </Box>
        </Box>

        {displayProducts.length > 0 ? (
          <Timeline>
            {displayProducts.map((product, index) => (
              <TimelineItem key={product.$id}>
                <TimelineSeparator>
                  <TimelineDot color={getDotColor(product.status, product.totalProducts)}>
                    <i className={getCategoryIcon(product.category?.title)} />
                  </TimelineDot>
                  {index < displayProducts.length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                <TimelineContent>
                  <div className='flex flex-wrap items-center justify-between gap-x-2 mb-2'>
                    <Typography color='text.primary' className='font-medium'>
                      {product.category?.title || 'Unknown Product'}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {getTimeSince(product.$updatedAt)}
                    </Typography>
                  </div>
                  
                  <div className='flex items-center gap-2 mb-3'>
                    <div className='flex flex-col'>
                      <Typography variant='body2' className='font-medium' color='text.primary'>
                        {product.totalProducts} packages sold
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        Total Value: ₵{product.totalPrice?.toFixed(2) || '0.00'}
                      </Typography>
                    </div>
                  </div>

                  <div className='flex items-center gap-2 mb-2'>
                    <Chip 
                      label={product.status} 
                      size="small" 
                      color={product.status === 'unavailable' ? 'error' : 'success'}
                      variant="outlined"
                    />
                    {product.category?.pricePerBox && (
                      <Chip 
                        label={`₵${product.category.pricePerBox}/box`} 
                        size="small" 
                        variant="outlined"
                      />
                    )}
                  </div>

                  <Typography variant='body2' color='text.secondary' className='mb-2'>
                    {product.category?.description || 'Product sold from vehicle inventory'}
                  </Typography>

                  {/* Performance indicator */}
                  <div className='flex items-center gap-1'>
                    <i 
                      className={`ri-trending-${product.totalProducts > 25 ? 'up' : 'down'}-line text-sm`}
                      style={{ color: theme.palette.text.secondary }}
                    />
                    <Typography variant='caption' color='text.secondary'>
                      {product.totalProducts > 25 ? 'High volume sale' : 'Standard sale'}
                    </Typography>
                  </div>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        ) : (
          <div className='flex flex-col items-center gap-3 py-8'>
            <Avatar sx={{ width: 60, height: 60, bgcolor: 'action.hover' }}>
              <i className='ri-shopping-cart-line text-2xl' style={{ color: theme.palette.text.disabled }} />
            </Avatar>
            <Typography color='text.secondary' className='text-center font-medium'>
              No sales activity yet
            </Typography>
            <Typography variant='body2' color='text.secondary' className='text-center'>
              Sales transactions will appear here once products are sold from this vehicle
            </Typography>
          </div>
        )}
        
        {/* Vehicle Summary Section - Updated with theme colors */}
        {displayProducts.length > 0 && (
          <Box 
            sx={{ 
              mt: 4, 
              p: 3, 
              backgroundColor: theme.palette.mode === 'dark' ? 'background.paper' : 'background.default',
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`
            }}
          >
            <Typography variant='h6' className='mb-3' color='text.primary'>
              Vehicle Summary
            </Typography>
            <Box className='grid grid-cols-2 gap-4'>
              <div>
                <Typography variant='body2' color='text.secondary'>Total Sales</Typography>
                <Typography className='font-medium' color='text.primary'>
                  ₵{totalSales.toFixed(2)}
                </Typography>
              </div>
              <div>
                <Typography variant='body2' color='text.secondary'>Total Packages</Typography>
                <Typography className='font-medium' color='text.primary'>
                  {totalPackages}
                </Typography>
              </div>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default SalesActivity
