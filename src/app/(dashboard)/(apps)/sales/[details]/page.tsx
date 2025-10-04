'use client'

// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import LoaderDark from '@/components/layout/shared/LoaderDark'
import { Suspense } from 'react'

import { useParams } from 'next/navigation'
import { getSalesItemById } from '@/libs/actions/warehouse.actions'
import SalesDetails from '@/views/edms/requisition-details/sales/SalesDetails'


async function SalesContent() {
  const params = useParams()

  // @ts-ignore
  const salesContent = await getSalesItemById(params.details)
  if (!salesContent) {
    return <div>Error loading sales data</div>
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        {/* @ts-ignore */}
        <SalesDetails data={salesContent} />
      </Grid>
    </Grid>
  
  )
}

export default function SalesDetailsPage() {
  return (
    <Suspense fallback={<div className='fixed inset-0 flex items-center justify-center z-50 px-[50%] '>
      <LoaderDark />
    </div>}>
      <SalesContent />
    </Suspense>
  )
}
