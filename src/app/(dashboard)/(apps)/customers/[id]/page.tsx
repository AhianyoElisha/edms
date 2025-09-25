'use client'

// Next Imports
import { redirect, useParams } from 'next/navigation'

// Type Imports
import type { Customer } from '@/types/apps/ecommerceTypes'

// Component Imports
import CustomerDetails from '@/views/mineralwater/customers/details'
import { Grid } from '@mui/material'
import { getCustomerDetailsById } from '@/libs/actions/customer.action'
import LoaderDark from '@/components/layout/shared/LoaderDark'
import { Suspense } from 'react'

// Data Imports

const CustomerContent = () => {
  const params = useParams()

  return (
    <Grid container spacing={6}>
      <CustomerDetails  customerId={params.id as string} />
    </Grid>
  
  )
}

export default CustomerContent