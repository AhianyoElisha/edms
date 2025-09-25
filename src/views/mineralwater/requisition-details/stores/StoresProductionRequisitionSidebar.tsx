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
import Chip from '@mui/material/Chip'
import ListItem from '@mui/material/ListItem'
import List from '@mui/material/List'
import type { AccordionProps } from '@mui/material/Accordion'
import type { AccordionSummaryProps } from '@mui/material/AccordionSummary'
import type { AccordionDetailsProps } from '@mui/material/AccordionDetails'
import { useParams, useRouter } from 'next/navigation'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { addRequisitionHistory, approveStoreRequisition, denyStoreRequisition, saveInventoryCategoryToDB } from '@/libs/actions/stores.actions'
import { CategoryType, RequisitionHistory } from '@/types/apps/ecommerceTypes'
import { Alert, Divider, styled } from '@mui/material'
import { toast } from 'react-toastify'
import { useAuth } from '@/contexts/AppwriteProvider'




// Type Imports
import { formatDate, formatTime } from '@/utils/dateAndCurrency'
import { makeStoreRequisition } from '@/libs/actions/stores.actions'

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

const ProductionSidebar = ({ content }: { content?: CategoryType }) => {
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
      // @ts-ignore
      description: content?.description,
      requisitionType: 'stores',
      // @ts-ignore
      category: content?.categoryTitle
    }
  })

  const handleReset = useCallback(() => {
    resetForm({
      noOfBoxes: 0,
      description: '',
      requisitionType: 'stores',
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
            <ListItem role='listitem' className='gap-1 p-0'>
              <div className='flex gap-4'>
                    <Button variant='contained' className='max-sm:is-full bg-success' onClick={() => {
                      try {
                        // approveStoreRequisition(content.$id, user.user.$id);
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
                    // denyStoreRequisition(content.$id, user.user.$id);
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
          </List>
        </AccordionDetails>
      </Accordion>
    </>
  )
}

export default ProductionSidebar
