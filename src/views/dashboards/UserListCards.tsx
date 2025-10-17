// MUI Imports
import Grid from '@mui/material/Grid'

// Type Imports
import type { UserDataType } from '@components/card-statistics/HorizontalWithSubtitle'

// Component Imports
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import Shimmer from '@/components/layout/shared/Shimmer'


const UserListCards = ({userList, supplierList, expenseAndReturns, isLoading, tripsTotal, deliveredPackagesTotal, manifestsTotal }: any) => {

  const formattedExpenseTotal = new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(((Number.parseInt(expenseAndReturns?.expensesTotal)) || 0))

  // Vars
  const data: UserDataType[] = [
    {
      title: 'Users',
      stats: isLoading ? <Shimmer width={70} height={37} /> : userList?.length.toString() || '0',
      avatarIcon: 'ri-group-line',
      avatarColor: 'primary',
      subtitle: 'Total Users'
    },
    {
      title: 'Total Trips',
      stats: isLoading ? <Shimmer width={70} height={37} /> : tripsTotal?.toString() || '0',
      avatarIcon: 'ri-route-line',
      avatarColor: 'error',
      subtitle: 'All Trips'
    },
    {
      title: 'Packages Delivered',
      stats: isLoading ? <Shimmer width={70} height={37} /> : deliveredPackagesTotal?.toString() || '0',
      avatarIcon: 'ri-checkbox-circle-line',
      avatarColor: 'success',
      subtitle: 'This month analytics'
    },
    {
      title: 'Total Manifests',
      stats: isLoading ? <Shimmer width={70} height={37} /> : manifestsTotal?.toString() || '0',
      avatarIcon: 'ri-file-list-3-line',
      avatarColor: 'info',
      subtitle: 'All Manifests'
    }
  ]

  return (
    <Grid container spacing={6}>
      {data.map((item, i) => (
        <Grid key={i} item xs={12} sm={6} md={3}>
          <HorizontalWithSubtitle {...item} />
        </Grid>
      ))}
    </Grid>
  )
}

export default UserListCards
