import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import FormHelperText from '@mui/material/FormHelperText'
import { Control, Controller, FieldError } from 'react-hook-form'
import { Customer, ProductionCategoryType, SalesCategoryType } from '@/types/apps/ecommerceTypes'
import { useCallback, useEffect, useState } from 'react'
import { getProductionCategoryItemById, getProductionCategoryList } from '@/libs/actions/production.actions'
import { getCustomerDetailsById, getCustomerList } from '@/libs/actions/customer.action'
import { Autocomplete, Grid, TextField, Typography } from '@mui/material'
import { getSalesCategoryList } from '@/libs/actions/sales.actions'

interface SalesCategoryProps {
  control: Control<any>
  index: number
  name: string
  error?: any
}





const TransactionSalesCategory = ({ control, index, name, error }: SalesCategoryProps) => {
  const [salesCategoryData, setSalesCategoryData] = useState<SalesCategoryType[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchSalesCategoryData = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getSalesCategoryList()
      setSalesCategoryData(data?.documents as unknown as SalesCategoryType[])
    } catch (error) {
      console.error('Error fetching sales category data:', error)
      setSalesCategoryData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSalesCategoryData()
  }, [fetchSalesCategoryData])


  return (
    <Grid item xs={12} gap={3} className='flex flex-col'>
      <Typography variant='h6'>Sales Category</Typography>
        <Controller
          name={name}
          control={control}
          render={({ field: { onChange, value } }) => (
            <Autocomplete
              id="customer-select"
              options={salesCategoryData || []}
              getOptionLabel={(option) => option.categoryTitle}
              isOptionEqualToValue={(option, value) => 
              option.$id === value?.$id
              }
              value={salesCategoryData?.find(category => category.$id === value) || null}
              onChange={(_, newValue) => {
                onChange(newValue?.$id || '')
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Sales Category"
                  error={!!error}
                  fullWidth
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <div className="flex flex-col">
                    <Typography variant="body1">{option.categoryTitle}</Typography>
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

export default TransactionSalesCategory