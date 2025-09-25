'use client'

// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import ProductionSidebar from '@/views/mineralwater/requisition-details/stores/StoresProductionRequisitionSidebar'

// Data Imports
import LoaderDark from '@/components/layout/shared/LoaderDark'
import { Suspense } from 'react'
import { getInventoryCategoryItemById } from '@/libs/actions/stores.actions'

import { useParams } from 'next/navigation'
import ProductionDetails from '@/views/mineralwater/requisition-details/production/ProductionStoreRequisitionDetails'
/* const getAcademyData = async () => {
  // Vars
  const res = await fetch(`${process.env.API_URL}/apps/academy`)

  if (!res.ok) {
    throw new Error('Failed to fetch academy data')
  }

  return res.json()
} */

async function InventoryContent() {
  const params = useParams()
  // Vars
  // const data = await getAcademyData()
  // @ts-ignore
  const inventoryContent = await getInventoryCategoryItemById(params.details)
  if (!inventoryContent) {
    return <div>Error loading inventory category data</div>
  }
  console.log(inventoryContent)

  return (
    <Grid container spacing={6}>
      <Grid item xs={12} md={8}>
        {/* @ts-ignore */}
        <ProductionDetails data={inventoryContent} />
      </Grid>
      <Grid item xs={12} md={4}>
        <div className='sticky top-[88px]'>
        {/* @ts-ignore */}
          <ProductionSidebar content={inventoryContent} />
        </div>
      </Grid>
    </Grid>
  
  )
}

export default function InventoryDetailsPage() {
  return (
    <Suspense fallback={<div className='fixed inset-0 flex items-center justify-center z-50 px-[50%] '>
      <LoaderDark />
    </div>}>
      <InventoryContent />
    </Suspense>
  )
}
