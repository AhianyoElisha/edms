import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import { Control, Controller } from 'react-hook-form'

interface InventoryItemErrors {
  paymentModeCash?: {
    message: string
  }
  paymentModeCheque?: {
    message: string
  }
  paymentModeBank?: {
    message: string
  }
}

interface ProductInfoProps {
  control: Control<any>
  index: number
  names: {
    paymentModeCash: string
    paymentModeCheque: string
    paymentModeBank: string
  }
  errors?: any
  showPaymentMode?: string // Add this prop
}

const PaymentInformation = ({ control, index, names, errors, showPaymentMode }: ProductInfoProps, ) => {
  return (
    <Card>
      <CardHeader title='Payment Information' />
      <CardContent>
        <Grid container spacing={5} className='mbe-5'>
          {showPaymentMode === 'cash' || showPaymentMode === 'cash and cheque' || showPaymentMode === 'bank and cash' || showPaymentMode === 'bank and cash and cheque' ? (
            <Grid item xs={12}>
              <Controller
                name={names.paymentModeCash}
                control={control}
                render={({ field }) => (
                  <TextField 
                    fullWidth 
                    label='Amount Paid in Cash' 
                    type='tel'
                    placeholder='Enter Cash Payment' 
                    {...field} 
                    error={!!errors?.paymentModeCash}
                    helperText={errors?.paymentModeCash?.message}
                  />
                )}
              />
            </Grid>
          ) : null}
          {showPaymentMode === 'cheque' || showPaymentMode === 'cash and cheque' || showPaymentMode === 'bank and cheque' || showPaymentMode === 'bank and cash and cheque'? (
            <Grid item xs={12}>
              <Controller
                name={names.paymentModeCheque}
                control={control}
                render={({ field }) => (
                  <TextField 
                    fullWidth 
                    label='Amount Paid in Cheque' 
                    type='tel'
                    placeholder='Enter the Cheque Amount' 
                    {...field} 
                    error={!!errors?.paymentModeCheque}
                    helperText={errors?.paymentModeCheque?.message}
                  />
                )}
              />
            </Grid>
          ) : null}
          {showPaymentMode === 'bank' || showPaymentMode === 'bank and cash' || showPaymentMode === 'bank and cheque' || showPaymentMode === 'bank and cash and cheque'? (
  
            <Grid item xs={12}>
              <Controller
                name={names.paymentModeBank}
                control={control}
                render={({ field }) => (
                  <TextField 
                    fullWidth 
                    label='Amount Paid with Bank' 
                    type='tel' 
                    placeholder='Enter the Bank Transaction Amount' 
                    {...field} 
                    error={!!errors?.paymentModeBank}
                    helperText={errors?.paymentModeBank?.message}
                  />
                )}
            />
            </Grid>
          ) : null}
        </Grid>
      </CardContent>
    </Card>
  )
}

export default PaymentInformation