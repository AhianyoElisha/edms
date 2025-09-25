'use client'

import WarehouseToSalesRequisitionDetails from '@/views/mineralwater/manage-requisitions/sales/warehouse-sales/WarehouseToSalesRequisitionDetails';
import WarehouseSalesRequisitionTable from '@/views/mineralwater/manage-requisitions/sales/SalesWarehouseRequisitionTable';
// MUI Imports
import Grid from '@mui/material/Grid'


// Component Imports
import { useState } from 'react';

const WarehouseToSalesRequisition = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Grid container spacing={6}>
       <Grid item xs={12}>
         <WarehouseSalesRequisitionTable refreshTrigger={refreshTrigger} onSuccessfulSubmit={handleRefreshData} />
       </Grid>
       <Grid item xs={12}>
        <WarehouseToSalesRequisitionDetails onSuccessfulSubmit={handleRefreshData} />
       </Grid>
    </Grid>
  )
}

export default WarehouseToSalesRequisition
