'use client'

// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import TotalRequisitions from '@/views/edms/manage-requisitions/TotalRequisitions'
import RequisitionStatistics from '@/views/edms/manage-requisitions/ReviewsStatistics'
import WarehouseSalesRequisitionTable from '@/views/edms/manage-requisitions/sales/WarehouseSalesRequisitionTable'


const WarehouseToSalesRequisitionList = () => {

  return (
    <Grid container spacing={6}>
      {/* <Grid item xs={12} md={6}>
        <TotalRequisitions />
      </Grid>
      <Grid item xs={12} md={6}>
        <RequisitionStatistics />
      </Grid> */}
      <Grid item xs={12}>
        <WarehouseSalesRequisitionTable  />
      </Grid>
    </Grid>
  )
}

export default WarehouseToSalesRequisitionList