'use client'

// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import StoreProductionRequisitionTable from '@/views/mineralwater/manage-requisitions/stores/StoreProductionRequisitionTable'
// import { getEcommerceData } from '@/app/server/actions'
import TotalRequisitions from '@/views/mineralwater/manage-requisitions/TotalRequisitions'
import RequisitionStatistics from '@/views/mineralwater/manage-requisitions/ReviewsStatistics'
import { CategoryType, InventoryListType, RequisitionHistory } from '@/types/apps/ecommerceTypes'
import { Suspense, useState } from 'react'
import LoaderDark from '@/components/layout/shared/LoaderDark'
import RequisitionHistoryTable from '@/views/mineralwater/manage-requisitions/requisitionHistory/RequisitionHistoryTable'
import { Divider } from '@mui/material'

/**
 * ! If you need data using an API call, uncomment the below API code, update the `process.env.API_URL` variable in the
 * ! `.env` file found at root of your project and also update the API endpoints like `/apps/ecommerce` in below example.
 * ! Also, remove the above server action import and the action itself from the `src/app/server/actions.ts` file to clean up unused code
 * ! because we've used the server action for getting our static data.
 */

/* const getEcommerceData = async () => {
  // Vars
  const res = await fetch(`${process.env.API_URL}/apps/ecommerce`)

  if (!res.ok) {
    throw new Error('Failed to fetch ecommerce data')
  }

  return res.json()
} */

const StoreRequisitionList = () => {

  
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <StoreProductionRequisitionTable  />
      </Grid>
    </Grid>
  )
}

export default StoreRequisitionList