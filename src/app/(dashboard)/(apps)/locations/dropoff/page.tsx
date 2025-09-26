// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import DropoffLocationOverviewTable from '@/views/delivery/locations/dropoff/DropoffLocationOverviewTable'

const DropoffLocationsPage = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <DropoffLocationOverviewTable />
      </Grid>
    </Grid>
  )
}

export default DropoffLocationsPage