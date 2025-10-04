'use client'

// MUI Imports
import Grid from '@mui/material/Grid'

// Data Imports
import LoaderDark from '@/components/layout/shared/LoaderDark'
import { Suspense } from 'react'

import { useParams } from 'next/navigation'
import { getReturnedProductItemById } from '@/libs/actions/warehouse.actions'
import ReturnsDetails from '@/views/edms/requisition-details/returns/ReturnsDetails'


async function ReturnsContent() {
  const params = useParams()
  // Vars
  // const data = await getAcademyData()
  // @ts-ignore
  const returnedContent = await getReturnedProductItemById(params.details)
  if (!returnedContent) {
    return <div>Error loading returned product data</div>
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        {/* @ts-ignore */}
        <ReturnsDetails data={returnedContent} />
      </Grid>
    </Grid>
  
  )
}

export default function ReturnsDetailsPage() {
  return (
    <Suspense fallback={<div className='fixed inset-0 flex items-center justify-center z-50 px-[50%] '>
      <LoaderDark />
    </div>}>
      <ReturnsContent />
    </Suspense>
  )
}
