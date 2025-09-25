import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import FormHelperText from '@mui/material/FormHelperText'
import { Control, Controller, FieldError } from 'react-hook-form'
import { Customer, ProductionCategoryType, SalesCategoryType, Worker } from '@/types/apps/ecommerceTypes'
import { useCallback, useEffect, useState } from 'react'
import { getProductionCategoryItemById, getProductionCategoryList } from '@/libs/actions/production.actions'
import { getCustomerDetailsById, getCustomerList, getWorkersList } from '@/libs/actions/customer.action'
import { Autocomplete, Grid, TextField, Typography } from '@mui/material'
import { getSalesCategoryList } from '@/libs/actions/sales.actions'

interface WorkersProps {
  control: Control<any>
  index: number
  name: string
  error?: any
}





const WorkerSelect = ({ control, index, name, error }: WorkersProps) => {
  const [workerData, setWorkerData] = useState<Worker[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchWorkerData = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getWorkersList()
      setWorkerData(data?.documents as unknown as Worker[])
    } catch (error) {
      console.error('Error fetching worker data:', error)
      setWorkerData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorkerData()
  }, [fetchWorkerData])


  return (
    <Grid item xs={12} gap={3} className='flex flex-col'>
      <Typography variant='h6'>Worker</Typography>
        <Controller
          name={name}
          control={control}
          render={({ field: { onChange, value } }) => (
            <Autocomplete
              id="customer-select"
              options={workerData || []}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => 
              option.$id === value?.$id
              }
              value={workerData?.find(worker => worker.$id === value) || null}
              onChange={(_, newValue) => {
                onChange(newValue?.$id || '')
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Worker"
                  error={!!error}
                  fullWidth
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <div className="flex flex-col">
                    <Typography variant="body1">{option.name}</Typography>
                  </div>
                </li>
              )}
              loading={isLoading}
              loadingText="Loading workers..."
              noOptionsText="No available worker found"
            />
          )}
        />
    </Grid>
  )
}

export default WorkerSelect