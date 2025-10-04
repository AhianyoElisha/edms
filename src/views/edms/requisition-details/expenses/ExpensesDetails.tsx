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
import StyledBreadcrumb from '@/components/layout/shared/Breadcrumbs'
import { ExpensesDetailType } from '@/types/apps/ecommerceTypes'

import { formatPrice, formatDate, formatTime } from '@/utils/dateAndCurrency'

const ExpensesDetails = ({ data }: { data?: ExpensesDetailType }) => {
  const router = useRouter()
  const theme = useTheme()
  const smallScreen = useMediaQuery(theme.breakpoints.down('sm'))

  const getPaymentMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash': return 'success'
      case 'bank': return 'primary'
      case 'cheque': return 'warning'
      case 'momo': return 'info'
      default: return 'default'
    }
  }

  return (
    <div className='flex flex-col gap-10'>
      <Typography variant='h5'>Expense Details</Typography>
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
              {data?.expenseType || 'Expense Record'}
            </Typography>
            <Typography>
              <span className='font-medium text-textPrimary'>
                {formatPrice(data?.amount ?? 0)} Expense
              </span>
            </Typography>
          </div>
          <Chip 
            label={/* @ts-ignore */data?.paymentMode || 'Unknown'} 
            color={/* @ts-ignore */getPaymentMethodColor(data?.paymentMode || '')}
            variant="outlined"
          />
        </CardContent>
        <CardContent>
          <div className='border rounded'>
            <div className='flex flex-col gap-6 p-5'>
              <div className='flex flex-col gap-4'>
                <Typography variant='h5'>Expense Information</Typography>
                <Typography>
                  Expense ID: {data?.$id}
                </Typography>
              </div>
              <Divider />
              <div className='flex flex-col gap-4'>
                <Typography variant='h5'>Expense Summary</Typography>
                <div className='flex flex-wrap gap-x-12 gap-y-2'>
                  <List role='list' component='div' className='flex flex-col gap-2 plb-0'>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-price-tag-3-line text-xl text-textSecondary' />
                      <Typography>Expense Type: {/* @ts-ignore */}{data?.expenseType}</Typography>
                    </ListItem>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-cash-line text-xl text-textSecondary' />
                      <Typography>Total Amount: {formatPrice(data?.amount ?? 0)}</Typography>
                    </ListItem>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-calendar-line text-xl text-textSecondary' />
                      <Typography>
                        Expense Date: {data?.expenseDate ? 
                        // @ts-ignore
                          `${formatDate(data.expenseDate)}, ${formatTime(data.expenseDate)}` : 
                          'Not specified'
                        }
                      </Typography>
                    </ListItem>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-wallet-3-line text-xl text-textSecondary' />
                      <Typography>Payment Mode: {/* @ts-ignore */}{data?.paymentMode}</Typography>
                    </ListItem>
                  </List>
                  <List role='list' component='div' className='flex flex-col gap-2 plb-0'>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-money-dollar-circle-line text-xl text-textSecondary' />
                      <Typography>Cash: {formatPrice(data?.cash ?? 0)}</Typography>
                    </ListItem>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-bank-line text-xl text-textSecondary' />
                      <Typography>Bank: {formatPrice(data?.bank ?? 0)}</Typography>
                    </ListItem>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-file-paper-line text-xl text-textSecondary' />
                      <Typography>Cheque: {formatPrice(data?.cheque ?? 0)}</Typography>
                    </ListItem>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-smartphone-line text-xl text-textSecondary' />
                      <Typography>Mobile Money: {formatPrice(data?.momo ?? 0)}</Typography>
                    </ListItem>
                  </List>
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
              <Divider />
              <div className='flex flex-col gap-4'>
                <Typography variant='h5'>Description</Typography>
                <Typography>{data?.description || 'No description provided'}</Typography>
              </div>
              <Divider />
              <div className='flex flex-col gap-4'>
                <Typography variant='h5'>Recorded by:</Typography>
                <div className='flex items-center gap-4'>
                  <CustomAvatar 
                    skin='light-static' 
                    color='warning' 
                    src={''} 
                    size={38}
                    sx={{
                      '& .MuiAvatar-img': {
                        objectFit: 'contain'
                      }
                    }}
                  />
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

export default ExpensesDetails
