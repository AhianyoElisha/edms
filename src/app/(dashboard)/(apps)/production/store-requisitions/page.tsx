'use client'

// MUI Imports
import Grid from '@mui/material/Grid'

import ProductionStoreRequisitionTable from '@/views/edms/manage-requisitions/production/ProductionStoreRequisitionTable'

// Component Imports
import StoreToProductionRequisitionDetails from "@/views/edms/manage-requisitions/production/store-production/StoreToProductionRequisitionDetails"
import { useState } from 'react';

const StoreToProductionRequisition = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Grid container spacing={6}>
       <Grid item xs={12}>
         <ProductionStoreRequisitionTable refreshTrigger={refreshTrigger} />
       </Grid>
       <Grid item xs={12}>
        <StoreToProductionRequisitionDetails onSuccessfulSubmit={handleRefreshData} />
       </Grid>
    </Grid>
  )
}

export default StoreToProductionRequisition
