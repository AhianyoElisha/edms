'use client'

// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import TotalRequisitions from '@/views/mineralwater/manage-requisitions/TotalRequisitions'
import RequisitionStatistics from '@/views/mineralwater/manage-requisitions/ReviewsStatistics'
import ProductionWarehouseRequisitionTable from '@/views/mineralwater/manage-requisitions/production/IssuedProductionWarehouseRequisitionTable'



const ProductionToWarehouseRequisitionList = () => {

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <ProductionWarehouseRequisitionTable  />
      </Grid>
    </Grid>
  )
}

export default ProductionToWarehouseRequisitionList