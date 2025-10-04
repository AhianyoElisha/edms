'use client'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { Theme } from '@mui/material/styles'

// Third-party Imports
import classnames from 'classnames'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'
import { CategoryType, InventoryListType } from '@/types/apps/ecommerceTypes'
import { useCallback, useEffect, useState } from 'react'
import { getInventoryCategoryList } from '@/libs/actions/stores.actions'
import { toast } from 'react-toastify'

type DataType = {
  title: string
  value: string
  icon: string
  desc: string
  change?: number
}

const ProductCard = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [costEstimate, setCostEstimate] = useState<any>()

  const fetchInventoryData = useCallback(async () => {
    try {
      setIsLoading(true)
      const category = await getInventoryCategoryList(false, true)
      setCostEstimate(category?.consoleEstimateList)
    } catch (error) {
      console.error('Error fetching inventory data:', error)
      toast.error('Failed to fetch inventory data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInventoryData()
  }, [fetchInventoryData])

  // Enhanced responsive breakpoints
  const isXsScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'))
  const isSmScreen = useMediaQuery((theme: Theme) => theme.breakpoints.between('sm', 'md'))
  const isMdScreen = useMediaQuery((theme: Theme) => theme.breakpoints.between('md', 'lg'))
  const isLgScreen = useMediaQuery((theme: Theme) => theme.breakpoints.between('lg', 'xl'))

  const formattedStoreTotal = new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(((costEstimate?.storeTotal) || 0))
  
  const formattedUsedStoreTotal = new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(((costEstimate?.storeRequisitionTotal) || 0))
    
  const formattedProductionTotal = new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format((costEstimate?.productionTotal) || 0)
  
  const formattedWarehouseTotal = new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format((costEstimate?.warehouseTotal-costEstimate?.salesTotal) || 0)
  
  const formattedSalesTotal = new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format((costEstimate?.salesTotal) || 0)
  
  const totalPackages = costEstimate?.warehousePackages + costEstimate?.salesPackages

  const data: DataType[] = [
    {
      title: 'In-Stock Value Estimate',
      value: `${formattedStoreTotal}`,
      icon: 'ri-home-6-line',
      desc: `${(costEstimate?.storePackages) || 0}`,
      change: 0
    },
    {
      title: 'Used Stock Value Estimate',
      value: `${formattedUsedStoreTotal}`,
      icon: 'ri-home-6-line',
      desc: `${(costEstimate?.storeRequisitionPackages) || 0}`,
      change: 0
    },
    {
      title: 'Manufacturing Value Estimate',
      value: `${formattedProductionTotal}`,
      icon: 'ri-hotel-line',
      desc: `${(costEstimate?.productionPackages) || 0}`,
      change: 0
    },
    {
      title: 'Warehouse Packages Value',
      value: `${formattedWarehouseTotal}`,
      icon: 'ri-building-3-line',
      desc: `${(costEstimate?.warehousePackages) || 0}`,
      change: Math.floor((((costEstimate?.warehousePackages) / totalPackages)*100) || 0)
    },
    {
      title: 'Sales Value Estimate',
      value: `${formattedSalesTotal}`,
      icon: 'ri-money-dollar-circle-line',
      desc: `${(costEstimate?.salesPackages) || 0}`,
      change: Math.floor((((costEstimate?.salesPackages) / totalPackages)*100) || 0)
    }
  ]

  // Dynamic grid sizing for better responsiveness
  const getGridSize = () => {
    if (isXsScreen) return { xs: 12 } // 1 card per row on extra small screens
    if (isSmScreen) return { xs: 12, sm: 6 } // 2 cards per row on small screens
    if (isMdScreen) return { xs: 12, sm: 6, md: 4 } // 3 cards per row on medium screens
    return { xs: 12, sm: 6, md: 4, lg: 2.4 } // 5 cards per row on large screens
  }

  const gridSize = getGridSize()

  // Dynamic divider logic for better visual separation
  const shouldShowDivider = (index: number) => {
    const totalItems = data.length
    const lastIndex = totalItems - 1
    
    if (isXsScreen) {
      // Show divider after each item except the last
      return index < lastIndex
    }
    
    if (isSmScreen) {
      // Show divider after odd-indexed items (1st, 3rd card in each row)
      return index < lastIndex && index % 2 === 0
    }
    
    if (isMdScreen) {
      // Show divider after every 3rd item except the last row
      return index < lastIndex && (index + 1) % 3 !== 0
    }
    
    // For large screens, no dividers needed as cards are well-spaced
    return false
  }

  return (
    <Card className="w-full">
      <CardContent>
        <Grid container spacing={isXsScreen ? 3 : 4}>
          {data.map((item, index) => (
            <Grid
              item
              {...gridSize}
              key={index}
              className={classnames({
                // Add responsive padding and borders
                '[&>div]:p-4': isXsScreen,
                '[&>div]:p-3': isSmScreen,
                // Add subtle borders for better visual separation on larger screens
                '[&>div]:border-r [&>div]:border-gray-200 [&:last-child>div]:border-r-0': !isXsScreen && !isSmScreen
              })}
            >
              <div className='flex flex-col gap-2 min-h-[120px]'>
                <div className='flex justify-between items-start'>
                  <div className='flex flex-col gap-2 flex-1'>
                    <Typography 
                      variant={isXsScreen ? 'body2' : 'body1'}
                      className="font-medium leading-tight"
                      sx={{ 
                        fontSize: isXsScreen ? '0.875rem' : '1rem',
                        lineHeight: 1.2 
                      }}
                    >
                      {item.title}
                    </Typography>
                    <Typography 
                      variant={isXsScreen ? 'h5' : 'h4'}
                      className="font-bold"
                      sx={{ 
                        fontSize: isXsScreen ? '1.25rem' : '1.5rem',
                        wordBreak: 'break-word'
                      }}
                    >
                      {item.value}
                    </Typography>
                  </div>
                  <CustomAvatar 
                    variant='rounded' 
                    size={isXsScreen ? 36 : 44}
                    className="ml-2 flex-shrink-0"
                  >
                    <i className={classnames(item.icon, isXsScreen ? 'text-[20px]' : 'text-[28px]')} />
                  </CustomAvatar>
                </div>
                
                <div className="mt-auto">
                  {item.change ? (
                    <div className='flex items-center gap-2 flex-wrap'>
                      <Typography 
                        variant="body2" 
                        className="text-gray-600"
                        sx={{ fontSize: isXsScreen ? '0.75rem' : '0.875rem' }}
                      >
                        {`${item.desc} acquisitions`}
                      </Typography>
                      <Chip
                        variant='tonal'
                        label={`${item.change}%`}
                        size='small'
                        color={item.change > 0 ? 'success' : 'error'}
                        sx={{ fontSize: isXsScreen ? '0.7rem' : '0.75rem' }}
                      />
                    </div>
                  ) : (
                    <Typography 
                      variant="body2" 
                      className="text-gray-600"
                      sx={{ fontSize: isXsScreen ? '0.75rem' : '0.875rem' }}
                    >
                      {`${item.desc} requisitions`}
                    </Typography>
                  )}
                </div>
              </div>
              
              {shouldShowDivider(index) && (
                <Divider 
                  className={classnames('mt-4', {
                    'mb-0': isXsScreen,
                    'mb-2': !isXsScreen
                  })}
                  sx={{ 
                    marginTop: isXsScreen ? '16px' : '24px',
                    marginBottom: isXsScreen ? '0' : '8px'
                  }}
                />
              )}
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  )
}

export default ProductCard