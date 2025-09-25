// MUI Imports
import Grid from '@mui/material/Grid'

// Type Imports
import type { Users } from '@/types/apps/ecommerceTypes'

// Component Imports
import UserDetails from './UserDetails'

const UserLeftOverview = ({ userData }: { userData: Users }) => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <UserDetails userData={userData} />
      </Grid>
    </Grid>
  )
}

export default UserLeftOverview
