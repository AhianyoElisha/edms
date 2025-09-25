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
import { Alert, InputLabel, MenuItem, Select } from '@mui/material'
import { toast } from 'react-toastify'

// Components
import CountrySelect from '@/@core/components/mui/CountrySelect'
import PerfectScrollbar from 'react-perfect-scrollbar'

// Types
import type { Customer, Logistics } from '@/types/apps/ecommerceTypes'
import { updateCustomerInDB, updateTruckOrTricycleInDB } from '@/libs/actions/customer.action'

type Props = {
  open: boolean
  handleClose: () => void
  vehicleData: Logistics
  onSuccess?: () => Promise<void>
}

const formSchema = z.object({
  vehicleNumber: z.string().min(1, { message: "Vehicle number is required" }),
  vehicleType: z.string().min(1, { message: "Vehicle type is required" }),
  startroute: z.string().min(1, { message: "Start route is required" }),
  endroute: z.string().min(1, { message: "End route is required" }),
  status: z.string().min(1, { message: "Status is required" }),
})


const EditLogisticsDrawer = (props: Props) => {
  const { open, handleClose,vehicleData, onSuccess } = props
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    reset: resetForm,
    formState: { errors }
  } = useForm<Logistics>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicleNumber: vehicleData?.vehicleNumber ||'',
      vehicleType: vehicleData?.vehicleType ||'',
      starttown: vehicleData?.starttown || '',
      startcity: vehicleData?.startcity || '',
      startcountry: vehicleData?.startcountry || '',
      endtown: vehicleData?.endtown || '',
      endcity: vehicleData?.endcity || '',
      endcountry: vehicleData?.endcountry || '',
      status: vehicleData?.status || '',
    }
  })

  const onSubmit = async (data: Logistics) => {
    try {
      setIsSubmitting(true)
      setError(null)
      console.log(data)
      
      // Replace with your actual API call
      const res = await updateTruckOrTricycleInDB({...data, id: vehicleData.$id})
      
      if (!res) {
        throw new Error('Failed to create vehicle')
      }
      
      toast.success('Vehicle added successfully')
      
      
      // Clear form and close drawer
      handleReset()
      
      // Trigger refresh of parent data
      if (onSuccess) {
        await onSuccess()
      }
      
    } catch (error) {
      console.error('Error saving vehicle:', error)
      setError(error instanceof Error ? error.message : 'Failed to add vehicle')
      toast.error('Failed to add vehicle')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = useCallback(() => {
    resetForm({
      vehicleNumber: vehicleData?.vehicleNumber ||'',
      vehicleType: vehicleData?.vehicleType ||'',
      startcity: vehicleData?.startcity || '',
      startcountry: vehicleData?.startcountry || '',
      starttown: vehicleData?.starttown || '',
      endtown: vehicleData?.endtown || '',
      endcountry: vehicleData?.endcountry || '',
      endcity: vehicleData?.endcity || '',
      status: vehicleData?.status || '',
    })
    setError(null)
    handleClose()
  }, [resetForm, handleClose])

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
              Basic Information
            </Typography>
            
            <Controller
              name='vehicleNumber'
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label='Vehicle Number'
                  placeholder='ABC-123-23'
                  error={!!errors.vehicleNumber}
                  helperText={errors.vehicleNumber?.message}
                />
              )}
            />
            
            <Controller
              name='vehicleType'
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.vehicleType}>
                  <InputLabel id="vehicle-type-label">Vehicle Type</InputLabel>
                  <Select
                    {...field}
                    labelId="vehicle-type-label"
                    label="Vehicle Type"
                  >
                    <MenuItem value="truck"><i className="ri-truck-line text-[14px]"></i>Truck</MenuItem>
                    <MenuItem value="tricycle"><i className="ri-e-bike-line text-[14px]"></i>Tricycle</MenuItem>
                  </Select>
                  {errors.vehicleType && (
                    <FormHelperText>{errors.vehicleType.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
            
            <Typography color='text.primary' className='font-medium'>
              Delivery Information
            </Typography>
 
            <Controller
              name='starttown'
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label='Start Town'
                  error={!!errors.starttown}
                  helperText={errors.starttown?.message}
                />
              )}
            />

            <Controller
              name='startcity'
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label='Start City'
                  error={!!errors.startcity}
                  helperText={errors.startcity?.message}
                />
              )}
            />

            <Controller
              name='startcountry'
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label='Start Country'
                  error={!!errors.startcountry}
                  helperText={errors.startcountry?.message}
                />
              )}
            />

            <Controller
              name='endtown'
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label='End Town'
                  error={!!errors.endtown}
                  helperText={errors.endtown?.message}
                />
              )}
            />
            
            <Controller
              name='endcity'
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label='End Route'
                  error={!!errors.endcity}
                  helperText={errors.endcity?.message}
                />
              )}
            />

            <Controller
              name='endcountry'
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label='End Country'
                  error={!!errors.endcountry}
                  helperText={errors.endcountry?.message}
                />
              )}
            />

            <div className='flex items-center gap-4'>
              <Button 
                variant='contained' 
                type='submit'
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Vehicle'}
              </Button>
              <Button 
                variant='outlined' 
                color='error' 
                onClick={handleReset}
                disabled={isSubmitting}
              >
                Discard
              </Button>
            </div>
          </form>
        </div>
      </PerfectScrollbar>
    </Drawer>
  )
}

export default EditLogisticsDrawer