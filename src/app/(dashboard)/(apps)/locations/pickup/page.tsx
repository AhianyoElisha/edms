// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import PickupLocationOverviewTable from '@/views/edms/locations/pickup/PickupLocationOverviewTable'

const PickupLocationsPage = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <PickupLocationOverviewTable />
      </Grid>
    </Grid>
  )
}

export default PickupLocationsPage