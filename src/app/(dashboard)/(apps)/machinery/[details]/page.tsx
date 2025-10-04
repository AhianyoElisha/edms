'use client'

// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import Details from '@/views/edms/requisition-details/machinery/Details'
import Sidebar from '@/views/edms/requisition-details/machinery/Sidebar'

// Data Imports
import LoaderDark from '@/components/layout/shared/LoaderDark'
import { Suspense } from 'react'
import { getInventoryItemById } from '@/libs/actions/stores.actions'

import { useParams } from 'next/navigation'
import { getMachineryItemById } from '@/libs/actions/machinery.actions'
/**
 * ! If you need data using an API call, uncomment the below API code, update the `process.env.API_URL` variable in the
 * ! `.env` file found at root of your project and also update the API endpoints like `/apps/academy` in below example.
 * ! Also, remove the above server action import and the action itself from the `src/app/server/actions.ts` file to clean up unused code
 * ! because we've used the server action for getting our static data.
 */


async function MachineryContent() {
  const params = useParams()
  // Vars
  // const data = await getAcademyData()
  // @ts-ignore
  const machineryContent  = await getMachineryItemById(params.details)
  if (!machineryContent) {
    return <div>Error loading machinery data</div>
  }
  console.log(machineryContent)

  return (
    <Grid container spacing={6}>
      <Grid item xs={12} md={8}>
        {/* @ts-ignore */}
        <Details data={machineryContent} />
      </Grid>
      <Grid item xs={12} md={4}>
        <div className='sticky top-[88px]'>
        {/* @ts-ignore */}
          <Sidebar content={machineryContent} />
        </div>
      </Grid>
    </Grid>
  
  )
}

export default function MachineryDetailsPage() {
  return (
    <Suspense fallback={<div className='fixed inset-0 flex items-center justify-center z-50 px-[50%] '>
      <LoaderDark />
    </div>}>
      <MachineryContent />
    </Suspense>
  )
}
