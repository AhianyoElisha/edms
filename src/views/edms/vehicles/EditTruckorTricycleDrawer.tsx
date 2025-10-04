import { useCallback, useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

// MUI Imports
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import FormControl from '@mui/material/FormControl'
import FormHelperText from '@mui/material/FormHelperText'
import { Alert, InputLabel, MenuItem, Select, Autocomplete } from '@mui/material'
import { toast } from 'react-toastify'

// Components
import PerfectScrollbar from 'react-perfect-scrollbar'

// Types
import type { Logistics } from '@/types/apps/ecommerceTypes'
import { updateTruckOrTricycleInDB } from '@/libs/actions/customer.action'
import { getAllRoutes } from '@/libs/actions/route.actions'
import { getAllUsers } from '@/libs/actions/auth.actions'

type Props = {
  open: boolean
  handleClose: () => void
  vehicleData: Logistics
  onSuccess?: () => Promise<void>
}

const formSchema = z.object({
  vehicleNumber: z.string().min(1, { message: "Vehicle number is required" }),
  vehicleType: z.enum(['truck', 'van', 'bike', 'car'], { message: "Vehicle type is required" }),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.number().min(1900).max(new Date().getFullYear() + 1).optional().or(z.literal('')),
  ownership: z.enum(['owned', 'rented'], { message: "Ownership type is required" }),
  monthlyRentalCost: z.number().min(0).optional().or(z.literal('')),
  driver: z.string().optional(),
  assignedRoutes: z.array(z.string()).optional(),
  status: z.enum(['active', 'maintenance', 'retired']).optional(),
})


const EditLogisticsDrawer = (props: Props) => {
  const { open, handleClose,vehicleData, onSuccess } = props
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drivers, setDrivers] = useState<any[]>([])
  const [routes, setRoutes] = useState<any[]>([])
  const [loadingDrivers, setLoadingDrivers] = useState(false)
  const [loadingRoutes, setLoadingRoutes] = useState(false)

  const {
    control,
    handleSubmit,
    reset: resetForm,
    watch,
    formState: { errors }
  } = useForm<Logistics>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicleNumber: vehicleData?.vehicleNumber ||'',
      vehicleType: vehicleData?.vehicleType ||'truck',
      brand: vehicleData?.brand || '',
      model: vehicleData?.model || '',
      year: vehicleData?.year || undefined,
      ownership: vehicleData?.ownership || 'owned',
      monthlyRentalCost: vehicleData?.monthlyRentalCost || 0,
      driver: vehicleData?.driver || '',
      assignedRoutes: vehicleData?.assignedRoutes || [],
      status: vehicleData?.status || 'active',
    }
  })

  const ownership = watch('ownership')

  // Fetch drivers and routes
  useEffect(() => {
    if (open) {
      fetchDrivers()
      fetchRoutes()
    }
  }, [open])

  const fetchDrivers = async () => {
    try {
      setLoadingDrivers(true)
      const response = await getAllUsers('driver')
      setDrivers(response || [])
    } catch (error) {
      console.error('Error fetching drivers:', error)
    } finally {
      setLoadingDrivers(false)
    }
  }

  const fetchRoutes = async () => {
    try {
      setLoadingRoutes(true)
      const response = await getAllRoutes()
      setRoutes(response || [])
    } catch (error) {
      console.error('Error fetching routes:', error)
    } finally {
      setLoadingRoutes(false)
    }
  }

  const onSubmit = async (data: Logistics) => {
    try {
      setIsSubmitting(true)
      setError(null)
      
      const vehicleUpdateData = {
        ...data,
        year: data.year ? Number(data.year) : undefined,
        monthlyRentalCost: data.ownership === 'rented' && data.monthlyRentalCost ? Number(data.monthlyRentalCost) : 0,
        status: data.status || 'active',
        id: vehicleData.$id
      }
      
      const res = await updateTruckOrTricycleInDB(vehicleUpdateData)
      
      if (!res) {
        throw new Error('Failed to update vehicle')
      }
      
      toast.success('Vehicle updated successfully')
      handleReset()
      
      if (onSuccess) {
        await onSuccess()
      }
      
    } catch (error) {
      console.error('Error updating vehicle:', error)
      setError(error instanceof Error ? error.message : 'Failed to update vehicle')
      toast.error('Failed to update vehicle')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = useCallback(() => {
    resetForm({
      vehicleNumber: vehicleData?.vehicleNumber ||'',
      vehicleType: vehicleData?.vehicleType ||'truck',
      brand: vehicleData?.brand || '',
      model: vehicleData?.model || '',
      year: vehicleData?.year || undefined,
      ownership: vehicleData?.ownership || 'owned',
      monthlyRentalCost: vehicleData?.monthlyRentalCost || 0,
      driver: vehicleData?.driver || '',
      assignedRoutes: vehicleData?.assignedRoutes || [],
      status: vehicleData?.status || 'active',
    })
    setError(null)
    handleClose()
  }, [resetForm, handleClose, vehicleData])

  // Reset error when drawer opens/closes
  useEffect(() => {
    if (!open) {
      setError(null)
    }
  }, [open])

  return (
    <Drawer
      open={open}
      anchor='right'
      variant='temporary'
      onClose={handleReset}
      ModalProps={{ keepMounted: true }}
      sx={{ '& .MuiDrawer-paper': { width: { xs: 300, sm: 400 } } }}
    >
      <div className='flex items-center justify-between p-5'>
        <Typography variant='h5'>Edit Vehicle Details</Typography>
        <IconButton size='small' onClick={handleReset}>
          <i className='ri-close-line text-2xl' />
        </IconButton>
      </div>
      <Divider />
      <PerfectScrollbar options={{ wheelPropagation: false, suppressScrollX: true }}>
        <div className='p-5'>
          <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-5'>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            
            <Typography color='text.primary' className='font-medium'>
              Vehicle Information
            </Typography>
            
            <Controller
              name='vehicleNumber'
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label='Vehicle Number'
                  placeholder='GV-1234-23'
                  error={!!errors.vehicleNumber}
                  helperText={errors.vehicleNumber?.message}
                  required
                />
              )}
            />
            
            <Controller
              name='vehicleType'
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.vehicleType}>
                  <InputLabel id="vehicle-type-label">Vehicle Type *</InputLabel>
                  <Select
                    {...field}
                    labelId="vehicle-type-label"
                    id="vehicle-type"
                    label="Vehicle Type *"
                  >
                    <MenuItem value="truck">Truck</MenuItem>
                    <MenuItem value="van">Van</MenuItem>
                    <MenuItem value="bike">Motorcycle/Bike</MenuItem>
                    <MenuItem value="car">Car</MenuItem>
                  </Select>
                  {errors.vehicleType && (
                    <FormHelperText>{errors.vehicleType.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
            
            <Controller
              name='brand'
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label='Brand'
                  placeholder='Toyota, Ford, Honda, etc.'
                  error={!!errors.brand}
                  helperText={errors.brand?.message}
                />
              )}
            />

            <Controller
              name='model'
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label='Model'
                  placeholder='Hilux, Transit, CB500X, etc.'
                  error={!!errors.model}
                  helperText={errors.model?.message}
                />
              )}
            />

            <Controller
              name='year'
              control={control}
              render={({ field: { onChange, value, ...field } }) => (
                <TextField
                  {...field}
                  fullWidth
                  type='number'
                  label='Year'
                  placeholder='2023'
                  value={value || ''}
                  onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
                  error={!!errors.year}
                  helperText={errors.year?.message}
                  inputProps={{ min: 1900, max: new Date().getFullYear() + 1 }}
                />
              )}
            />

            <Controller
              name='status'
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.status}>
                  <InputLabel id="status-label">Status</InputLabel>
                  <Select
                    {...field}
                    labelId="status-label"
                    id="status"
                    label="Status"
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="maintenance">Maintenance</MenuItem>
                    <MenuItem value="retired">Retired</MenuItem>
                  </Select>
                  {errors.status && (
                    <FormHelperText>{errors.status.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />

            <Divider />
            
            <Typography color='text.primary' className='font-medium'>
              Ownership & Assignment
            </Typography>

            <Controller
              name='ownership'
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.ownership}>
                  <InputLabel id="ownership-label">Ownership Type *</InputLabel>
                  <Select
                    {...field}
                    labelId="ownership-label"
                    id="ownership"
                    label="Ownership Type *"
                  >
                    <MenuItem value="owned">Owned</MenuItem>
                    <MenuItem value="rented">Rented</MenuItem>
                  </Select>
                  {errors.ownership && (
                    <FormHelperText>{errors.ownership.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />

            {ownership === 'rented' && (
              <Controller
                name='monthlyRentalCost'
                control={control}
                render={({ field: { onChange, value, ...field } }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type='number'
                    label='Monthly Rental Cost (GHS)'
                    placeholder='1500'
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
                    error={!!errors.monthlyRentalCost}
                    helperText={errors.monthlyRentalCost?.message}
                    inputProps={{ min: 0, step: '0.01' }}
                  />
                )}
              />
            )}

            <Controller
              name='driver'
              control={control}
              render={({ field: { onChange, value } }) => (
                <Autocomplete
                  value={drivers.find((d) => d.$id === value) || null}
                  onChange={(_, newValue) => onChange(newValue?.$id || '')}
                  options={drivers}
                  getOptionLabel={(option) => `${option.firstName || ''} ${option.lastName || ''} (${option.email || ''})`}
                  loading={loadingDrivers}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label='Assign Driver (Optional)'
                      placeholder='Select a driver'
                      error={!!errors.driver}
                      helperText={errors.driver?.message || 'Assign a driver to this vehicle'}
                    />
                  )}
                />
              )}
            />

            <Controller
              name='assignedRoutes'
              control={control}
              render={({ field: { onChange, value } }) => (
                <Autocomplete
                  multiple
                  value={routes.filter((r) => value?.includes(r.$id)) || []}
                  onChange={(_, newValue) => onChange(newValue.map((v) => v.$id))}
                  options={routes}
                  getOptionLabel={(option) => `${option.routeName || option.routeCode || ''}`}
                  loading={loadingRoutes}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label='Assign Routes (Optional)'
                      placeholder='Select routes'
                      error={!!errors.assignedRoutes}
                      helperText={errors.assignedRoutes?.message || 'Assign routes to this vehicle'}
                    />
                  )}
                />
              )}
            />

            <div className='flex items-center gap-4'>
              <Button
                fullWidth
                variant='outlined'
                color='secondary'
                type='reset'
                onClick={handleReset}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                fullWidth
                variant='contained'
                type='submit'
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating...' : 'Update Vehicle'}
              </Button>
            </div>
          </form>
        </div>
      </PerfectScrollbar>
    </Drawer>
  )
}

export default EditLogisticsDrawer