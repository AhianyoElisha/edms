'use client'

// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports

// Data Imports
import LoaderDark from '@/components/layout/shared/LoaderDark'
import { Suspense } from 'react'
import WarehouseProductionRequisitionDetails from '@/views/edms/requisition-details/warehouse/WarehouseProductionRequisitionDetails'
import WarehouseProductionRequisitionSidebar from '@/views/edms/requisition-details/warehouse/WarehouseProductionRequisitionSidebar'

import { useParams } from 'next/navigation'
import { getProductionCategoryItemById } from '@/libs/actions/production.actions'
/* const getAcademyData = async () => {
  // Vars
  const res = await fetch(`${process.env.API_URL}/apps/academy`)

  if (!res.ok) {
    throw new Error('Failed to fetch academy data')
  }

  return res.json()
} */

async function WarehouseContent() {
  const params = useParams()
  // Vars
  // const data = await getAcademyData()
  // @ts-ignore
  const productionContent = await getProductionCategoryItemById(params.details)
  if (!productionContent) {
    return <div>Error loading warehouse category data</div>
  }
  console.log(productionContent)

  return (
    <Grid container spacing={6}>
      <Grid item xs={12} md={8}>
        {/* @ts-ignore */}
        <WarehouseProductionRequisitionDetails data={productionContent} />
      </Grid>
      <Grid item xs={12} md={4}>
        <div className='sticky top-[88px]'>
        {/* @ts-ignore */}
          <WarehouseProductionRequisitionSidebar content={productionContent} />
        </div>
      </Grid>
    </Grid>
  
  )
}

export default function ProductionRequisitionDetailsPage() {
  return (
    <Suspense fallback={<div className='fixed inset-0 flex items-center justify-center z-50 px-[50%] '>
      <LoaderDark />
    </div>}>
      <WarehouseContent />
    </Suspense>
  )
}
