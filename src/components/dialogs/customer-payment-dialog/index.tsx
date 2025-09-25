'use client'

// React Imports
import { useEffect, useState } from 'react'

// MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import { useTheme } from '@mui/material/styles'

// Actions
import { processCustomerPayment } from '@/libs/actions/customer-payment.actions'
import { toast } from 'react-toastify'

type PaymentDialogProps = {
  open: boolean
  setOpen: (open: boolean) => void
  orderData: {
    $id: string
    totalPrice: number
    paymentStatus: string
    cash?: number
    bank?: number
    momo?: number
    cheque?: number
    customers?: {
      $id: string
      customer: string
      debt?: number
    }
  }
  onUpdate?: () => void
}

const CustomerPaymentDialog = ({ open, setOpen, orderData, onUpdate }: PaymentDialogProps) => {
  const theme = useTheme()
  const [loading, setLoading] = useState(false)
  const [paymentData, setPaymentData] = useState({
    cash: 0,
    bank: 0,
    momo: 0,
    cheque: 0
  })

  // Calculate existing payments and outstanding amount
  const existingPayments = (orderData.cash || 0) + (orderData.bank || 0) + (orderData.momo || 0) + (orderData.cheque || 0)
  const outstandingAmount = orderData.totalPrice - existingPayments
  const newTotalPayment = paymentData.cash + paymentData.bank + paymentData.momo + paymentData.cheque
  const finalOutstanding = outstandingAmount - newTotalPayment

  useEffect(() => {
    // Reset form when dialog opens
    if (open) {
      setPaymentData({
        cash: 0,
        bank: 0,
        momo: 0,
        cheque: 0
      })
    }
  }, [open])

  const handlePaymentChange = (field: keyof typeof paymentData, value: string) => {
    const numValue = parseFloat(value) || 0
    setPaymentData(prev => ({
      ...prev,
      [field]: numValue
    }))
  }

  const getNewPaymentStatus = () => {
    if (finalOutstanding <= 0) return 'paid'
    if (newTotalPayment > 0) return 'partial'
    return orderData.paymentStatus
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newTotalPayment <= 0) {
      toast.error('Please enter a payment amount')
      return
    }

    if (newTotalPayment > outstandingAmount) {
      toast.error('Payment amount cannot exceed outstanding balance')
      return
    }

    try {
      setLoading(true)
      console.log('Customer ID', orderData)
      await processCustomerPayment({
        orderId: orderData.$id,
        // @ts-ignore
        customerId: orderData.customers,
        paymentAmount: newTotalPayment,
        paymentBreakdown: paymentData,
        currentOrderTotal: orderData.totalPrice,
        existingPayments: {
          cash: orderData.cash || 0,
          bank: orderData.bank || 0,
          momo: orderData.momo || 0,
          cheque: orderData.cheque || 0
        }
      })
      
      toast.success('Payment processed successfully')
      setOpen(false)
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Error processing payment:', error)
      toast.error('Failed to process payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} maxWidth='md' fullWidth scroll='body' onClose={() => setOpen(false)}>
      <DialogTitle variant='h4' className='flex gap-2 flex-col text-center sm:pbs-16 sm:pbe-6 sm:pli-16'>
        Process Customer Payment
        <Typography component='span' className='flex flex-col text-center'>
          Order #{orderData.$id.slice(0, 8)} - {orderData.customers?.customer}
        </Typography>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent className='pbs-0 sm:pbe-6 sm:pli-16'>
          <IconButton onClick={() => setOpen(false)} className='absolute block-start-4 inline-end-4'>
            <i className='ri-close-line text-textSecondary' />
          </IconButton>
          
          <Grid container spacing={4}>
            {/* Order Summary */}
            <Grid item xs={12}>
              <Box 
                sx={{
                  p: 3,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.default 
                    : theme.palette.grey[50]
                }}
              >
                <Typography 
                  variant='h6' 
                  className='mb-3'
                  sx={{ color: theme.palette.text.primary }}
                >
                  Order Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography 
                      variant='body2' 
                      sx={{ color: theme.palette.text.secondary }}
                    >
                      Total Order Value:
                    </Typography>
                    <Typography 
                      variant='h6'
                      sx={{ color: theme.palette.text.primary }}
                    >
                      ₵{orderData.totalPrice.toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography 
                      variant='body2' 
                      sx={{ color: theme.palette.text.secondary }}
                    >
                      Payments Received:
                    </Typography>
                    <Typography 
                      variant='h6'
                      sx={{ color: theme.palette.text.primary }}
                    >
                      ₵{existingPayments.toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography 
                      variant='body2' 
                      sx={{ color: theme.palette.text.secondary }}
                    >
                      Outstanding Amount:
                    </Typography>
                    <Typography 
                      variant='h6' 
                      sx={{ color: theme.palette.error.main }}
                    >
                      ₵{outstandingAmount.toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography 
                      variant='body2' 
                      sx={{ color: theme.palette.text.secondary }}
                    >
                      Current Status:
                    </Typography>
                    <Chip 
                      label={orderData.paymentStatus} 
                      color={orderData.paymentStatus === 'paid' ? 'success' : orderData.paymentStatus === 'partial' ? 'warning' : 'error'}
                      size='small'
                    />
                  </Grid>
                </Grid>
              </Box>
            </Grid>

            {/* Existing Payments Breakdown */}
            {existingPayments > 0 && (
              <Grid item xs={12}>
                <Typography 
                  variant='h6' 
                  className='mb-2'
                  sx={{ color: theme.palette.text.primary }}
                >
                  Previous Payments
                </Typography>
                <Grid container spacing={2}>
                  {(orderData.cash ?? 0) > 0 && (
                    <Grid item xs={3}>
                      <Typography 
                        variant='body2'
                        sx={{ color: theme.palette.text.secondary }}
                      >
                        Cash: ₵{(orderData.cash ?? 0).toFixed(2)}
                      </Typography>
                    </Grid>
                  )}
                  {(orderData.bank ?? 0) > 0 && (
                    <Grid item xs={3}>
                      <Typography 
                        variant='body2'
                        sx={{ color: theme.palette.text.secondary }}
                      >
                        Bank: ₵{(orderData.bank ?? 0).toFixed(2)}
                      </Typography>
                    </Grid>
                  )}
                  {(orderData.momo ?? 0) > 0 && (
                    <Grid item xs={3}>
                      <Typography 
                        variant='body2'
                        sx={{ color: theme.palette.text.secondary }}
                      >
                        Mobile Money: ₵{(orderData.momo ?? 0).toFixed(2)}
                      </Typography>
                    </Grid>
                  )}
                  {(orderData.cheque ?? 0) > 0 && (
                    <Grid item xs={3}>
                      <Typography 
                        variant='body2'
                        sx={{ color: theme.palette.text.secondary }}
                      >
                        Cheque: ₵{(orderData.cheque ?? 0).toFixed(2)}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Grid>
            )}

            {/* Payment Entry Fields */}
            <Grid item xs={12}>
              <Typography 
                variant='h6' 
                className='mb-3'
                sx={{ color: theme.palette.text.primary }}
              >
                New Payment Entry
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label='Cash Payment'
                    type='number'
                    value={paymentData.cash || ''}
                    onChange={e => handlePaymentChange('cash', e.target.value)}
                    InputProps={{
                      startAdornment: <Typography sx={{ color: theme.palette.text.secondary }}>₵</Typography>
                    }}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label='Bank Transfer'
                    type='number'
                    value={paymentData.bank || ''}
                    onChange={e => handlePaymentChange('bank', e.target.value)}
                    InputProps={{
                      startAdornment: <Typography sx={{ color: theme.palette.text.secondary }}>₵</Typography>
                    }}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label='Mobile Money'
                    type='number'
                    value={paymentData.momo || ''}
                    onChange={e => handlePaymentChange('momo', e.target.value)}
                    InputProps={{
                      startAdornment: <Typography sx={{ color: theme.palette.text.secondary }}>₵</Typography>
                    }}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label='Cheque Payment'
                    type='number'
                    value={paymentData.cheque || ''}
                    onChange={e => handlePaymentChange('cheque', e.target.value)}
                    InputProps={{
                      startAdornment: <Typography sx={{ color: theme.palette.text.secondary }}>₵</Typography>
                    }}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Payment Summary */}
            <Grid item xs={12}>
              <Box 
                sx={{
                  p: 3,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.paper 
                    : theme.palette.background.default
                }}
              >
                <Typography 
                  variant='h6' 
                  className='mb-2'
                  sx={{ color: theme.palette.text.primary }}
                >
                  Payment Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography 
                      variant='body2' 
                      sx={{ color: theme.palette.text.secondary }}
                    >
                      New Payment Total:
                    </Typography>
                    <Typography 
                      variant='h6' 
                      sx={{ color: theme.palette.primary.main }}
                    >
                      ₵{newTotalPayment.toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography 
                      variant='body2' 
                      sx={{ color: theme.palette.text.secondary }}
                    >
                      Remaining Balance:
                    </Typography>
                    <Typography 
                      variant='h6' 
                      sx={{ 
                        color: finalOutstanding <= 0 
                          ? theme.palette.success.main 
                          : theme.palette.error.main 
                      }}
                    >
                      ₵{Math.max(0, finalOutstanding).toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography 
                      variant='body2' 
                      sx={{ color: theme.palette.text.secondary }}
                    >
                      New Payment Status:
                    </Typography>
                    <Chip 
                      label={getNewPaymentStatus()} 
                      color={getNewPaymentStatus() === 'paid' ? 'success' : 'warning'}
                      size='small'
                    />
                  </Grid>
                </Grid>
              </Box>
            </Grid>

            {/* Customer Information */}
            <Grid item xs={12}>
              <Box 
                sx={{
                  p: 3,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.default 
                    : theme.palette.grey[50]
                }}
              >
                <Typography 
                  variant='h6' 
                  className='mb-2'
                  sx={{ color: theme.palette.text.primary }}
                >
                  Customer Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography 
                      variant='body2' 
                      sx={{ color: theme.palette.text.secondary }}
                    >
                      Current Debt:
                    </Typography>
                    <Typography 
                      variant='h6'
                      sx={{ color: theme.palette.error.main }}
                    >
                      ₵{(orderData.customers?.debt || 0).toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography 
                      variant='body2' 
                      sx={{ color: theme.palette.text.secondary }}
                    >
                      New Debt After Payment:
                    </Typography>
                    <Typography 
                      variant='h6'
                      sx={{ 
                        color: (orderData.customers?.debt || 0) - newTotalPayment <= 0 
                          ? theme.palette.success.main 
                          : theme.palette.error.main 
                      }}
                    >
                      ₵{Math.max(0, (orderData.customers?.debt || 0) - newTotalPayment).toFixed(2)}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Grid>

            {/* Validation Alerts */}
            {newTotalPayment > outstandingAmount && (
              <Grid item xs={12}>
                <Alert severity='error'>
                  Payment amount (₵{newTotalPayment.toFixed(2)}) exceeds outstanding balance (₵{outstandingAmount.toFixed(2)})
                </Alert>
              </Grid>
            )}

            {finalOutstanding <= 0 && newTotalPayment > 0 && (
              <Grid item xs={12}>
                <Alert severity='success'>
                  This payment will fully settle the order! 🎉
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        
        <DialogActions className='justify-center pbs-0 sm:pbe-16 sm:pli-16'>
          <Button 
            variant='contained' 
            type='submit' 
            disabled={loading || newTotalPayment <= 0 || newTotalPayment > outstandingAmount}
          >
            {loading ? 'Processing...' : `Process Payment (₵${newTotalPayment.toFixed(2)})`}
          </Button>
          <Button variant='outlined' color='secondary' onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default CustomerPaymentDialog
