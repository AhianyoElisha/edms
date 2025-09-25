'use client'

// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import AddressBook from './AddressBookCard'

// Type Imports
import type { Customer } from '@/types/apps/ecommerceTypes'

const AddressBilling = ({ customerData }: { customerData?: Customer }) => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <AddressBook customerData={customerData} />
      </Grid>
    </Grid>
  )
}

export default AddressBilling