'use client'

// Next Imports
import { redirect, useParams } from 'next/navigation'

// Type Imports
import type { Customer } from '@/types/apps/ecommerceTypes'

// Component Imports
import CustomerDetails from '@/views/edms/customers/details'
import { Grid } from '@mui/material'
import { getCustomerDetailsById } from '@/libs/actions/customer.action'
import LoaderDark from '@/components/layout/shared/LoaderDark'
import { Suspense } from 'react'

// Data Imports

async function CustomerContent() {
  const params = useParams()
  // Vars
  // const data = await getAcademyData()
  // @ts-ignore
  const customerData = await getCustomerDetailsById(params.id)

  console.log(customerData)


  return (
    <Grid container spacing={6}>
      <div>
        Page Uner contruction
      </div>
      {/* <CustomerDetails customerData={customerData as unknown as Customer} customerId={params.id as string} /> */}
    </Grid>
  
  )
}

export default function CustomerDetailsPage() {
  return (
    <Suspense fallback={<div className='fixed inset-0 flex items-center justify-center z-50 px-[50%] '>
      <LoaderDark />
    </div>}>
      <CustomerContent />
    </Suspense>
  )
}