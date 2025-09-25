'use client'

// React Imports
import { useEffect, useState } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid'

// Type Imports
import type { UserDataType } from '@components/card-statistics/HorizontalWithSubtitle'

// Component Imports
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

// Actions
import { getUserList } from '@/libs/actions/customer.action'
import { Users } from '@/types/apps/ecommerceTypes'

const UserListCards = () => {
  const [userStats, setUserStats] = useState<UserDataType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserAnalytics = async () => {
      try {
        setLoading(true)
        const response = await getUserList()
        const users = response?.rows as unknown as Users[]

        if (users) {
          // Calculate analytics
          const totalUsers = users.length
          const activeUsers = users.filter(user => user.status === 'active').length
          const pendingUsers = users.filter(user => user.status === 'pending').length
          const inactiveUsers = users.filter(user => user.status === 'inactive').length

          // Calculate role distribution
          const adminUsers = users.filter(user => user.role?.name === 'admin').length
          const storeReps = users.filter(user => user.role?.name === 'storesrep').length
          const productionReps = users.filter(user => user.role?.name === 'productionrep').length
          const warehouseReps = users.filter(user => user.role?.name === 'warehouserep').length
          const otherRoles = totalUsers - (adminUsers + storeReps + productionReps + warehouseReps)

          // Calculate trends (you can enhance this with historical data)
          const activePercentage = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0
          const pendingPercentage = totalUsers > 0 ? Math.round((pendingUsers / totalUsers) * 100) : 0

          const analyticsData: UserDataType[] = [
            {
              title: 'Total Users',
              stats: totalUsers.toString(),
              avatarIcon: 'ri-group-line',
              avatarColor: 'primary',
              trend: 'positive',
              trendNumber: `${activePercentage}%`,
              subtitle: `${activeUsers} active users`
            },
            {
              title: 'Active Users',
              stats: activeUsers.toString(),
              avatarIcon: 'ri-user-follow-line',
              avatarColor: 'success',
              trend: 'positive',
              trendNumber: `${activePercentage}%`,
              subtitle: 'Currently active'
            },
            {
              title: 'Pending Users',
              stats: pendingUsers.toString(),
              avatarIcon: 'ri-user-search-line',
              avatarColor: 'warning',
              trend: pendingUsers > 0 ? 'positive' : 'negative',
              trendNumber: `${pendingPercentage}%`,
              subtitle: 'Awaiting activation'
            },
            {
              title: 'System Admins',
              stats: adminUsers.toString(),
              avatarIcon: 'ri-admin-line',
              avatarColor: 'error',
              trend: 'positive',
              trendNumber: `${Math.round((adminUsers / totalUsers) * 100)}%`,
              subtitle: 'Administrator accounts'
            }
          ]

          setUserStats(analyticsData)
        }
      } catch (error) {
        console.error('Error fetching user analytics:', error)
        // Fallback data
        setUserStats([
          {
            title: 'Total Users',
            stats: '0',
            avatarIcon: 'ri-group-line',
            avatarColor: 'primary',
            trend: 'positive',
            trendNumber: '0%',
            subtitle: 'No users found'
          }
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchUserAnalytics()
  }, [])

  if (loading) {
    return (
      <Grid container spacing={6}>
        {[1, 2, 3, 4].map((item) => (
          <Grid key={item} item xs={12} sm={6} md={3}>
            <div className="animate-pulse">
              <div className="h-24 bg-gray-200 rounded-lg"></div>
            </div>
          </Grid>
        ))}
      </Grid>
    )
  }

  return (
    <Grid container spacing={6}>
      {userStats.map((item, i) => (
        <Grid key={i} item xs={12} sm={6} md={3}>
          <HorizontalWithSubtitle {...item} />
        </Grid>
      ))}
    </Grid>
  )
}

export default UserListCards
