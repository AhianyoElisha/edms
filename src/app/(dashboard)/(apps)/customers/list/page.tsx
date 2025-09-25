'use client'

import CustomerListTable from '@views/mineralwater/customers/list/CustomerListTable'

// Data Imports
import LoaderDark from '@/components/layout/shared/LoaderDark'
import { Grid } from '@mui/material'
import { Suspense } from 'react'
import { getCustomerList } from '@/libs/actions/customer.action'
import { Customer } from '@/types/apps/ecommerceTypes'


const CustomerListContent = () => {

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        {/* @ts-ignore */}
        <CustomerListTable />
      </Grid>
    </Grid>
  )
}

export default CustomerListContent