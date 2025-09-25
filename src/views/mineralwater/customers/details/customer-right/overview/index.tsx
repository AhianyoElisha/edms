// MUI Imports
import Grid from '@mui/material/Grid'
import type { TransactionItemDetailType } from '@/types/apps/ecommerceTypes'

// Component Imports
import OrderListTable from './OrderListTable'

interface OverviewProps {
  orderData: TransactionItemDetailType[]
  isLoading: boolean
  onUpdate?: () => void
}

const Overview = ({ orderData, isLoading, onUpdate }: OverviewProps) => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <OrderListTable 
          orderData={orderData} 
          isLoading={isLoading}
          onUpdate={onUpdate}
        />
      </Grid>
    </Grid>
  )
}

export default Overview
