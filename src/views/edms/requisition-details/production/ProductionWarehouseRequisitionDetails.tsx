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

import ProductImages from '../ProductsImages'
import StyledBreadcrumb from '@/components/layout/shared/Breadcrumbs'
import { CategoryType } from '@/types/apps/ecommerceTypes'

import { formatPrice } from '@/utils/dateAndCurrency'



const ProductionDetails = ({ data }: { data?: CategoryType }) => {
  const router = useRouter()
  const theme = useTheme()
  const smallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  // @ts-ignore
  const images = JSON.parse(data?.images ?? '');

  return (
    <div className='flex flex-col gap-5'>
      <Typography variant='h5'>{`Production -> Warehouse Requisition`}</Typography>
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
            <Typography variant='h5'>{
              // @ts-ignore
              data?.title ?? ''}</Typography>
          </div>
        </CardContent>
        <CardContent>
          <div className='border rounded'>
            <div className='mli-2 mbs-2 overflow-hidden rounded'>
              <ProductImages items={images} />
            </div>
            <div className='flex flex-col gap-6 p-5'>

              <Divider />
              <div className='flex flex-col gap-4'>
                <Typography variant='h5'>By the numbers</Typography>
                <div className='flex flex-wrap gap-x-12 gap-y-2'>
                  <List role='list' component='div' className='flex flex-col gap-2 plb-0'>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-instance-line text-xl text-textSecondary' />
                      <Typography>Number of Packages Available for Requisition: {data?.totalProducts}</Typography>
                    </ListItem>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-dropbox-line text-xl text-textSecondary' />
                      {/* @ts-ignore */}
                      <Typography>Quantity Per Box: {data?.quantityPerPackage}</Typography>
                    </ListItem>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-pages-line text-xl text-textSecondary' />
                      <Typography>Category Status: {data?.status}</Typography>
                    </ListItem>
                  </List>
                  <List role='list' component='div' className='flex flex-col gap-2 plb-0'>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-money-dollar-box-line text-xl text-textSecondary' />
                      <Typography>Cost Per Box: {formatPrice(data?.pricePerBox ?? 0)}</Typography>
                    </ListItem>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-inbox-archive-line text-xl text-textSecondary' />
                      {/* @ts-ignore */}
                      <Typography>Cost of one item in box: {formatPrice(((data?.priceOfOneItem) ?? 0 / (data?.quantityPerPackage ?? 0)) ?? 0)}</Typography>
                    </ListItem>
                    <ListItem role='listitem' className='flex items-center gap-2 p-0'>
                      <i className='ri-dropbox-line text-xl text-textSecondary' />
                      <Typography>Quantity Requested: {data?.requisitionRequest}</Typography>
                    </ListItem>
                  </List>
                </div>
              </div>
              <Divider />
              <div className='flex flex-col gap-4'>
                <Typography variant='h5'>Description</Typography>
                <Typography>{data?.description}</Typography>
              </div>
              {/* <Divider /> */}
              {/* <div className='flex flex-col gap-4'>
                <Typography variant='h5'>Category created by:</Typography>
                <div className='flex items-center gap-4'>
                  <CustomAvatar skin='light-static' color='error' src={''} size={38} />
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
              </div> */}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ProductionDetails
