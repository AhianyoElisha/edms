'use client'

import Grid from '@mui/material/Grid'
import DistributionListTable from '@/views/edms/distribution/list/DistributionListTable'

const DistributionListContent = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        {/* @ts-ignore */}
        <DistributionListTable />
      </Grid>
    </Grid>
  )
}

export default DistributionListContent