'use client'

import Grid from '@mui/material/Grid'
import MachineryListTable from '@/views/mineralwater/machinery/list/MachineryListTable'
import MachineryCard from '@/views/mineralwater/machinery/list/MachineryCard'


const MachineryListContent = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12} sm={6} lg={4}>
        {/* @ts-ignore */}
        <MachineryCard />
      </Grid>
      <Grid item xs={12}>
        {/* @ts-ignore */}
        <MachineryListTable />
      </Grid>
    </Grid>
  )
}

export default MachineryListContent
