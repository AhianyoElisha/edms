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
import { Alert } from '@mui/material'
import { toast } from 'react-toastify'

// Component Imports
import EditProductImage from './EditProductImage'
// Actions Import
import { updateMachineryCategoryInDB } from '@/libs/actions/machinery.actions'

// Types Import
import { ImageType, MachineryCategoryType } from '@/types/apps/ecommerceTypes'

type Props = {
  open: boolean
  handleClose: () => void
  categoryData: MachineryCategoryType
  onSuccess?: () => Promise<void>
}

const formSchema = z.object({
  categoryTitle: z.string().min(1, { message: "Category title is required" }),
  description: z.string().min(1, { message: "Description is required" }),
  usdRate: z.coerce.number().min(1, { message: "USD Rate is required" }),
  images: z.array(
    z.union([
      z.instanceof(File),
      z.object({
        fileId: z.string(),
        fileUrl: z.string()
      })
    ])
  ),
  pricePerOne: z.coerce.number().min(1, { message: "Price per machinery is required" }),
})

const EditCategoryDrawer = (props: Props) => {
  const { open, handleClose, categoryData, onSuccess } = props
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  console.log(categoryData)
  const parseValue = (val: string | ImageType[]): ImageType[] => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val) || []
      } catch {
        return []
      }
    }
    return val || []
  }

  const categoryImages = parseValue(categoryData?.images as unknown as string)
const {
  control,
  handleSubmit,
  reset: resetForm,
  formState: { errors }
} = useForm<MachineryCategoryType>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    categoryTitle: categoryData?.categoryTitle || '',
    description: categoryData?.description || '',
    pricePerOne: categoryData?.pricePerOne || 0,
    images: categoryImages,
    usdRate: categoryData?.usdRate || 0,
  }
})

  // Initialize form with category data when drawer opens
  useEffect(() => {
    if (open && categoryData) {
      resetForm({
        categoryTitle: categoryData?.categoryTitle,
        description: categoryData?.description,
        images: categoryImages,
        usdRate: categoryData?.usdRate,
        pricePerOne: categoryData?.pricePerOne,
      })
    }
  }, [open, categoryData, resetForm])

  const onSubmit = async (data: MachineryCategoryType) => {
    console.log(data)
    try {
      setIsSubmitting(true)
      setError(null)
      
      const res = await updateMachineryCategoryInDB({
        ...data,
        id: categoryData.$id // Make sure to include the category ID for update
      })
      
      if (!res) {
        throw new Error('Failed to update inventory category')
      }
      
      toast.success('Category updated successfully')
      
      // Clear form and close drawer
      handleReset()
      
      // Trigger refresh of parent data
      if (onSuccess) {
        await onSuccess()
      }
      
    } catch (error) {
      console.error('Error updating category:', error)
      setError(error instanceof Error ? error.message : 'Failed to update category')
      toast.error('Failed to update category')
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

  console.log(categoryData)

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
        <Typography variant='h5'>Edit Category</Typography>
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
          <EditProductImage control={control} index={0} name='images' />
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
                label='Price per Machine/Tool (GH₵)'
                placeholder='Enter Price Per Machine/Tool...'
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
                label='USD Rate '
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
              {isSubmitting ? 'Updating...' : 'Update Category'}
            </Button>
            <Button 
              variant='outlined' 
              color='error' 
              onClick={handleReset}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </Drawer>
  )
}

export default EditCategoryDrawer