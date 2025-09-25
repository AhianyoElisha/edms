// MUI Imports
import Grid from '@mui/material/Grid'

// Type Imports
import type { UserDataType } from '@components/card-statistics/HorizontalWithSubtitle'

// Component Imports
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import Shimmer from '@/components/layout/shared/Shimmer'


const UserListCards = ({userList, supplierList, expenseAndReturns, isLoading }: any) => {

  const formattedExpenseTotal = new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(((Number.parseInt(expenseAndReturns?.expensesTotal)) || 0))

  // Vars
  const data: UserDataType[] = [
    {
      title: 'Session (Active Users)',
      stats: isLoading ? <Shimmer width={70} height={37} /> : userList?.length.toString() || '0',
      avatarIcon: 'ri-group-line',
      avatarColor: 'primary',
      subtitle: 'Total Users'
    },
    {
      title: 'Suppliers',
      stats: supplierList?.toString() || <Shimmer width={70} height={37} />,
      avatarIcon: 'ri-luggage-cart-line',
      avatarColor: 'error',
      subtitle: 'Total Suppliers'
    },
    {
      title: 'Products Returned',
      stats: isLoading ? <Shimmer width={70} height={37} /> : expenseAndReturns?.returnedPackages?.toString() || '0',
      avatarIcon: 'ri-refund-line',
      avatarColor: 'success',
      subtitle: 'This month analytics'
    },
    {
      title: 'Expenses',
      stats: isLoading ? <Shimmer width={70} height={37} /> : formattedExpenseTotal,
      avatarIcon: 'ri-refund-2-line',
      avatarColor: 'warning',
      subtitle: 'This month analytics'
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
