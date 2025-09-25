//MUI Imports
import Grid from '@mui/material/Grid'

//Component Imports
import LogisticsStatisticsCard from '@/views/mineralwater/vehicles/LogisticsStatisticsCard'
import LogisticsOverviewTable from '@/views/mineralwater/vehicles/LogisticsOverviewTable'

const LogisticsDashboard = async () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <LogisticsStatisticsCard />
      </Grid>
      <Grid item xs={12}>
        <LogisticsOverviewTable />
      </Grid>
    </Grid>
  )
}

export default LogisticsDashboard

