'use client'

// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import LoaderDark from '@/components/layout/shared/LoaderDark'
import { Suspense } from 'react'

import { useParams } from 'next/navigation'
import ProductionDetails from '@/views/mineralwater/requisition-details/production/ProductionWarehouseRequisitionDetails'
import { getProductionCategoryItemById } from '@/libs/actions/production.actions'


async function ProductionContent() {
  const params = useParams()
  // Vars
  // const data = await getAcademyData()
  // @ts-ignore
  const productionContent = await getProductionCategoryItemById(params.details)
  if (!productionContent) {
    return <div>Error loading production category data</div>
  }
  console.log(productionContent)

  return (
    <Grid container spacing={6}>
      <Grid item xs={12} md={8}>
        {/* @ts-ignore */}
        <ProductionDetails data={productionContent} />
      </Grid>
    </Grid>
  
  )
}

export default function WarehouseRequisitionDetailsPage() {
  return (
    <Suspense fallback={<div className='fixed inset-0 flex items-center justify-center z-50 px-[50%] '>
      <LoaderDark />
    </div>}>
      <ProductionContent />
    </Suspense>
  )
}
