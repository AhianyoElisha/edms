'use client'

// MUI Imports
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

// Component Imports
import RoleCards from './RoleCards'
import RolesTable from './RolesTable'
import { Users } from '@/types/apps/ecommerceTypes'
import { useState } from 'react'

const Roles = () => {
  // Vars
  const [usersData, setUsersData] = useState<Users[]>([])
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Typography variant='h4' className='mbe-1'>
          Roles List
        </Typography>
        <Typography>
          A role provided access to predefined menus and features so that depending on assigned role an administrator
          can have access to what he need
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <RoleCards usersData={usersData} />
      </Grid>
      <Grid item xs={12} className='!pbs-12'>
        <Typography variant='h4' className='mbe-1'>
          Total users with their roles
        </Typography>
        <Typography>Find all of your company&#39;s administrator accounts and their associate roles.</Typography>
      </Grid>
      <Grid item xs={12}>
        <RolesTable setUsersData={setUsersData} />
      </Grid>
    </Grid>
  )
}

export default Roles
