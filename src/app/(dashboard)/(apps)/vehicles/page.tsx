// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import VehicleOverviewTable from '@/views/edms/vehicles/LogisticsOverviewTable'

const VehiclesPage = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <VehicleOverviewTable />
      </Grid>
    </Grid>
  )
}

export default VehiclesPage