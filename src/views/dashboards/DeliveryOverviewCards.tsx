// MUI Imports
import Grid from '@mui/material/Grid'

// Type Imports
import type { UserDataType } from '@components/card-statistics/HorizontalWithSubtitle'

// Component Imports
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import Shimmer from '@/components/layout/shared/Shimmer'

const DeliveryOverviewCards = ({ 
  packageStats, 
  tripStats, 
  vehicleStats, 
  driverStats, 
  isLoading 
}: any) => {

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0)
  }

  // Vars
  const data: UserDataType[] = [
    {
      title: 'Active Packages',
      stats: isLoading ? <Shimmer width={70} height={37} /> : packageStats?.active?.toString() || '0',
      avatarIcon: 'ri-package-line',
      avatarColor: 'primary',
      subtitle: 'In Transit & Pending'
    },
    {
      title: 'Daily Deliveries',
      stats: isLoading ? <Shimmer width={70} height={37} /> : packageStats?.delivered?.toString() || '0',
      avatarIcon: 'ri-truck-line',
      avatarColor: 'success',
      subtitle: 'Completed Today'
    },
    {
      title: 'Active Trips',
      stats: isLoading ? <Shimmer width={70} height={37} /> : tripStats?.active?.toString() || '0',
      avatarIcon: 'ri-route-line',
      avatarColor: 'info',
      subtitle: 'Ongoing Routes'
    },
    {
      title: 'Revenue Today',
      stats: isLoading ? <Shimmer width={70} height={37} /> : formatCurrency(tripStats?.revenue || 0),
      avatarIcon: 'ri-money-dollar-circle-line',
      avatarColor: 'warning',
      subtitle: 'Daily earnings'
    },
    {
      title: 'Active Drivers',
      stats: isLoading ? <Shimmer width={70} height={37} /> : driverStats?.active?.toString() || '0',
      avatarIcon: 'ri-user-3-line',
      avatarColor: 'primary',
      subtitle: 'Currently working'
    }
  ]

  return (
    <Grid container spacing={6}>
      {data.map((item, index) => (
        <Grid key={index} item xs={12} sm={6} md={3}>
          <HorizontalWithSubtitle {...item} />
        </Grid>
      ))}
    </Grid>
  )
}

export default DeliveryOverviewCards