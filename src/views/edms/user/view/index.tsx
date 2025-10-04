// MUI Imports
import Grid from '@mui/material/Grid'

// Type Imports
import type { Users } from '@/types/apps/ecommerceTypes'

// Component Imports
import UserLeftOverview from './user-left-overview'
import UserRight from './user-right'
import SecurityTab from './user-right/security'

const UserView = ({ userData, userId, onUpdate }: { userData: Users; userId: string; onUpdate?: () => void }) => {
  const tabContentList: { [key: string]: React.ReactElement } = {
    security: <SecurityTab userData={userData} userId={userId} />
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12} lg={4}>
        <UserLeftOverview userData={userData} onUpdate={onUpdate} />
      </Grid>
      <Grid item xs={12} lg={8}>
        <UserRight tabContentList={tabContentList} />
      </Grid>
    </Grid>
  )
}

export default UserView
