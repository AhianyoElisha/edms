// MUI Imports
import Grid from '@mui/material/Grid'

// Type Imports
import type { Customer } from '@/types/apps/ecommerceTypes'

// Component Imports
import CustomerDetails from './SupplierDetails'

const CustomerLeftOverview = ({ customerData }: { customerData?: Customer }) => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <CustomerDetails customerData={customerData} />
      </Grid>
    </Grid>
  )
}

export default CustomerLeftOverview
