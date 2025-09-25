'use client'

import { useRouter } from 'next/navigation'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'

import CustomAvatar from '@core/components/mui/Avatar'
import ProductImages from '../ProductsImages'
import StyledBreadcrumb from '@/components/layout/shared/Breadcrumbs'
import { ReturnItemDetailType } from '@/types/apps/ecommerceTypes'

import { formatPrice, formatDate, formatTime } from '@/utils/dateAndCurrency'

const ReturnsDetails = ({ data }: { data?: ReturnItemDetailType }) => {
  const router = useRouter()
  const theme = useTheme()
  const smallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  
  // @ts-ignore
  const images = JSON.parse(data?.category?.images ?? '[]');

  return (
    <div className='flex flex-col gap-10'>
      <Typography variant='h5'>Returned Goods Details</Typography>
      <div role="presentation">
        <Breadcrumbs aria-label="breadcrumb">
          <StyledBreadcrumb 
            component="a"
            onClick={() => router.back()}
            icon={<i className='ri-menu-4-line' />}
            className='cursor-pointer'
            label="List" 
          />
          <StyledBreadcrumb
            label="Details"
            icon={<i className='ri-stack-line' />}
            className='cursor-pointer'
            disabled
          />
        </Breadcrumbs>
      </div>
      <Card>
        <CardContent className='flex flex-wrap items-center justify-between gap-4 pbe-6'>
          <div>
            <Typography variant='h5'>
              {/* @ts-ignore */}
              {data?.category?.title || 'Returned Item'}
            </Typography>
            <Typography>
              <span className='font-medium text-textPrimary'>
                Returned from {/* @ts-ignore */}
                {data?.vehicle?.vehicleType === 'truck' ? '🚛' : '🚲'} {data?.vehicle?.vehicleNumber}
              </span>
            </Typography>
          </div>
        </CardContent>
        <CardContent>
          <div className='border rounded'>
            {images.length > 0 && (
              <div className='mli-2 mbs-2 overflow-hidden rounded'>
                <ProductImages items={images} />
              </div>
            )}
            <div className='flex flex-col gap-6 p-5'>
              <div className='flex flex-col gap-4'>
                <Typography variant='h5'>Return Information</Typography>
                <Typography>
                  Return ID: {data?.$id}
                </Typography>
              </div>
              <Divider />
              <div className='flex flex-col gap-4'>
                <Typography variant='h5'>Return Summary</Typography>
                <div className='flex flex-wrap gap-x-12 gap-y-2'>
                  <List role='list' component='div' className='flex flex-col gap-2 plb-0'>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-arrow-go-back-line text-xl text-textSecondary' />
                      <Typography>Quantity Returned: {data?.quantity} packages</Typography>
                    </ListItem>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-calendar-line text-xl text-textSecondary' />
                      <Typography>
                        Return Date: {data?.returnDate ? 
                        // @ts-ignore
                          `${formatDate(data.returnDate)}, ${formatTime(data.returnDate)}` : 
                          'Not specified'
                        }
                      </Typography>
                    </ListItem>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-product-hunt-line text-xl text-textSecondary' />
                      {/* @ts-ignore */}
                      <Typography>Category: {data?.category?.title || 'Unknown'}</Typography>
                    </ListItem>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-money-dollar-box-line text-xl text-textSecondary' />
                      <Typography>Value Per Package: 
                        {/* @ts-ignore */}
                        {formatPrice((data?.category?.pricePerBox) ?? 0)}
                      </Typography>
                    </ListItem>
                  </List>
                  <List role='list' component='div' className='flex flex-col gap-2 plb-0'>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-cash-line text-xl text-textSecondary' />
                      <Typography>Total Return Value: {/* @ts-ignore */}
                        {formatPrice(((data?.category?.pricePerBox || 0) * (data?.quantity || 0)))}
                      </Typography>
                    </ListItem>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-truck-line text-xl text-textSecondary' />
                      <Typography>Vehicle Type: {/* @ts-ignore */}
                        {data?.vehicle?.vehicleType?.charAt(0).toUpperCase() + data?.vehicle?.vehicleType?.slice(1) || 'Unknown'}
                      </Typography>
                    </ListItem>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-map-pin-line text-xl text-textSecondary' />
                      <Typography>Vehicle Route: {/* @ts-ignore */}
                        {data?.vehicle?.starttown} → {data?.vehicle?.endtown}
                      </Typography>
                    </ListItem>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-dropbox-line text-xl text-textSecondary' />
                      <Typography>Items Per Package: {/* @ts-ignore */}
                        {data?.category?.qtyPerPackage || 'Unknown'}
                      </Typography>
                    </ListItem>
                  </List>
                </div>
              </div>
              <Divider />
              <div className='flex flex-col gap-4'>
                <Typography variant='h5'>Product Description</Typography>
                <Typography>{/* @ts-ignore */}
                  {data?.category?.description || 'No description available'}</Typography>
              </div>
              <Divider />
              <div className='flex flex-col gap-4'>
                <Typography variant='h5'>Recorded by:</Typography>
                <div className='flex items-center gap-4'>
                  <CustomAvatar skin='light-static' color='error' src={''} size={38} />
                  <div className='flex flex-col gap-1'>
                    <Typography className='font-medium' color='text.primary'>
                      {/* @ts-ignore */}
                      {data?.creator?.name || 'Unknown User'}
                    </Typography>
                    <Typography variant='body2'>
                      {/* @ts-ignore */}
                      {data?.creator?.role || 'User'}
                    </Typography>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ReturnsDetails
