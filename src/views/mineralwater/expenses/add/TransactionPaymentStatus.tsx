import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import FormHelperText from '@mui/material/FormHelperText'
import { Control, Controller, FieldError } from 'react-hook-form'
import { Grid, Typography } from '@mui/material'

interface TransactionExpensesProps {
  control: Control<any>
  index: number
  name: string
  error?: FieldError
  onStatusChange?: (value: string) => void
}

const ProductPaymentStatus = ({ control, index, name, error, onStatusChange }: TransactionExpensesProps) => {
  return (
    <Grid item xs={12} gap={3} className='flex flex-col'>
      <Typography variant='h6'>Expense Type</Typography>
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <FormControl fullWidth error={!!error}>
              <InputLabel>Select Expense Type                                                                                                                                                                                                                                                             </InputLabel>
              <Select 
                label='Select Type of Expense' 
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  onStatusChange?.(e.target.value as string);
                }}
              >
                <MenuItem value='fuel'>Fuel</MenuItem>
                <MenuItem value='general'>General</MenuItem>
                <MenuItem value='repairs'>Repairs</MenuItem>
                <MenuItem value='others'>Others</MenuItem>
              </Select>
              {error && <FormHelperText>{error.message}</FormHelperText>}
            </FormControl>
          )}
        />
    </Grid>
  )
}

export default ProductPaymentStatus