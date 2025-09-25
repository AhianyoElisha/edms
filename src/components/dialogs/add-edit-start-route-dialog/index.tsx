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
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'

// Actions
import { updateVehicleInDB } from '@/libs/actions/customer.action'
import { toast } from 'react-toastify'

type StartRouteData = {
  vehicleId?: string
  vehicleType?: string
  vehicleNumber?: string
  starttown?: string
  startcity?: string
  startcountry?: string
}

type AddEditStartRouteProps = {
  open: boolean
  setOpen: (open: boolean) => void
  data?: StartRouteData
  onUpdate?: () => void
}

const vehicleTypes = ['truck', 'tricycle']
const countries = ['Ghana', 'Nigeria', 'Togo', 'Burkina Faso', 'Ivory Coast']

const AddEditStartRouteDialog = ({ open, setOpen, data, onUpdate }: AddEditStartRouteProps) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<StartRouteData>({
    vehicleType: '',
    vehicleNumber: '',
    starttown: '',
    startcity: '',
    startcountry: ''
  })

  useEffect(() => {
    if (data) {
      setFormData(data)
    }
  }, [data, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data?.vehicleId) return

    try {
      setLoading(true)
      await updateVehicleInDB({
        id: data.vehicleId,
        vehicleType: formData.vehicleType!,
        vehicleNumber: formData.vehicleNumber!,
        starttown: formData.starttown!,
        startcity: formData.startcity!,
        startcountry: formData.startcountry!
      })
      
      toast.success('Vehicle start route updated successfully')
      setOpen(false)
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Error updating vehicle:', error)
      toast.error('Failed to update vehicle')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} maxWidth='md' scroll='body' onClose={() => setOpen(false)}>
      <DialogTitle variant='h4' className='flex gap-2 flex-col text-center sm:pbs-16 sm:pbe-6 sm:pli-16'>
        Edit Start Route
        <Typography component='span' className='flex flex-col text-center'>
          Update vehicle start route information
        </Typography>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent className='pbs-0 sm:pbe-6 sm:pli-16'>
          <IconButton onClick={() => setOpen(false)} className='absolute block-start-4 inline-end-4'>
            <i className='ri-close-line text-textSecondary' />
          </IconButton>
          
          <Grid container spacing={5}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Vehicle Type</InputLabel>
                <Select
                  label='Vehicle Type'
                  value={formData.vehicleType || ''}
                  onChange={e => setFormData({ ...formData, vehicleType: e.target.value })}
                >
                  {vehicleTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Vehicle Number'
                value={formData.vehicleNumber || ''}
                onChange={e => setFormData({ ...formData, vehicleNumber: e.target.value })}
                placeholder='e.g., GH-1234-20'
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label='Start Town'
                value={formData.starttown || ''}
                onChange={e => setFormData({ ...formData, starttown: e.target.value })}
                placeholder='Enter start town'
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Start City'
                value={formData.startcity || ''}
                onChange={e => setFormData({ ...formData, startcity: e.target.value })}
                placeholder='Enter start city'
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Start Country</InputLabel>
                <Select
                  label='Start Country'
                  value={formData.startcountry || ''}
                  onChange={e => setFormData({ ...formData, startcountry: e.target.value })}
                >
                  {countries.map((country) => (
                    <MenuItem key={country} value={country}>
                      {country}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions className='justify-center pbs-0 sm:pbe-16 sm:pli-16'>
          <Button variant='contained' type='submit' disabled={loading}>
            {loading ? 'Updating...' : 'Update Start Route'}
          </Button>
          <Button variant='outlined' color='secondary' onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default AddEditStartRouteDialog