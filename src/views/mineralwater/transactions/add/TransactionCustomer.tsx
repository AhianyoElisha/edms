import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import FormHelperText from '@mui/material/FormHelperText'
import { Control, Controller, FieldError } from 'react-hook-form'
import { Customer, ProductionCategoryType } from '@/types/apps/ecommerceTypes'
import { useCallback, useEffect, useState } from 'react'
import { getProductionCategoryItemById, getProductionCategoryList } from '@/libs/actions/production.actions'
import { getCustomerDetailsById, getCustomerList } from '@/libs/actions/customer.action'
import { Autocomplete, Grid, TextField, Typography } from '@mui/material'

interface CustomerProps {
  control: Control<any>
  index: number
  name: string
  error?: any
}





const TransactionCustomer = ({ control, index, name, error }: CustomerProps) => {
  const [customerData, setCustomerData] = useState<Customer[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchCustomerData = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getCustomerList()
      setCustomerData(data?.rows as unknown as Customer[])
    } catch (error) {
      console.error('Error fetching customer data:', error)
      setCustomerData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCustomerData()
  }, [fetchCustomerData])


  return (
    <Grid item xs={12} gap={3} className='flex flex-col'>
      <Typography variant='h6'>Purchasing Customer</Typography>
        <Controller
          name={name}
          control={control}
          render={({ field: { onChange, value } }) => (
            <Autocomplete
              id="customer-select"
              options={customerData || []}
              getOptionLabel={(option) => option.customer}
              isOptionEqualToValue={(option, value) => 
              option.$id === value?.$id
              }
              value={customerData?.find(customer => customer.$id === value) || null}
              onChange={(_, newValue) => {
                onChange(newValue?.$id || '')
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Customer"
                  error={!!error}
                  fullWidth
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <div className="flex flex-col">
                    <Typography variant="body1">{option.customer}</Typography>
                  </div>
                </li>
              )}
              loading={isLoading}
              loadingText="Loading customers..."
              noOptionsText="No available customer found"
            />
          )}
        />
      </Grid>
  )
}

export default TransactionCustomer