import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import { Control, Controller } from 'react-hook-form'

interface TransactionItemErrors {
  cash?: {
    message: string
  }
  cheque?: {
    message: string
  }
  bank?: {
    message: string
  }
  momo: {
    message: string
  }
}

interface TransactionInfoProps {
  control: Control<any>
  index: number
  names: {
    cash: string
    cheque: string
    bank: string
    momo: string
  }
  errors?: any
  showPaymentMode?: string // Add this prop
}

const PaymentInformation = ({ control, index, names, errors, showPaymentMode }: TransactionInfoProps, ) => {
  return (
    <Card>
      <CardHeader title='Payment Information' />
      <CardContent>
        <Grid container spacing={5} className='mbe-5'>
          {showPaymentMode?.includes('cash') ? (
            <Grid item xs={12}>
              <Controller
                name={names.cash}
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
          {showPaymentMode?.includes('momo') ? (
            <Grid item xs={12}>
              <Controller
                name={names.momo}
                control={control}
                render={({ field }) => (
                  <TextField 
                    fullWidth 
                    label='Amount Paid in Momo' 
                    type='tel'
                    placeholder='Enter Momo Payment' 
                    {...field} 
                    error={!!errors?.paymentModeMomo}
                    helperText={errors?.paymentModeMomo?.message}
                  />
                )}
              />
            </Grid>
          ) : null}
          {showPaymentMode?.includes('cheque') ? (
            <Grid item xs={12}>
              <Controller
                name={names.cheque}
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
          {showPaymentMode?.includes('bank') ? (
  
            <Grid item xs={12}>
              <Controller
                name={names.bank}
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