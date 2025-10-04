import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import FormHelperText from '@mui/material/FormHelperText'
import { Control, Controller, FieldError } from 'react-hook-form'

interface ProductPaymentStatusProps {
  control: Control<any>
  index: number
  name: string
  error?: FieldError
}

const ProductPaymentStatus = ({ control, index, name, error }: ProductPaymentStatusProps) => {
  return (
    <Card>
      <CardHeader title='Inventory Payment Status' />
      <CardContent>
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <FormControl fullWidth error={!!error}>
              <InputLabel>Select Payment Status</InputLabel>
              <Select label='Select Category' {...field}>
                <MenuItem value='paid'>Paid</MenuItem>
                <MenuItem value='credit'>On Credit</MenuItem>
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