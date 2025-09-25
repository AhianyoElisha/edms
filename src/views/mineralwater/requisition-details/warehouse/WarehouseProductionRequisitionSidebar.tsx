'use client'

// React Imports
import { useCallback, useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import type { ChangeEvent, SyntheticEvent } from 'react'

// MUI Imports
import MuiAccordion from '@mui/material/Accordion'
import MuiAccordionSummary from '@mui/material/AccordionSummary'
import MuiAccordionDetails from '@mui/material/AccordionDetails'
import Button  from '@mui/material/Button'
import ListItem from '@mui/material/ListItem'
import List from '@mui/material/List'
import type { AccordionProps } from '@mui/material/Accordion'
import type { AccordionSummaryProps } from '@mui/material/AccordionSummary'
import type { AccordionDetailsProps } from '@mui/material/AccordionDetails'
import { useParams, useRouter } from 'next/navigation'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { addRequisitionHistory } from '@/libs/actions/warehouse.actions'
import { CategoryType, ProductionCategoryType, RequisitionHistory } from '@/types/apps/ecommerceTypes'
import { Alert, Divider, styled } from '@mui/material'
import { toast } from 'react-toastify'
import { useAuth } from '@/contexts/AppwriteProvider'




// Type Imports
import { formatDate, formatTime } from '@/utils/dateAndCurrency'
import { approveProductionRequisition, denyProductionRequisition, makeProductionRequisition } from '@/libs/actions/warehouse.actions'

type ItemsType = {
  title: string
  time: string
  isCompleted: boolean
}[]

type Props = {
  open: boolean
  handleClose: () => void
  setData: (data: CategoryType[]) => void
  onSuccess?: () => Promise<void>

}


const formSchema = z.object({
  noOfBoxes: z.number().min(1, { message: "Number of Packages is required" }),
  requisitionType: z.string(),
  category: z.string()
})


// Styled component for Accordion component
export const Accordion = styled(MuiAccordion)<AccordionProps>({
  boxShadow: 'none !important',
  border: '1px solid var(--mui-palette-divider) !important',
  borderRadius: '0 !important',
  overflow: 'hidden',
  background: 'none',
  '&:not(:last-of-type)': {
    borderBottom: '0 !important'
  },
  '&:before': {
    display: 'none'
  },
  '&.Mui-expanded': {
    margin: 'auto'
  },
  '&:first-of-type': {
    borderTopLeftRadius: 'var(--mui-shape-borderRadius) !important',
    borderTopRightRadius: 'var(--mui-shape-borderRadius) !important'
  },
  '&:last-of-type': {
    borderBottomLeftRadius: 'var(--mui-shape-borderRadius) !important',
    borderBottomRightRadius: 'var(--mui-shape-borderRadius) !important'
  }
})

// Styled component for AccordionSummary component
export const AccordionSummary = styled(MuiAccordionSummary)<AccordionSummaryProps>(({ theme }) => ({
  marginBottom: -1,
  padding: theme.spacing(3, 5),
  transition: 'min-height 0.15s ease-in-out',
  backgroundColor: 'var(--mui-palette-action-hover)',
  borderBottom: '1px solid var(--mui-palette-divider) !important',
  '&.Mui-expanded': {
    '& .MuiAccordionSummary-expandIconWrapper': {
      transform: 'rotate(90deg)'
    }
  },
  '& .MuiAccordionSummary-expandIconWrapper': {
    transform: theme.direction === 'rtl' && 'rotate(180deg)'
  },
  '& .MuiAccordionSummary-content.Mui-expanded': {
    margin: '12px 0'
  }
}))

// Styled component for AccordionDetails component
export const AccordionDetails = styled(MuiAccordionDetails)<AccordionDetailsProps>(({ theme }) => ({
  padding: `${theme.spacing(4)} ${theme.spacing(3)} !important`,
  backgroundColor: 'var(--mui-palette-background-paper)'
}))

const ProductionSidebar = ({ content }: { content?: ProductionCategoryType }) => {
  // States
  const [expanded, setExpanded] = useState<number | false>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const user = useAuth()
  const router = useRouter()

if (!content) throw new Error('No Category content available')
  const handleChange = (panel: number) => (event: SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false)
  }

const {
    control,
    handleSubmit,
    reset: resetForm,
    formState: { errors }
  } = useForm<RequisitionHistory>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      noOfBoxes: 0,
      requisitionist: user?.user?.$id,
      description: content?.description,
      requisitionType: 'production',
      category: content?.title
    }
  })


    const onSubmit = async (data: RequisitionHistory) => {
    try {
      setIsSubmitting(true)
      setError(null)

      // First, validate if content exists
      if (!data || !content) {
        throw new Error('No production content available')
      }

      if (data.noOfBoxes > content.totalProducts!) {
        throw new Error('Cannot exceed available products limit')
      }
      console.log(data)
      
      // Make store requisition
      const requisitionResult = await makeProductionRequisition(content.$id, data.noOfBoxes)
      
      if (!requisitionResult) {
        throw new Error('Failed to make production requisition')
      }
      
      // Add requisition history
      const history = await addRequisitionHistory({
        ...data,
        requisitionist: user.user.$id,
        category: content.title,
        requisitionType: 'production',
        requisitionEvent: 'requested',
        description: content.description
      })
      
      if (!history) {
        throw new Error('Failed to create requisition history')
      }
      
      toast.success('Requisition sent successfully')
      handleReset()
      router.back()
      
    } catch (error) {
      console.error('Error in requisition:', error)
      setError(error instanceof Error ? error.message : 'Failed to process requisition')
      toast.error(error instanceof Error ? error.message : 'Failed to process requisition')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = useCallback(() => {
    resetForm({
      noOfBoxes: 0,
      description: '',
      requisitionType: 'production',
      // @ts-ignore
      category: content?.category?.categoryTitle || ''
    })
    // @ts-ignore
  }, [resetForm, user?.user?.accountId, content?.categoryTitle])


  return (
    <>
      <Accordion expanded={expanded === 0} onChange={handleChange(0)}>
        <AccordionSummary
          id='customized-panel-header-1'
          expandIcon={<i className='ri-arrow-right-s-line text-textSecondary' />}
          aria-controls={'sd'}
        >
          <div>
            <Typography variant='h5'>Category Metadata And Requisition</Typography>
          </div>
        </AccordionSummary>
        <AccordionDetails>
          <List role='list' component='div' className='flex flex-col gap-4 plb-0'>
            <ListItem role='listitem' className='gap-3 p-0'>
              <div>
                <Typography className='font-medium !text-textPrimary'>Date Created</Typography>
                  <Typography variant='body2'>{ formatDate(content?.$createdAt ?? '') }</Typography>
              </div>
            </ListItem>
            <ListItem role='listitem' className='gap-3 p-0'>
              <div>
                <Typography className='font-medium !text-textPrimary'>Time Created</Typography>
                  <Typography variant='body2'>{ formatTime(content?.$updatedAt ?? '') }</Typography>
              </div>
            </ListItem>
            <Divider/>
            <ListItem role='listitem' className='gap-3 p-0'>
              <div>
                <Typography className='font-medium !text-textPrimary'>Date Updated</Typography>
                  <Typography variant='body2'>{ formatDate(content?.$createdAt ?? '') }</Typography>
              </div>
            </ListItem>
            <ListItem role='listitem' className='gap-3 p-0'>
              <div>
                <Typography className='font-medium !text-textPrimary'>Time Updated</Typography>
                  <Typography variant='body2'>{ formatTime(content?.$updatedAt ?? '') }</Typography>
              </div>
            </ListItem>
            <Divider/>
            <ListItem role='listitem' className='p-0'>
              <div className='flex flex-col gap-2'>
                <Typography className='italic'>Package Requisition Available</Typography>
              <div>
                <Typography className='font-medium !text-textPrimary'>Available Products</Typography>
                  <Typography variant='body1'>{ content?.totalProducts ?? 0 }</Typography>
              </div>
              <div>
                <Typography className='font-medium !text-textPrimary'>Packages Requested</Typography>
                  <Typography variant='body1'>{ content?.requisitionRequest ?? 0 }</Typography>
              </div>
              </div>
            </ListItem>
            {
              content?.requisitionRequest! > 0 && user?.user?.role?.name === 'admin' && (
            <ListItem role='listitem' className='gap-3 p-0'>
              <div className='flex gap-8'>
                    <Button variant='contained' className='max-sm:is-full bg-success' onClick={() => {
                      try {
                        // approveProductionRequisition(content.$id, user.user.$id);
                        toast.success('Requisition approved successfully')
                        router.back()

                      } catch (error) {
                        console.error('Error in approval:', error)
                        toast.error('Failed to approve requisition')
                      }
                    }} startIcon={<i className='ri-checkbox-circle-line' />}>
                  Approve
                </Button>
                    <Button variant='contained' className='max-sm:is-full bg-error' onClick={() => {
                      try {
                        // denyProductionRequisition(content.$id, user.user.$id);
                        toast.success('Requisition approved successfully')
                        router.back()

                      } catch (error) {
                        console.error('Error in approval:', error)
                        toast.error('Failed to approve requisition')
                      }
                    }} startIcon={<i className='ri-close-circle-line' />}>
                  Reject
                </Button>
              </div>
            </ListItem>
              )
            }

            
            {
              content?.status === 'available' && user?.user?.role?.name !== 'admin' ||
              content?.status === 'available' && user?.user?.role?.name === 'admin' &&
              content?.requisitionRequest! == 0 && (
            <ListItem role='listitem' className='gap-3 p-0'>
              <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-5 w-full'>
                <Controller
                  name='noOfBoxes'
                  control={control}
                  render={({ field: { onChange, value, ...field } }) => (
                    <TextField
                      {...field}
                      value={value || ''}
                      onChange={(e) => onChange(Number(e.target.value))}
                      fullWidth
                      type='tel'
                      label='Number of Packages/Boxes'
                      placeholder='Enter number of Per Boxes/Packages...'
                      error={!!errors.noOfBoxes}
                      helperText={errors.noOfBoxes?.message}
                    />
                  )}
                />
                
                <div className='flex items-center gap-4'>
                  <Button 
                    variant='contained' 
                    className='bg-success'
                    type='submit'
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Loading...' : 'Make a requisition'}
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
            </ListItem>
              )
            }
          </List>
        </AccordionDetails>
      </Accordion>
    </>
  )
}

export default ProductionSidebar
