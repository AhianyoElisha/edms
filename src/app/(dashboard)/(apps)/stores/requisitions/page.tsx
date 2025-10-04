'use client'

// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import StoreProductionRequisitionTable from '@/views/edms/manage-requisitions/stores/StoreProductionRequisitionTable'
// import { getEcommerceData } from '@/app/server/actions'
import TotalRequisitions from '@/views/edms/manage-requisitions/TotalRequisitions'
import RequisitionStatistics from '@/views/edms/manage-requisitions/ReviewsStatistics'



const StoreRequisitionList = () => {

  
  return (
    <Grid container spacing={6}>
      {/* <Grid item xs={12} md={6}>
        <TotalRequisitions />
      </Grid>
      <Grid item xs={12} md={6}>
        <RequisitionStatistics />
      </Grid> */}
      <Grid item xs={12}>
        <StoreProductionRequisitionTable  />
      </Grid>
    </Grid>
  )
}

export default StoreRequisitionList