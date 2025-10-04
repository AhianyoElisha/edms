'use client'

import ProductionToWarehouseRequisitionDetails from '@/views/edms/manage-requisitions/warehouse/production-warehouse/ProductionToWarehouseRequisitionDetails';
import ProductionWarehouseRequisitionTable from '@/views/edms/manage-requisitions/warehouse/WarehouseProductionRequisitionTable';
// MUI Imports
import Grid from '@mui/material/Grid'


// Component Imports
import { useState } from 'react';

const ProductionToWarehouseRequisition = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Grid container spacing={6}>
       <Grid item xs={12}>
         <ProductionWarehouseRequisitionTable refreshTrigger={refreshTrigger} onSuccessfulSubmit={handleRefreshData} />
       </Grid>
       <Grid item xs={12}>
        <ProductionToWarehouseRequisitionDetails onSuccessfulSubmit={handleRefreshData} />
       </Grid>
    </Grid>
  )
}

export default ProductionToWarehouseRequisition
