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
import { getLogisticsList } from '@/libs/actions/customer.action'
import { Logistics } from '@/types/apps/ecommerceTypes'

const LogisticsStatisticsCard = () => {
  const [vehicleStats, setVehicleStats] = useState<UserDataType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchVehicleAnalytics = async () => {
      try {
        setLoading(true)
        const response = await getLogisticsList()
        const vehicles = response?.documents as unknown as Logistics[]

        if (vehicles) {
          // Calculate analytics
          const totalVehicles = vehicles.length
          const activeVehicles = vehicles.filter(vehicle => vehicle.status === 'active').length
          const inactiveVehicles = vehicles.filter(vehicle => vehicle.status === 'inactive').length
          const maintenanceVehicles = vehicles.filter(vehicle => vehicle.status === 'maintenance').length

          // Calculate vehicle type distribution
          const trucks = vehicles.filter(vehicle => vehicle.vehicleType === 'truck').length
          const tricycles = vehicles.filter(vehicle => vehicle.vehicleType === 'tricycle').length

          // Calculate operational percentages
          const activePercentage = totalVehicles > 0 ? Math.round((activeVehicles / totalVehicles) * 100) : 0
          const truckPercentage = totalVehicles > 0 ? Math.round((trucks / totalVehicles) * 100) : 0
          const maintenancePercentage = totalVehicles > 0 ? Math.round((maintenanceVehicles / totalVehicles) * 100) : 0



          const analyticsData: UserDataType[] = [
            {
              title: 'Total Fleet',
              stats: totalVehicles.toString(),
              avatarIcon: 'ri-truck-line',
              avatarColor: 'primary',
              trend: 'positive',
              trendNumber: `${activePercentage}%`,
              subtitle: `${activeVehicles} operational`
            },
            {
              title: 'Active Vehicles',
              stats: activeVehicles.toString(),
              avatarIcon: 'ri-play-circle-line',
              avatarColor: 'success',
              trend: 'positive',
              trendNumber: `${activePercentage}%`,
              subtitle: 'Currently in service'
            },
            {
              title: 'Heavy Trucks',
              stats: trucks.toString(),
              avatarIcon: 'ri-truck-line',
              avatarColor: 'info',
              trend: 'positive',
              trendNumber: `${truckPercentage}%`,
              subtitle: `${tricycles} tricycles available`
            },
            {
              title: 'Route Coverage',
              stats: '',
              avatarIcon: 'ri-route-line',
              avatarColor: 'warning',
              trend: maintenanceVehicles > 0 ? 'negative' : 'positive',
              trendNumber: `${maintenancePercentage}%`,
              subtitle: `${maintenanceVehicles} in maintenance`
            }
          ]

          setVehicleStats(analyticsData)
        }
      } catch (error) {
        console.error('Error fetching vehicle analytics:', error)
        // Fallback data
        setVehicleStats([
          {
            title: 'Total Fleet',
            stats: '0',
            avatarIcon: 'ri-truck-line',
            avatarColor: 'primary',
            trend: 'positive',
            trendNumber: '0%',
            subtitle: 'No vehicles found'
          }
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchVehicleAnalytics()
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
      {vehicleStats.map((item, i) => (
        <Grid key={i} item xs={12} sm={6} md={3}>
          <HorizontalWithSubtitle {...item} />
        </Grid>
      ))}
    </Grid>
  )
}

export default LogisticsStatisticsCard
