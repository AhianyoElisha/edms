import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import FormHelperText from '@mui/material/FormHelperText'
import { Control, Controller, FieldError } from 'react-hook-form'

interface TransactionPaymentModeProps {
  control: Control<any>
  index: number
  name: string
  error?: FieldError
  onModeChange?: (value: string) => void
}

const ProductPaymentMode = ({ control, index, name, error, onModeChange }: TransactionPaymentModeProps) => {
  return (
    <Card>
      <CardHeader title='Payment Mode' />
      <CardContent>
        <Controller
          name={name}
          control={control}
          rules={{ required: "Payment mode is required" }}
          render={({ field }) => (
            <FormControl fullWidth error={!!error}>
              <InputLabel>Select Payment Mode</InputLabel>
              <Select 
                label='Select Payment Mode' 
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  onModeChange?.(e.target.value as string);
                }}
              >
                <MenuItem value=''><em>None</em></MenuItem>
                <MenuItem value='cash'>Cash</MenuItem>
                <MenuItem value='cheque'>Cheque</MenuItem>
                <MenuItem value='cash and cheque'>Cash and Cheque</MenuItem>
                <MenuItem value='bank'>Bank Transfer</MenuItem>
                <MenuItem value='bank and cash'>Bank Transfer and Cash</MenuItem>
                <MenuItem value='bank and cheque'>Bank Transfer and Cheque</MenuItem>
                <MenuItem value='bank and cash and cheque'>Bank, Cash and Cheque</MenuItem>
              </Select>
              {error && <FormHelperText>{error.message}</FormHelperText>}
            </FormControl>
          )}
        />
      </CardContent>
    </Card>
  )
}

export default ProductPaymentMode