'use client'

import { useRouter } from 'next/navigation'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'

import CustomAvatar from '@core/components/mui/Avatar'
import ProductImages from '../ProductsImages'
import StyledBreadcrumb from '@/components/layout/shared/Breadcrumbs'
import { TransactionItemDetailType } from '@/types/apps/ecommerceTypes'

import { formatPrice, formatDate, formatTime } from '@/utils/dateAndCurrency'

const SalesDetails = ({ data }: { data?: TransactionItemDetailType }) => {
  const router = useRouter()
  const theme = useTheme()
  const smallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  
  // @ts-ignore
  const images = JSON.parse(data?.category?.images ?? '[]');

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'success'
      case 'partial': return 'warning'
      case 'unpaid': return 'error'
      default: return 'default'
    }
  }

  const totalPayments = (data?.cash || 0) + (data?.bank || 0) + (data?.cheque || 0) + (data?.momo || 0)

  return (
    <div className='flex flex-col gap-10'>
      <Typography variant='h5'>Sales Transaction Details</Typography>
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
              {data?.category?.title || 'Sales Transaction'}
            </Typography>
            <Typography>
              <span className='font-medium text-textPrimary'>
                {/* @ts-ignore */}
                Sold by {data?.vehicle?.vehicleType === 'truck' ? '🚛' : '🚲'} {data?.vehicle?.vehicleNumber || data?.creator?.name}
              </span>
            </Typography>
          </div>
          <Chip 
            label={/* @ts-ignore */data?.paymentStatus || 'Unknown'} 
            color={/* @ts-ignore */getPaymentStatusColor(data?.paymentStatus || '')}
            variant="outlined"
          />
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
                <Typography variant='h5'>Transaction Information</Typography>
                <Typography>
                  Transaction ID: {data?.$id}
                </Typography>
              </div>
              <Divider />
              <div className='flex flex-col gap-4'>
                <Typography variant='h5'>Sales Summary</Typography>
                <div className='flex flex-wrap gap-x-12 gap-y-2'>
                  <List role='list' component='div' className='flex flex-col gap-2 plb-0'>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-shopping-cart-line text-xl text-textSecondary' />
                      <Typography>Quantity Sold: {data?.quantity} packages</Typography>
                    </ListItem>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-cash-line text-xl text-textSecondary' />
                      <Typography>Total Amount: {formatPrice(data?.totalPrice ?? 0)}</Typography>
                    </ListItem>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-calendar-line text-xl text-textSecondary' />
                      <Typography>
                        Sales Date: {data?.salesDate ? 
                        // @ts-ignore
                          `${formatDate(data.salesDate)}, ${formatTime(data.salesDate)}` : 
                          'Not specified'
                        }
                      </Typography>
                    </ListItem>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-wallet-3-line text-xl text-textSecondary' />
                      <Typography>Payment Status: {/* @ts-ignore */}
                        {data?.paymentStatus}</Typography>
                    </ListItem>
                  </List>
                  <List role='list' component='div' className='flex flex-col gap-2 plb-0'>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-user-line text-xl text-textSecondary' />
                      <Typography>Customer: {/* @ts-ignore */}
                        {data?.customers?.customer || 'General/Walk-in Customer'}
                      </Typography>
                    </ListItem>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-map-pin-line text-xl text-textSecondary' />
                      <Typography>Sales Area: {/* @ts-ignore */}
                        {data?.salesCategory?.categoryTitle || 'Not specified'}
                      </Typography>
                    </ListItem>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-product-hunt-line text-xl text-textSecondary' />
                      <Typography>Category: {/* @ts-ignore */}
                        {data?.category?.title || 'Unknown'}</Typography>
                    </ListItem>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-money-dollar-box-line text-xl text-textSecondary' />
                      <Typography>Price Per Package: {/* @ts-ignore */}
                        {formatPrice((data?.category?.pricePerBox) ?? 0)}
                      </Typography>
                    </ListItem>
                  </List>
                </div>
              </div>
              <Divider />
              <div className='flex flex-col gap-4'>
                <Typography variant='h5'>Payment Breakdown</Typography>
                <div className='flex flex-wrap gap-x-12 gap-y-2'>
                  <List role='list' component='div' className='flex flex-col gap-2 plb-0'>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-money-dollar-circle-line text-xl text-textSecondary' />
                      <Typography>Cash Payment: {formatPrice(data?.cash ?? 0)}</Typography>
                    </ListItem>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-bank-line text-xl text-textSecondary' />
                      <Typography>Bank Transfer: {formatPrice(data?.bank ?? 0)}</Typography>
                    </ListItem>
                  </List>
                  <List role='list' component='div' className='flex flex-col gap-2 plb-0'>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-file-paper-line text-xl text-textSecondary' />
                      <Typography>Cheque Payment: {formatPrice(data?.cheque ?? 0)}</Typography>
                    </ListItem>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-smartphone-line text-xl text-textSecondary' />
                      <Typography>Mobile Money: {formatPrice(data?.momo ?? 0)}</Typography>
                    </ListItem>
                  </List>
                </div>
                <div className='mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded'>
                  <Typography variant='body2' color='text.secondary'>
                    Total Payments Received: {formatPrice(totalPayments)}
                  </Typography>
                  {totalPayments < (data?.totalPrice || 0) && (
                    <Typography variant='body2' color='error.main'>
                      Outstanding Balance: {formatPrice((data?.totalPrice || 0) - totalPayments)}
                    </Typography>
                  )}
                </div>
              </div>
              {/* @ts-ignore */}
              {data?.vehicle && (
                <>
                  <Divider />
                  <div className='flex flex-col gap-4'>
                    <Typography variant='h5'>Vehicle Information</Typography>
                    <div className='flex items-center gap-2'>
                      <i className={`${/* @ts-ignore */
                        data?.vehicle?.vehicleType === 'truck' ? 'ri-truck-line' : 'ri-e-bike-line'} text-xl text-textSecondary`} />
                      <Typography>
                        {/* @ts-ignore */}
                        {data?.vehicle?.vehicleType?.charAt(0).toUpperCase() + data?.vehicle?.vehicleType?.slice(1)} - {data?.vehicle?.vehicleNumber}
                      </Typography>
                    </div>
                    <Typography variant='body2' color='text.secondary'>
                      Route: {/* @ts-ignore */}
                      {data?.vehicle?.starttown} → {data?.vehicle?.endtown}
                    </Typography>
                  </div>
                </>
              )}
              {/* @ts-ignore */}
              {data?.customers && (
                <>
                  <Divider />
                  <div className='flex flex-col gap-4'>
                    <Typography variant='h5'>Customer Information</Typography>
                    <div className='flex items-center gap-2'>
                      <i className='ri-user-line text-xl text-textSecondary' />
                      <Typography>
                        {/* @ts-ignore */}
                        {data?.customers?.customer}
                      </Typography>
                    </div>
                    {/* @ts-ignore */}
                    {data?.customers?.email && (
                      <Typography variant='body2' color='text.secondary'>
                        Email: {/* @ts-ignore */}
                        {data?.customers?.email}
                      </Typography>
                    )}
                    {/* @ts-ignore */}
                    {data?.customers?.contact1 && (
                      <Typography variant='body2' color='text.secondary'>
                        Contact: {/* @ts-ignore */}
                        {data?.customers?.contact1}
                      </Typography>
                    )}
                  </div>
                </>
              )}
              <Divider />
              <div className='flex flex-col gap-4'>
                <Typography variant='h5'>Product Description</Typography>
                <Typography>{/* @ts-ignore */}
                  {data?.category?.description || 'No description available'}</Typography>
              </div>
              <Divider />
              <div className='flex flex-col gap-4'>
                <Typography variant='h5'>Transaction processed by:</Typography>
                <div className='flex items-center gap-4'>
                  <CustomAvatar skin='light-static' color='info' src={''} size={38} />
                  <div className='flex flex-col gap-1'>
                    <Typography className='font-medium' color='text.primary'>
                      {/* @ts-ignore */}
                      {data?.creator?.name || 'Unknown User'}
                    </Typography>
                    <Typography variant='body2'>
                      {/* @ts-ignore */}
                      {data?.creator?.role || 'Sales Person'}
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

export default SalesDetails
