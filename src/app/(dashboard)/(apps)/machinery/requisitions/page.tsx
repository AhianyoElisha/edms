'use client'

// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import StoreProductionRequisitionTable from '@/views/mineralwater/manage-requisitions/stores/StoreProductionRequisitionTable'
// import { getEcommerceData } from '@/app/server/actions'
// import TotalRequisitions from '@/views/mineralwater/manage-requisitions/TotalRequisitions'
// import RequisitionStatistics from '@/views/mineralwater/manage-requisitions/ReviewsStatistics'



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