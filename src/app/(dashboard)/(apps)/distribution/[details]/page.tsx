'use client'

// MUI Imports
import Grid from '@mui/material/Grid'


// Data Imports
import LoaderDark from '@/components/layout/shared/LoaderDark'
import { Suspense } from 'react'

import { useParams } from 'next/navigation'
import { getDistributionItemById } from '@/libs/actions/distribution.actions'
import DistributionDetails from '@/views/mineralwater/requisition-details/distribution/DistributionDetails'


async function DistributionContent() {
  const params = useParams()
  // Vars
  // const data = await getAcademyData()
  // @ts-ignore
  const distributionContent = await getDistributionItemById(params.details)
  if (!distributionContent) {
    return <div>Error loading distribution product data</div>
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        {/* @ts-ignore */}
        <DistributionDetails data={distributionContent} />
      </Grid>
    </Grid>
  
  )
}

export default function DistributionDetailsPage() {
  return (
    <Suspense fallback={<div className='fixed inset-0 flex items-center justify-center z-50 px-[50%] '>
      <LoaderDark />
    </div>}>
      <DistributionContent />
    </Suspense>
  )
}
