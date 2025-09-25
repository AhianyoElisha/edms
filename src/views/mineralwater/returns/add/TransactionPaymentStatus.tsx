import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import FormHelperText from '@mui/material/FormHelperText'
import { Control, Controller, FieldError } from 'react-hook-form'

interface TransactionPaymentStatusProps {
  control: Control<any>
  index: number
  name: string
  error?: FieldError
  onStatusChange?: (value: string) => void
}

const ProductPaymentStatus = ({ control, index, name, error, onStatusChange }: TransactionPaymentStatusProps) => {
  return (
    <Card>
      <CardHeader title='Payment Status' />
      <CardContent>
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <FormControl fullWidth error={!!error}>
              <InputLabel>Select Payment Status</InputLabel>
              <Select 
                label='Select Payment Status' 
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  onStatusChange?.(e.target.value as string);
                }}
              >
                <MenuItem value='paid'>Paid</MenuItem>
                <MenuItem value='credit'>On Credit</MenuItem>
                <MenuItem value='partial'>Partial Payment</MenuItem>
                <MenuItem value='postdated'>Post Dated Cheque</MenuItem>
              </Select>
              {error && <FormHelperText>{error.message}</FormHelperText>}
            </FormControl>
          )}
        />
      </CardContent>
    </Card>
  )
}

export default ProductPaymentStatus