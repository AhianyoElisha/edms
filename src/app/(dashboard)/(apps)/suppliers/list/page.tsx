'use client'


// Data Imports
import { Grid } from '@mui/material'
import SupplierListTable from '@/views/mineralwater/suppliers/list/SupplierListTable'


const SupplierListContent = () => {

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        {/* @ts-ignore */}
        <SupplierListTable />
      </Grid>
    </Grid>
  )
}

export default SupplierListContent