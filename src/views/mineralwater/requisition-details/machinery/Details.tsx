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
import { MachineryListType } from '@/types/apps/ecommerceTypes'

import { useAuth } from '@/contexts/AppwriteProvider'
import { formatPrice } from '@/utils/dateAndCurrency'
import { Chip } from '@mui/material'
import { ThemeColor } from '@/@core/types'
import { format } from 'date-fns'


type productStatusType = {
  [key: string]: {
    title: string
    color: ThemeColor
  }
}

const productStatusObj: productStatusType = {
  paid: { title: 'Paid', color: 'success' },
  credit: { title: 'On Credit', color: 'error' },
  partial: { title: 'Partial Payment', color: 'warning' }
}

const Details = ({ data }: { data?: MachineryListType }) => {
  const router = useRouter()
  const theme = useTheme()
  const smallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  
  const images = JSON.parse(data?.images ?? '');
  const { user } = useAuth();

  const dateString = data?.purchaseDate!;
  let formattedDate;

    // Attempt to parse the date string
    const date = new Date(dateString);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }

    // Format the date
    formattedDate = format(date, 'MMM dd, yyyy'); // e.g., "Sep 23, 2024"



  

  return (
    <div className='flex flex-col gap-10'>
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
            <Typography variant='h5'>{ data?.productBrand ?? '' }</Typography>
            <Typography>
              {/* @ts-ignore */}
              <span className='font-medium text-textPrimary'>{ data?.category?.categoryTitle }</span>
            </Typography>
          </div>
        </CardContent>
        <CardContent>
          <div className='border rounded'>
            <div className='mli-2 mbs-2 overflow-hidden rounded'>
              <ProductImages items={images} />
            </div>
            <div className='flex flex-col gap-6 p-5'>
              <div>
                <Typography variant='h5' className='mb-5'>Product Payment Status</Typography>
                <Chip
                    label={productStatusObj[data!.paymentStatus!].title}
                    variant='tonal'
                    color={productStatusObj[data!.paymentStatus].color}
                    size='small'
                  />
              </div>
              <Divider/>
              <div className='flex flex-col gap-4'>
                <Typography variant='h5'>By the numbers</Typography>
                <div className='flex flex-wrap gap-x-12 gap-y-2'>
                  <List role='list' component='div' className='flex flex-col gap-2 plb-0'>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-instance-line text-xl text-textSecondary' />
                      <Typography>Number of Packages: {data?.packageQuantity}</Typography>
                    </ListItem>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-cash-line text-xl text-textSecondary' />
                      <Typography>Total Cost: {formatPrice(data?.totalPrice ?? 0)}</Typography>
                    </ListItem>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-pages-line text-xl text-textSecondary' />
                      <Typography>Inventory Status: {data?.status}</Typography>
                    </ListItem>
                  </List>
                  <List role='list' component='div' className='flex flex-col gap-2 plb-0'>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-money-dollar-box-line text-xl text-textSecondary' />
                      <Typography>Cost Per Set: {formatPrice(data?.pricePerOne ?? 0)}</Typography>
                    </ListItem>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-time-line text-xl text-textSecondary' />
                      Purchase Date: {formattedDate}
                    </ListItem>

                  </List>
                </div>
              </div>
              <Divider />
              <div className='flex flex-col gap-4'>
                <Typography variant='h5'>Description</Typography>
                <Typography>{data?.description}</Typography>
              </div>
              <Divider />
              <div className='flex flex-col gap-4'>
                <Typography variant='h5'>Inventory added by:</Typography>
                <div className='flex items-center gap-4'>
                  <CustomAvatar 
                    skin='light-static' 
                    color='error' 
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
                      {
                        // @ts-ignore
                        data?.creator?.name}
                    </Typography>

                    <Typography variant='body2'>{
                      // @ts-ignore
                      data?.creator?.role}</Typography>
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

export default Details
