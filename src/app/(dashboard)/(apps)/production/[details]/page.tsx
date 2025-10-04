'use client'

// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import Details from '@/views/edms/requisition-details/stores/Details'

// Data Imports
import { getAcademyData } from '@/app/server/actions'
import LoaderDark from '@/components/layout/shared/LoaderDark'
import { Suspense } from 'react'
import { getInventoryItemById } from '@/libs/actions/stores.actions'

import { useParams } from 'next/navigation'
import ProductionDetails from '@/views/edms/requisition-details/production/ProductionDetails'
import { getProductionItemById } from '@/libs/actions/production.actions'


async function InventoryContent() {
  const params = useParams()
  // Vars
  // const data = await getAcademyData()
  // @ts-ignore
  const manufacturedContent = await getProductionItemById(params.details)
  if (!manufacturedContent) {
    return <div>Error loading manufactured product data</div>
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12} md={8}>
        {/* @ts-ignore */}
        <ProductionDetails data={manufacturedContent} />
      </Grid>
      {/* <Grid item xs={12} md={4}>
        <div className='sticky top-[88px]'>
          <ProductionSidebar content={manufacturedContent} />
        </div>
      </Grid> */}
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
