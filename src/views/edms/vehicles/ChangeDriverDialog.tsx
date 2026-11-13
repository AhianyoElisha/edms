'use client'

// React Imports
import { useEffect, useState } from 'react'

// MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

// Third-party Imports
import { toast } from 'react-toastify'

// Component Imports
import VehicleDriverField from './VehicleDriverField'

// Action Imports
import { setVehicleDriver } from '@/libs/actions/customer.action'

// Util Imports
import { vehicleDriverId } from '@/utils/fleetIdentity'

type Props = {
  open: boolean
  onClose: () => void

  /** The vehicle row, with or without its driver expanded */
  vehicle: any | null
  onSaved?: () => void | Promise<void>
}

/**
 * Change (or clear) the driver assigned to one vehicle, without opening the full
 * vehicle form. A driver who is on another vehicle is moved across.
 */
const ChangeDriverDialog = ({ open, onClose, vehicle, onSaved }: Props) => {
  const currentDriverId = vehicleDriverId(vehicle) || ''
  const [driverId, setDriverId] = useState(currentDriverId)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setDriverId(currentDriverId)
  }, [open, currentDriverId])

  const currentName = typeof vehicle?.driver === 'object' ? vehicle?.driver?.name : null

  const handleSave = async () => {
    if (!vehicle) return

    try {
      setSaving(true)
      await setVehicleDriver(vehicle.$id, driverId || null)
      toast.success(driverId ? 'Driver updated' : 'Driver removed from the vehicle')
      await onSaved?.()
      onClose()
    } catch (error: any) {
      console.error('Error changing driver:', error)
      toast.error(error?.message || 'Could not change the driver')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth='xs' fullWidth>
      <DialogTitle>Change Driver</DialogTitle>
      <DialogContent>
        <Typography variant='body2' color='text.secondary' className='mbe-4'>
          {vehicle?.vehicleNumber}
          {currentName ? ` is assigned to ${currentName}.` : ' has no assigned driver.'}
        </Typography>
        <div className='pbs-1'>
          <VehicleDriverField value={driverId} onChange={setDriverId} vehicleId={vehicle?.$id} open={open} />
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving} color='secondary'>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || driverId === currentDriverId} variant='contained'>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ChangeDriverDialog
