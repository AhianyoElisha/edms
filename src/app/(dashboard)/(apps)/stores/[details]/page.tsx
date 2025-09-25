'use client'

// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import Details from '@/views/mineralwater/requisition-details/stores/Details'
import Sidebar from '@/views/mineralwater/requisition-details/stores/Sidebar'

// Data Imports
import LoaderDark from '@/components/layout/shared/LoaderDark'
import { Suspense } from 'react'
import { getInventoryItemById } from '@/libs/actions/stores.actions'

import { useParams } from 'next/navigation'
/**
 * ! If you need data using an API call, uncomment the below API code, update the `process.env.API_URL` variable in the
 * ! `.env` file found at root of your project and also update the API endpoints like `/apps/academy` in below example.
 * ! Also, remove the above server action import and the action itself from the `src/app/server/actions.ts` file to clean up unused code
 * ! because we've used the server action for getting our static data.
 */


async function InventoryContent() {
  const params = useParams()
  // Vars
  // const data = await getAcademyData()
  // @ts-ignore
  const inventoryContent = await getInventoryItemById(params.details)
  if (!inventoryContent) {
    return <div>Error loading inventory data</div>
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12} md={8}>
        {/* @ts-ignore */}
        <Details data={inventoryContent} />
      </Grid>
      <Grid item xs={12} md={4}>
        <div className='sticky top-[88px]'>
        {/* @ts-ignore */}
          <Sidebar content={inventoryContent} />
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
