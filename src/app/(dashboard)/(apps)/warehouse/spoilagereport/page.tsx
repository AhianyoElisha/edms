'use client'

import Grid from '@mui/material/Grid'
import TransactionListTable from '@/views/mineralwater/warehouse/spoilagereport/TransactionListTable'

const DistributionListContent = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        {/* @ts-ignore */}
        <TransactionListTable />
      </Grid>
    </Grid>
  )
}

export default DistributionListContent