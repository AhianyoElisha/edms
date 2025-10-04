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

import { updateSalesCategoryInDB } from '@/libs/actions/sales.actions'

// Types Import
import { SalesCategoryType } from '@/types/apps/ecommerceTypes'

type Props = {
  open: boolean
  handleClose: () => void
  categoryData: SalesCategoryType
  onSuccess?: () => Promise<void>
}

const formSchema = z.object({
  categoryTitle: z.string().min(1, { message: "Category title is required" }),
  description: z.string().min(1, { message: "Description is required" }),
})

const EditCategoryDrawer = (props: Props) => {
  const { open, handleClose, categoryData, onSuccess } = props
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)


const {
  control,
  handleSubmit,
  reset: resetForm,
  formState: { errors }
} = useForm<SalesCategoryType>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    categoryTitle: categoryData?.categoryTitle || '',
    description: categoryData?.description || '',
}
})

  // Initialize form with category data when drawer opens
  useEffect(() => {
    if (open && categoryData) {
      resetForm({
        categoryTitle: categoryData?.categoryTitle,
        description: categoryData?.description,
})
    }
  }, [open, categoryData, resetForm])

  const onSubmit = async (data: SalesCategoryType) => {
    console.log(data)
    try {
      setIsSubmitting(true)
      setError(null)
      
      const res = await updateSalesCategoryInDB({
        ...data,
        id: categoryData.$id // Make sure to include the category ID for update
      })
      
      if (!res) {
        throw new Error('Failed to update sales category')
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