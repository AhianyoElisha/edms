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
import { InventoryListType } from '@/types/apps/ecommerceTypes'

type DataType = {
  title: string
  value: string
  icon: string
  desc: string
  change?: number
}



const ProductCard = ({ costEstimate }: { costEstimate: any }) => {
  // Hooks
  const isBelowMdScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'))
  const isSmallScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'))

   const formattedStoreTotal = new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
   }).format(costEstimate.storeTotal ?? 0)
  
     const formattedProductionTotal = new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(costEstimate.productionTotal ?? 0)
  // Vars
  const data: DataType[] = [
    {
      title: 'In-Store Estimate',
      value: `${formattedStoreTotal}`,
      icon: 'ri-home-6-line',
      desc: `${costEstimate.storePackages - costEstimate.productionPackages}`,
      change: Math.floor(((costEstimate.storePackages - costEstimate.productionPackages) / costEstimate.storePackages)*100)
    },
    {
      title: 'In-Production Estimate',
      value: `${formattedProductionTotal}`,
      icon: 'ri-hotel-line',
      desc: `${costEstimate.productionPackages}`,
      change: 0
    },
    {
      title: 'Warehouse Estimate',
      value: 'GH₵0.00',
      icon: 'ri-building-3-line',
      desc: '0',
      change: 0
    },
    {
      title: 'Sales',
      value: 'GH₵0.00',
      icon: 'ri-money-dollar-circle-line',
      desc: '0',
      change: 0
    }
  ]


  return (
    <Card>
      <CardContent>
        <Grid container spacing={6}>
          {data.map((item, index) => (
            <Grid
              item
              xs={12}
              sm={6}
              md={3}
              key={index}
              className={classnames({
                '[&:nth-of-type(odd)>div]:pie-6 [&:nth-of-type(odd)>div]:border-ie': isBelowMdScreen && !isSmallScreen,
                '[&:not(:last-child)>div]:pie-6 [&:not(:last-child)>div]:border-ie': !isBelowMdScreen
              })}
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
                    <Chip
                      variant='tonal'
                      label={`${item.change}%`}
                      size='small'
                      color={item.change > 0 ? 'success' : 'error'}
                    />
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

export default ProductCard
