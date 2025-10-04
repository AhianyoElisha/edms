// React Imports
import type { ReactElement } from 'react'

// Next Imports
import dynamic from 'next/dynamic'

// MUI Imports
import Grid from '@mui/material/Grid'

// Type Imports
import type { PricingPlanType } from '@/types/pages/pricingTypes'

// Component Imports
import UserLeftOverview from '@views/edms/user/view/user-left-overview'
import UserRight from '@views/edms/user/view/user-right'

// Data Imports
import { getPricingData } from '@/app/server/actions'

const SecurityTab = dynamic(() => import('@views/edms/user/view/user-right/security'))

// Vars
const tabContentList = (data?: PricingPlanType[]): { [key: string]: ReactElement } => ({
  // security: <SecurityTab  />
})



const UserViewTab = async () => {
  // Vars
  const data = await getPricingData()

  return (
    <Grid container spacing={6}>
      {/* <Grid item xs={12} lg={4} md={5}>
        <UserLeftOverview />
      </Grid>
      <Grid item xs={12} lg={8} md={7}>
        <UserRight tabContentList={tabContentList(data)} />
      </Grid> */}
    </Grid>
  )
}

export default UserViewTab
