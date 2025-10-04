'use client'

// MUI Imports
import Grid from '@mui/material/Grid'

// Data Imports
import LoaderDark from '@/components/layout/shared/LoaderDark'
import { Suspense } from 'react'
import { getWarehouseProductItemById } from '@/libs/actions/warehouse.actions'
import { useParams } from 'next/navigation'
import ProductionDetails from '@/views/edms/requisition-details/warehouse/ProductionDetails'


async function WarehouseContent() {
  const params = useParams()
  // Vars
  // const data = await getAcademyData()
  // @ts-ignore
  const warehouseContent = await getWarehouseProductItemById(params.details)
  if (!warehouseContent) {
    return <div>Error loading warehouse data</div>
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12} md={8}>
        {/* @ts-ignore */}
        <ProductionDetails data={warehouseContent} />
      </Grid>
    </Grid>
  
  )
}

export default function InventoryDetailsPage() {
  return (
    <Suspense fallback={<div className='fixed inset-0 flex items-center justify-center z-50 px-[50%] '>
      <LoaderDark />
    </div>}>
      <WarehouseContent />
    </Suspense>
  )
}
