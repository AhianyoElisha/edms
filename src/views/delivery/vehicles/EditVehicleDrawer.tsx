'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Slider from '@mui/material/Slider'

// Third-party Imports
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'react-toastify'

// Type Imports
import { VehicleType, VehicleStatusType } from '@/types/apps/deliveryTypes'
import { UpdateVehicleData } from '@/libs/actions/vehicle.actions'

// Action Imports
import { updateVehicle } from '@/libs/actions/vehicle.actions'

interface EditVehicleDrawerProps {
  open: boolean
  vehicle: VehicleType | null
  onClose: () => void
  onSuccess: () => void
}

const EditVehicleDrawer = ({ open, vehicle, onClose, onSuccess }: EditVehicleDrawerProps) => {
  // States
  const [loading, setLoading] = useState(false)

  // Form
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<UpdateVehicleData>()

  const watchedType = watch('type')

  // Load vehicle data when drawer opens
  useEffect(() => {
    if (vehicle && open) {
      reset({
        $id: vehicle.$id,
        licensePlate: vehicle.licensePlate,
        type: vehicle.type,
        status: vehicle.status,
        capacity: vehicle.capacity?.toString() || '',
        model: vehicle.model,
        year: vehicle.year,
        location: vehicle.location || '',
        batteryLevel: vehicle.batteryLevel || 100,
        fuelLevel: vehicle.fuelLevel || 100,
        driverId: vehicle.driverId || undefined,
        lastMaintenance: vehicle.lastMaintenance || '',
        nextMaintenance: vehicle.nextMaintenance || ''
      })
    }
  }, [vehicle, open, reset])

  // Handle form submission
  const onSubmit = async (data: UpdateVehicleData) => {
    try {
      setLoading(true)
      
      // Clean up data based on vehicle type
      const updateData = {
        ...data,
        batteryLevel: data.type === 'bicycle' || data.type === 'motorcycle' ? data.batteryLevel : undefined,
        fuelLevel: data.type === 'truck' || data.type === 'van' ? data.fuelLevel : undefined
      }

      await updateVehicle(updateData)
      toast.success('Vehicle updated successfully!')
      onSuccess()
    } catch (error) {
      console.error('Error updating vehicle:', error)
      toast.error('Failed to update vehicle')
    } finally {
      setLoading(false)
    }
  }

  // Handle drawer close
  const handleClose = () => {
    if (!loading) {
      reset()
      onClose()
    }
  }

  if (!vehicle) return null

  return (
    <Drawer
      open={open}
      anchor='right'
      variant='temporary'
      onClose={handleClose}
      ModalProps={{ keepMounted: true }}
      sx={{ '& .MuiDrawer-paper': { width: { xs: 300, sm: 400 } } }}
    >
      <div className='flex items-center justify-between p-6'>
        <Typography variant='h5'>Edit Vehicle</Typography>
        <IconButton onClick={handleClose} disabled={loading}>
          <i className='ri-close-line' />
        </IconButton>
      </div>
      <Divider />
      
      <div className='p-6'>
        <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-6'>
          {/* License Plate */}
          <Controller
            name='licensePlate'
            control={control}
            rules={{ 
              required: 'License plate is required',
              minLength: { value: 3, message: 'License plate must be at least 3 characters' }
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label='License Plate'
                placeholder='e.g., ABC-1234'
                error={Boolean(errors.licensePlate)}
                helperText={errors.licensePlate?.message}
                disabled={loading}
              />
            )}
          />

          {/* Vehicle Type */}
          <Controller
            name='type'
            control={control}
            rules={{ required: 'Vehicle type is required' }}
            render={({ field }) => (
              <FormControl fullWidth error={Boolean(errors.type)}>
                <InputLabel>Vehicle Type</InputLabel>
                <Select {...field} label='Vehicle Type' disabled={loading}>
                  <MenuItem value='truck'>Truck</MenuItem>
                  <MenuItem value='van'>Van</MenuItem>
                  <MenuItem value='motorcycle'>Motorcycle</MenuItem>
                  <MenuItem value='bicycle'>Bicycle</MenuItem>
                </Select>
                {errors.type && (
                  <Typography variant='caption' color='error' className='mt-1 ml-3'>
                    {errors.type.message}
                  </Typography>
                )}
              </FormControl>
            )}
          />

          {/* Model */}
          <Controller
            name='model'
            control={control}
            rules={{ required: 'Model is required' }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label='Model'
                placeholder='e.g., Toyota Hilux, Honda CBR'
                error={Boolean(errors.model)}
                helperText={errors.model?.message}
                disabled={loading}
              />
            )}
          />

          {/* Year */}
          <Controller
            name='year'
            control={control}
            rules={{ 
              required: 'Year is required',
              min: { value: 1990, message: 'Year must be 1990 or later' },
              max: { value: new Date().getFullYear() + 1, message: 'Year cannot be in the future' }
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type='number'
                label='Year'
                error={Boolean(errors.year)}
                helperText={errors.year?.message}
                disabled={loading}
                onChange={(e) => field.onChange(parseInt(e.target.value))}
              />
            )}
          />

          {/* Capacity */}
          <Controller
            name='capacity'
            control={control}
            rules={{ required: 'Capacity is required' }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label='Capacity'
                placeholder='e.g., 1000 kg, 50 packages'
                error={Boolean(errors.capacity)}
                helperText={errors.capacity?.message}
                disabled={loading}
              />
            )}
          />

          {/* Status */}
          <Controller
            name='status'
            control={control}
            rules={{ required: 'Status is required' }}
            render={({ field }) => (
              <FormControl fullWidth error={Boolean(errors.status)}>
                <InputLabel>Status</InputLabel>
                <Select {...field} label='Status' disabled={loading}>
                  <MenuItem value='available'>Available</MenuItem>
                  <MenuItem value='active'>Active</MenuItem>
                  <MenuItem value='maintenance'>Maintenance</MenuItem>
                  <MenuItem value='unavailable'>Unavailable</MenuItem>
                </Select>
                {errors.status && (
                  <Typography variant='caption' color='error' className='mt-1 ml-3'>
                    {errors.status.message}
                  </Typography>
                )}
              </FormControl>
            )}
          />

          {/* Location */}
          <Controller
            name='location'
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label='Location'
                placeholder='e.g., Warehouse A, Route 101'
                error={Boolean(errors.location)}
                helperText={errors.location?.message}
                disabled={loading}
              />
            )}
          />

          {/* Fuel/Battery Level */}
          {(watchedType === 'truck' || watchedType === 'van') && (
            <Controller
              name='fuelLevel'
              control={control}
              render={({ field }) => (
                <Box>
                  <Typography gutterBottom>Fuel Level: {field.value || 0}%</Typography>
                  <Slider
                    {...field}
                    value={field.value || 0}
                    onChange={(_, value) => field.onChange(value)}
                    min={0}
                    max={100}
                    step={5}
                    marks={[
                      { value: 0, label: '0%' },
                      { value: 50, label: '50%' },
                      { value: 100, label: '100%' }
                    ]}
                    disabled={loading}
                  />
                </Box>
              )}
            />
          )}

          {(watchedType === 'bicycle' || watchedType === 'motorcycle') && (
            <Controller
              name='batteryLevel'
              control={control}
              render={({ field }) => (
                <Box>
                  <Typography gutterBottom>Battery Level: {field.value || 0}%</Typography>
                  <Slider
                    {...field}
                    value={field.value || 0}
                    onChange={(_, value) => field.onChange(value)}
                    min={0}
                    max={100}
                    step={5}
                    marks={[
                      { value: 0, label: '0%' },
                      { value: 50, label: '50%' },
                      { value: 100, label: '100%' }
                    ]}
                    disabled={loading}
                  />
                </Box>
              )}
            />
          )}

          {/* Maintenance Dates */}
          <Controller
            name='lastMaintenance'
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type='date'
                label='Last Maintenance'
                InputLabelProps={{ shrink: true }}
                disabled={loading}
              />
            )}
          />

          <Controller
            name='nextMaintenance'
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type='date'
                label='Next Maintenance'
                InputLabelProps={{ shrink: true }}
                disabled={loading}
              />
            )}
          />

          <Divider />

          {/* Action Buttons */}
          <div className='flex items-center gap-4'>
            <Button
              variant='contained'
              type='submit'
              disabled={loading}
              className='flex-1'
            >
              {loading ? (
                <>
                  <CircularProgress size={16} className='mr-2' />
                  Updating...
                </>
              ) : (
                'Update Vehicle'
              )}
            </Button>
            <Button
              variant='outlined'
              onClick={handleClose}
              disabled={loading}
              className='flex-1'
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </Drawer>
  )
}

export default EditVehicleDrawer