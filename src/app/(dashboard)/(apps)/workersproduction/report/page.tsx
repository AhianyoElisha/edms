'use client'


// Data Imports
import { Grid } from '@mui/material'
import WorkersListTable from '@/views/edms/workersproduction/list/WorkersProductionListTable'


const SupplierListContent = () => {

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        {/* @ts-ignore */}
        <WorkersListTable />
      </Grid>
    </Grid>
  )
}

export default SupplierListContent