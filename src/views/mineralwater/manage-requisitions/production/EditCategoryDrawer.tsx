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

// Actions Import

// Types Import
import { ProductionCategoryType, ImageType, StoreRequisition } from '@/types/apps/ecommerceTypes'
import { updateProductionCategoryInDB } from '@/libs/actions/production.actions'
import HorizontalWithBorder from './HorizontalWithBorder'

type Props = {
  open: boolean
  handleClose: () => void
  requisitionData: StoreRequisition
  onSuccess: () => Promise<void>
}

const formSchema = z.object({
  noOfBoxes: z.coerce.number().min(1, { message: "Quantity per package is required" }),
})

const EditCategoryDrawer = (props: Props) => {
  const { open, handleClose, requisitionData, onSuccess } = props
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // const categoryImages = parseValue(requisitionData?.images as unknown as string)

const {
  control,
  handleSubmit,
  reset: resetForm,
  formState: { errors }
} = useForm<ProductionCategoryType>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    // @ts-ignore
    noOfBoxes: requisitionData?.noOfBoxes || 0,
  }
})

  // Initialize form with category data when drawer opens
  useEffect(() => {
    if (open && requisitionData) {
      resetForm({
        // @ts-ignore
        noOfBoxes: requisitionData?.noOfBoxes || 0,
      })
    }
  }, [open, requisitionData, resetForm])

  const onSubmit = async (data: ProductionCategoryType) => {
    console.log(data)
    try {
      setIsSubmitting(true)
      setError(null)
      
      const res = await updateProductionCategoryInDB({
        ...data,
        id: requisitionData.$id! // Make sure to include the category ID for update
      })
      
      if (!res) {
        throw new Error('Failed to update inventory category')
      }
      
      toast.success('Category updated successfully')
      
      await onSuccess()
      // Clear form and close drawer
      handleReset()
      
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

  console.log(requisitionData?.$id)

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
      <div className=' flex flex-col p-5 gap-10'>
        <HorizontalWithBorder {...requisitionData} />
        <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-5'>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}


          <Controller
            // @ts-ignore
            name='noOfBoxes'
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type='tel'
                label='Quantity per Box/Package'
                placeholder='Enter quantity per box or package...'
                error={!!errors.qtyPerPackage}
                helperText={errors.qtyPerPackage?.message}
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