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
import { Alert } from '@mui/material'
import { toast } from 'react-toastify'

// Components
import PerfectScrollbar from 'react-perfect-scrollbar'

// Types
import type { Supplier } from '@/types/apps/ecommerceTypes'
import { saveSupplierToDB } from '@/libs/actions/customer.action'

type Props = {
  open: boolean
  handleClose: () => void
  supplierData?: Supplier[]
  onSuccess?: () => Promise<void>
}

const formSchema = z.object({
  name: z.string().min(1, { message: "Company name is required" }),
  contact: z.string().min(1, { message: "Contact is required" }),
  address: z.string().min(1, { message: "Address Line  is required" }),
})


const AddSupplierDrawer = (props: Props) => {
  const { open, handleClose, onSuccess } = props
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    reset: resetForm,
    formState: { errors }
  } = useForm<Supplier>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      contact: '',
      address: '',
    }
  })

  const onSubmit = async (data: Supplier) => {
    try {
      setIsSubmitting(true)
      setError(null)
      console.log(data)
      
      // Replace with your actual API call
      const res = await saveSupplierToDB(data)
      
      if (!res) {
        throw new Error('Failed to create supplier')
      }
      
      toast.success('Supplier added successfully')
      
      
      // Clear form and close drawer
      handleReset()
      
      // Trigger refresh of parent data
      if (onSuccess) {
        await onSuccess()
      }
      
    } catch (error) {
      console.error('Error saving supplier:', error)
      setError(error instanceof Error ? error.message : 'Failed to add supplier')
      toast.error('Failed to add supplier')
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
        <Typography variant='h5'>Add a Supplier</Typography>
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
              name='name'
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label='Company Name'
                  placeholder='John Doe Ltd' 
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              )}
            />
            
            <Typography color='text.primary' className='font-medium'>
              Extra Information
            </Typography>
            
            <Controller
              name='address'
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label='Address'
                  error={!!errors.address}
                  helperText={errors.address?.message}
                />
              )}
            />
            

            
            <Controller
              name='contact'
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label='Mobile Number'
                  placeholder='(233) 294-5153'
                  error={!!errors.contact}
                  helperText={errors.contact?.message}
                />
              )}
            />


            <div className='flex items-center gap-4'>
              <Button 
                variant='contained' 
                type='submit'
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Supplier'}
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

export default AddSupplierDrawer