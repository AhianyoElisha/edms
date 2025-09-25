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
import { Alert } from '@mui/material'
import { toast } from 'react-toastify'

// Components
import CountrySelect from '@/@core/components/mui/CountrySelect'
import PerfectScrollbar from 'react-perfect-scrollbar'

// Types
import type { Customer } from '@/types/apps/ecommerceTypes'
import { saveCustomerToDB } from '@/libs/actions/customer.action'

type Props = {
  open: boolean
  handleClose: () => void
  customerData?: Customer[]
  onSuccess?: () => Promise<void>
}

const formSchema = z.object({
  customer: z.string().min(1, { message: "Full name is required" }),
  email: z.string().email({ message: "Invalid email address" }).optional(),
  country: z.string().min(1, { message: "Country is required" }),
  contact1: z.string().min(1, { message: "Contact is required" }),
  // contact2: z.string().optional(),
  address1: z.string().min(1, { message: "Address Line 1 is required" }),
  address2: z.string().optional(),
  city: z.string().min(1, { message: "City is required" }),
  town: z.string().min(1, { message: "Town is required" }),
  state: z.string().min(1, { message: "State/Region is required" }),
  GPScode: z.string().min(1, { message: "GPS code is required" })
})


const AddCustomerDrawer = (props: Props) => {
  const { open, handleClose, onSuccess } = props
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    reset: resetForm,
    formState: { errors }
  } = useForm<Customer>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer: '',
      email: '',
      country: '',
      contact1: '',
      contact2: '',
      address1: '',
      address2: '',
      city: '',
      town: '',
      state: '',
      GPScode: ''
    }
  })

  const onSubmit = async (data: Customer) => {
    try {
      setIsSubmitting(true)
      setError(null)
      console.log(data)
      
      // Replace with your actual API call
      const res = await saveCustomerToDB(data)
      
      if (!res) {
        throw new Error('Failed to create customer')
      }
      
      toast.success('Customer added successfully')
      
      
      // Clear form and close drawer
      handleReset()
      
      // Trigger refresh of parent data
      if (onSuccess) {
        await onSuccess()
      }
      
    } catch (error) {
      console.error('Error saving customer:', error)
      setError(error instanceof Error ? error.message : 'Failed to add customer')
      toast.error('Failed to add customer')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = useCallback(() => {
    resetForm()
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
        <Typography variant='h5'>Add a Customer</Typography>
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
              name='customer'
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label='Full Name'
                  placeholder='John Doe'
                  error={!!errors.customer}
                  helperText={errors.customer?.message}
                />
              )}
            />
            
            <Controller
              name='email'
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  type='email'
                  label='Email Address'
                  placeholder='johndoe@gmail.com'
                  error={!!errors.email}
                  helperText={errors.email?.message}
                />
              )}
            />
            
            <FormControl fullWidth error={!!errors.country}>
              <Controller
                name="country"
                control={control}
                render={({ field }) => (
                  <CountrySelect
                    {...field}
                    error={!!errors.country}
                  />
                )}
              />
              {errors.country && (
                <FormHelperText>{errors.country.message}</FormHelperText>
              )}
            </FormControl>

            <Typography color='text.primary' className='font-medium'>
              Delivery Information
            </Typography>
            
            <Controller
              name='address1'
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label='Address Line 1'
                  error={!!errors.address1}
                  helperText={errors.address1?.message}
                />
              )}
            />
            
            <Controller
              name='address2'
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label='Address Line 2'
                  error={!!errors.address2}
                  helperText={errors.address2?.message}
                />
              )}
            />
            
            
            <Controller
              name='state'
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label='State/Province'
                  error={!!errors.state}
                  helperText={errors.state?.message}
                />
              )}
            />

            <Controller
              name='city'
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label='City'
                  error={!!errors.city}
                  helperText={errors.city?.message}
                  />
              )}
            />
            
            <Controller
              name='town'
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label='Town'
                  error={!!errors.town}
                  helperText={errors.town?.message}
                />
              )}
            />

            <Controller
              name='GPScode'
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label='GPS Code'
                  error={!!errors.GPScode}
                  helperText={errors.GPScode?.message}
                />
              )}
            />
            
            <Controller
              name='contact1'
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label='Mobile Number 1'
                  placeholder='(233) 294-5153'
                  error={!!errors.contact1}
                  helperText={errors.contact1?.message}
                />
              )}
            />

            <Controller
              name='contact2'
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label='Mobile Number 2'
                  placeholder='(233) 294-5153'
                  error={!!errors.contact2}
                  helperText={errors.contact2?.message}
                />
              )}
            />

            <div className='flex items-center gap-4'>
              <Button 
                variant='contained' 
                type='submit'
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Customer'}
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

export default AddCustomerDrawer