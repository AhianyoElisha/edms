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



const MachineryCard = () => {
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
  // Hooks
  const isBelowMdScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'))
  const isSmallScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'))

  const formattedMachineryTotal = new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format((costEstimate?.machineryTotal) || 0)
  
  const totalPackages = costEstimate?.storePackages + costEstimate?.productionPackages +
    costEstimate?.warehousePackages + costEstimate?.salesPackages + costEstimate?.machineryPackages
  const data: DataType[] = [
    {
      title: 'Machinery Value Estimate',
      value: `${formattedMachineryTotal}`,
      icon: 'ri-tools-line',
      desc: `${(costEstimate?.machineryPackages) || 0}`,
      change: Math.floor((((costEstimate?.storePackages) / totalPackages)*100) || 0)
    },
  ]


  return (
    <Card>
      <CardContent>
        <Grid container spacing={6} sx={{ width: '100%' }}>
          {data.map((item, index) => (
            <Grid
              item
              xs={12}
              key={index}
            >
              <div className='flex flex-col gap-1'>
                <div className='flex justify-between'>
                  <div className='flex flex-col gap-1'>
                    <Typography>{item.title}</Typography>
                    <Typography variant='h4'>{item.value}</Typography>
                  </div>
                  <CustomAvatar variant='rounded' size={44}>
                    <i className={classnames(item.icon, 'text-[28px]')} />
                  </CustomAvatar>
                </div>
                {item.change ? (
                  <div className='flex items-center gap-2'>
                    <Typography>{`${item.desc} acquisitions`}</Typography>
                  </div>
                ) : (
                  <Typography>{`${item.desc} requisitions`}</Typography>
                )}
              </div>
              {isBelowMdScreen && !isSmallScreen && index < data.length - 2 && (
                <Divider
                  className={classnames('mbs-6', {
                    'mie-6': index % 2 === 0
                  })}
                />
              )}
              {isSmallScreen && index < data.length - 1 && <Divider className='mbs-6' />}
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  )
}

export default MachineryCard
