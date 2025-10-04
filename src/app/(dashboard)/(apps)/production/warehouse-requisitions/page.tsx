'use client'

// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import TotalRequisitions from '@/views/edms/manage-requisitions/TotalRequisitions'
import RequisitionStatistics from '@/views/edms/manage-requisitions/ReviewsStatistics'
import ProductionWarehouseRequisitionTable from '@/views/edms/manage-requisitions/production/ProductionWarehouseRequisitionTable'
import ProductionToWarehouseRequisitionDetails from '@/views/edms/manage-requisitions/warehouse/production-warehouse/ProductionToWarehouseRequisitionDetails';
import { useState } from 'react'
import PushToWarehouseRequisitionDetails from '@/views/edms/manage-requisitions/production/production-warehouse/PushToWarehouseRequisitionDetails copy'
import WarehouseRequisitionTable from '@/views/edms/manage-requisitions/production/production-warehouse/WarehouseRequisitionTable'



const ProductionToWarehouseRequisitionList = () => {
    const [refreshTrigger, setRefreshTrigger] = useState(0);
  
    const handleRefreshData = () => {
      setRefreshTrigger(prev => prev + 1);
    };

  return (
    <Grid container spacing={6}>
      {/* <Grid item xs={12} md={6}>
        <TotalRequisitions />
      </Grid>
      <Grid item xs={12} md={6}>
        <RequisitionStatistics />
      </Grid> */}
      <Grid item xs={12}>
        <ProductionWarehouseRequisitionTable  />
      </Grid>
       <Grid item xs={12}>
         <WarehouseRequisitionTable refreshTrigger={refreshTrigger} onSuccessfulSubmit={handleRefreshData} />
       </Grid>
       <Grid item xs={12}>
        <PushToWarehouseRequisitionDetails onSuccessfulSubmit={handleRefreshData} />
       </Grid>
    </Grid>
  )
}

export default ProductionToWarehouseRequisitionList