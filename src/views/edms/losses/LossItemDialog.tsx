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
import InputAdornment from '@mui/material/InputAdornment'
import CircularProgress from '@mui/material/CircularProgress'

// Third-party Imports
import { toast } from 'react-toastify'

// Action Imports
import { addManualLoss, updateLoss } from '@/libs/actions/driverloss.actions'

// Type Imports
import type { DriverLossType } from '@/types/apps/deliveryTypes'

interface LossItemDialogProps {
  open: boolean
  onClose: () => void
  // Editing this row; otherwise a new manual loss on tripId
  loss?: DriverLossType | null
  tripId?: string
  actorName?: string
  onSaved?: () => void
}

/** Price or describe a lost item, or add a loss by hand to a trip. */
const LossItemDialog = ({ open, onClose, loss, tripId, actorName, onSaved }: LossItemDialogProps) => {
  const [description, setDescription] = useState('')
  const [value, setValue] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return

    setDescription(loss?.description || '')
    setValue(loss?.value !== null && loss?.value !== undefined ? String(loss.value) : '')
    setNotes(loss?.notes || '')
  }, [open, loss])

  const amount = value.trim() === '' ? null : Number(value)
  const amountValid = amount === null || (Number.isFinite(amount) && amount >= 0)
  const isNew = !loss

  const handleSave = async () => {
    if (!description.trim()) {
      toast.error('Say what was lost')

      return
    }

    if (!amountValid) {
      toast.error('Enter a valid value')

      return
    }

    try {
      setSaving(true)

      if (isNew) {
        if (!tripId) throw new Error('No trip to add the loss to')
        await addManualLoss({ tripId, description, value: amount, notes, by: actorName })
        toast.success('Loss added')
      } else {
        await updateLoss(loss.$id, { description, value: amount, notes })
        toast.success('Loss updated')
      }

      onSaved?.()
      onClose()
    } catch (error: any) {
      toast.error(error?.message || 'Could not save the loss')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth='xs'>
      <DialogTitle>{isNew ? 'Add a loss' : 'Lost item'}</DialogTitle>
      <DialogContent dividers className='flex flex-col gap-4'>
        <TextField
          label='What was lost'
          placeholder='e.g. Phone in a medium package, damaged TV'
          value={description}
          onChange={e => setDescription(e.target.value)}
          autoFocus={isNew}
          fullWidth
        />
        <TextField
          type='number'
          label='Value'
          value={value}
          onChange={e => setValue(e.target.value)}
          inputProps={{ min: 0, step: '0.01' }}
          InputProps={{ startAdornment: <InputAdornment position='start'>GH₵</InputAdornment> }}
          error={!amountValid}
          helperText='What the driver owes for it. Leave empty if the price is not known yet.'
          autoFocus={!isNew}
          fullWidth
        />
        <TextField
          label='Notes'
          value={notes}
          onChange={e => setNotes(e.target.value)}
          multiline
          minRows={2}
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button variant='outlined' onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant='contained'
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color='inherit' /> : undefined}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default LossItemDialog
