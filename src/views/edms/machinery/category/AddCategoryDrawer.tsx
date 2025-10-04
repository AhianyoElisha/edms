import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

// MUI Imports
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import { saveMachineryCategoryToDB } from '@/libs/actions/machinery.actions'
import { MachineryCategoryType } from '@/types/apps/ecommerceTypes'
import ProductImage from './ProductImage'
import { Alert } from '@mui/material'
import { toast } from 'react-toastify'
import { useAuth } from '@/contexts/AppwriteProvider'
// Type definitions
type Props = {
  open: boolean
  handleClose: () => void
  setData: (data: MachineryCategoryType[]) => void
  onSuccess?: () => Promise<void>

}

const formSchema = z.object({
  categoryTitle: z.string().min(1, { message: "Category title is required" }),
  description: z.string().min(1, { message: "Description is required" }),
  images: z.array(z.instanceof(File)).min(1, { message: "At least one image is required" }),
  usdRate: z.coerce.number().min(1, { message: "USD rate is required" }),
  pricePerOne: z.coerce.number().min(1, { message: "Price per machinery is required" }),
})

const AddCategoryDrawer = (props: Props) => {
  const { open, handleClose, setData, onSuccess } = props
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const user = useAuth()

  const {
    control,
    handleSubmit,
    reset: resetForm,
    formState: { errors }
  } = useForm<MachineryCategoryType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryTitle: '',
      description: '',
      images: [],
      pricePerOne: 0,
      usdRate: 0
    }
  })

  const onSubmit = async (data: MachineryCategoryType) => {
    try {
      setIsSubmitting(true)
      setError(null)
      
      const res = await saveMachineryCategoryToDB(data, user.user.$id!)
      
      if (!res) {
        throw new Error('Failed to create machinery category')
      }
      
      toast.success('Category added successfully')
      
      // Clear form and close drawer
      handleReset()
      
      // Trigger refresh of parent data
      if (onSuccess) {
        await onSuccess()
      }
      
    } catch (error) {
      console.error('Error saving category:', error)
      setError(error instanceof Error ? error.message : 'Failed to add category')
      toast.error('Failed to add category')
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
      sx={{ '& .MuiDrawer-paper': { width: { xs: 300, sm: 500 } } }}
    >
      <div className='flex items-center justify-between pli-5 plb-4'>
        <Typography variant='h5'>Add Category</Typography>
        <IconButton size='small' onClick={handleReset}>
          <i className='ri-close-line text-2xl' />
        </IconButton>
      </div>
      <Divider />
      <div className='p-5'>
        <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-5'>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <ProductImage control={control} index={0} name='images' />
          <Controller
            name='categoryTitle'
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label='Title'
                placeholder='Enter category title'
                error={!!errors.categoryTitle}
                helperText={errors.categoryTitle?.message}
              />
            )}
          />
          
          <Controller
            name='description'
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label='Description'
                placeholder='Enter a description...'
                error={!!errors.description}
                helperText={errors.description?.message}
              />
            )}
          />
          <Controller
            name='pricePerOne'
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type='tel'
                label='Price per Machinery(USD$/GH₵)'
                placeholder='Enter Price Per Machinery/Tool...'
                error={!!errors.pricePerOne}
                helperText={errors.pricePerOne?.message}
              />
            )}
          />
          <Controller
            name='usdRate'
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type='tel'
                label='USD Rate'
                placeholder='Enter USD Rate...'
                error={!!errors.usdRate}
                helperText={errors.usdRate?.message}
              />
            )}
          />
          <div className='flex items-center gap-4'>
            <Button 
              variant='contained' 
              type='submit'
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Category'}
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
    </Drawer>
  )
}
export default AddCategoryDrawer