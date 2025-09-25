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

type EndRouteData = {
  vehicleId?: string
  endtown?: string
  endcity?: string
  endcountry?: string
  status?: string
}

type AddEditEndRouteProps = {
  open: boolean
  setOpen: (open: boolean) => void
  data?: EndRouteData
  onUpdate?: () => void
}

const countries = ['Ghana', 'Nigeria', 'Togo', 'Burkina Faso', 'Ivory Coast']
const statusOptions = ['active', 'inactive', 'maintenance']

const AddEditEndRouteDialog = ({ open, setOpen, data, onUpdate }: AddEditEndRouteProps) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<EndRouteData>({
    endtown: '',
    endcity: '',
    endcountry: '',
    status: 'active'
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
        endtown: formData.endtown!,
        endcity: formData.endcity!,
        endcountry: formData.endcountry!,
        status: formData.status!
      })
      
      toast.success('Vehicle end route updated successfully')
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
        Edit End Route
        <Typography component='span' className='flex flex-col text-center'>
          Update vehicle end route information and status
        </Typography>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent className='pbs-0 sm:pbe-6 sm:pli-16'>
          <IconButton onClick={() => setOpen(false)} className='absolute block-start-4 inline-end-4'>
            <i className='ri-close-line text-textSecondary' />
          </IconButton>
          
          <Grid container spacing={5}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label='End Town'
                value={formData.endtown || ''}
                onChange={e => setFormData({ ...formData, endtown: e.target.value })}
                placeholder='Enter end town'
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='End City'
                value={formData.endcity || ''}
                onChange={e => setFormData({ ...formData, endcity: e.target.value })}
                placeholder='Enter end city'
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>End Country</InputLabel>
                <Select
                  label='End Country'
                  value={formData.endcountry || ''}
                  onChange={e => setFormData({ ...formData, endcountry: e.target.value })}
                >
                  {countries.map((country) => (
                    <MenuItem key={country} value={country}>
                      {country}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Vehicle Status</InputLabel>
                <Select
                  label='Vehicle Status'
                  value={formData.status || 'active'}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                >
                  {statusOptions.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions className='justify-center pbs-0 sm:pbe-16 sm:pli-16'>
          <Button variant='contained' type='submit' disabled={loading}>
            {loading ? 'Updating...' : 'Update End Route'}
          </Button>
          <Button variant='outlined' color='secondary' onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default AddEditEndRouteDialog