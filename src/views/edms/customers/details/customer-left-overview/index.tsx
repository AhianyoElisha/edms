// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'

// Type Imports
import type { Customer } from '@/types/apps/ecommerceTypes'

// Component Imports
import CustomerDetails from './CustomerDetails'

interface CustomerLeftOverviewProps {
  customerData: Customer | null
  isLoading: boolean
}

const CustomerLeftOverview = ({ customerData, isLoading }: CustomerLeftOverviewProps) => {
  if (isLoading) {
    return (
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <div className='flex flex-col items-center gap-4'>
                <Skeleton variant="circular" width={80} height={80} />
                <Skeleton variant="text" width="60%" height={32} />
                <Skeleton variant="text" width="40%" height={24} />
              </div>
              <div className='mt-6 space-y-3'>
                <Skeleton variant="text" width="100%" height={20} />
                <Skeleton variant="text" width="80%" height={20} />
                <Skeleton variant="text" width="90%" height={20} />
                <Skeleton variant="text" width="70%" height={20} />
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    )
  }

  if (!customerData) {
    return (
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Card>
            <CardContent className='text-center'>
              <Typography variant="h6" color="text.secondary">
                Customer not found
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <CustomerDetails customerData={customerData} />
      </Grid>
    </Grid>
  )
}

export default CustomerLeftOverview
