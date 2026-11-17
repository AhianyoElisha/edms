'use client'

// React Imports
import { useEffect, useState } from 'react'

// MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import InputAdornment from '@mui/material/InputAdornment'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'

// Third-party Imports
import { toast } from 'react-toastify'
import dayjs from 'dayjs'

// Action Imports
import { PAYMENT_METHODS, recordLossPayment } from '@/libs/actions/driverloss.actions'

// Type Imports
import type { DriverLossPaymentMethod } from '@/types/apps/deliveryTypes'

// Util Imports
import { formatPrice } from '@/utils/dateAndCurrency'

interface PaymentDialogProps {
  open: boolean
  onClose: () => void
  driverId: string
  driverName: string
  balance: number
  actorName?: string
  onSaved?: () => void
}

/**
 * Record money a driver paid towards their losses, or a deduction the office took.
 * Any amount, any day: part payments add up against the balance.
 */
const PaymentDialog = ({ open, onClose, driverId, driverName, balance, actorName, onSaved }: PaymentDialogProps) => {
  const [amount, setAmount] = useState('')
  const [paidAt, setPaidAt] = useState(dayjs().format('YYYY-MM-DD'))
  const [method, setMethod] = useState<DriverLossPaymentMethod>('cash')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return

    setAmount('')
    setPaidAt(dayjs().format('YYYY-MM-DD'))
    setMethod('cash')
    setReference('')
    setNotes('')
  }, [open])

  const value = Number(amount)
  const valid = amount.trim() !== '' && Number.isFinite(value) && value > 0

  const handleSave = async () => {
    if (!valid) {
      toast.error('Enter an amount above zero')

      return
    }

    try {
      setSaving(true)
      await recordLossPayment({
        driverId,
        amount: value,
        // Midday, so the date reads the same in every time zone
        paidAt: dayjs(paidAt).hour(12).toISOString(),
        method,
        reference,
        notes,
        by: actorName
      })
      toast.success(`${formatPrice(value)} recorded for ${driverName}`)
      onSaved?.()
      onClose()
    } catch (error: any) {
      toast.error(error?.message || 'Could not record the payment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth='xs'>
      <DialogTitle>Record a payment</DialogTitle>
      <DialogContent dividers className='flex flex-col gap-4'>
        <Typography variant='body2' color='text.secondary'>
          {driverName} currently owes <strong>{formatPrice(balance)}</strong>.
        </Typography>
        <TextField
          type='number'
          label='Amount'
          value={amount}
          onChange={e => setAmount(e.target.value)}
          inputProps={{ min: 0, step: '0.01' }}
          InputProps={{ startAdornment: <InputAdornment position='start'>GH₵</InputAdornment> }}
          helperText={valid && value > balance && balance > 0 ? 'More than the balance - it will show as credit' : ' '}
          autoFocus
          fullWidth
        />
        <TextField
          select
          label='How'
          value={method}
          onChange={e => setMethod(e.target.value as DriverLossPaymentMethod)}
          helperText={method === 'deduction' ? 'An amount taken off what the driver is paid, entered by hand' : ' '}
          fullWidth
        >
          {PAYMENT_METHODS.map(option => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          type='date'
          label='Date'
          value={paidAt}
          onChange={e => setPaidAt(e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
        <TextField
          label='Reference'
          placeholder='Receipt or transaction number'
          value={reference}
          onChange={e => setReference(e.target.value)}
          fullWidth
        />
        <TextField label='Notes' value={notes} onChange={e => setNotes(e.target.value)} multiline minRows={2} fullWidth />
      </DialogContent>
      <DialogActions>
        <Button variant='outlined' onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant='contained'
          onClick={handleSave}
          disabled={!valid || saving}
          startIcon={saving ? <CircularProgress size={16} color='inherit' /> : undefined}
        >
          Record
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default PaymentDialog
