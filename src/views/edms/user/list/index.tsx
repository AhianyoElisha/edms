'use client'

// React Imports
import { useState, useCallback } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid'

// Type Imports
import type { UsersType } from '@/types/apps/userTypes'

// Component Imports
import UserListTable from './UserListTable'
import UserListCards from './UserListCards'

const UserList = ({ userData }: { userData?: UsersType[] }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
  }, [])

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <UserListCards refreshTrigger={refreshTrigger} />
      </Grid>
      <Grid item xs={12}>
        <UserListTable tableData={userData} onRefresh={handleRefresh} />
      </Grid>
    </Grid>
  )
}

export default UserList
