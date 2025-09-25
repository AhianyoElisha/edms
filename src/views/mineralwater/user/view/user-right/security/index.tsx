// MUI Imports
import Grid from '@mui/material/Grid'

// Type Imports
import type { Users } from '@/types/apps/ecommerceTypes'

// Component Imports
import ChangePassword from './ChangePassword'
import RecentDevice from './RecentDevice'

const SecurityTab = ({ userData, userId }: { userData: Users; userId: string }) => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <ChangePassword userData={userData} />
      </Grid>
      <Grid item xs={12}>
        <RecentDevice userData={userData} />
      </Grid>
    </Grid>
  )
}

export default SecurityTab
