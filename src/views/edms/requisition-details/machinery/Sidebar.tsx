'use client'

// React Imports
import { useState } from 'react'
import type { ChangeEvent, SyntheticEvent } from 'react'

// MUI Imports
import { styled } from '@mui/material/styles'
import MuiAccordion from '@mui/material/Accordion'
import MuiAccordionSummary from '@mui/material/AccordionSummary'
import MuiAccordionDetails from '@mui/material/AccordionDetails'
import Typography from '@mui/material/Typography'
import Checkbox from '@mui/material/Checkbox'
import Button  from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import ListItem from '@mui/material/ListItem'
import List from '@mui/material/List'
import ListItemIcon from '@mui/material/ListItemIcon'
import type { AccordionProps } from '@mui/material/Accordion'
import type { AccordionSummaryProps } from '@mui/material/AccordionSummary'
import type { AccordionDetailsProps } from '@mui/material/AccordionDetails'
import { useParams, useRouter } from 'next/navigation'

// Type Imports
import type { CourseContent } from '@/types/apps/academyTypes'
import { InventoryListType } from '@/types/apps/ecommerceTypes'
import { formatDate, formatTime } from '@/utils/dateAndCurrency'

type ItemsType = {
  title: string
  time: string
  isCompleted: boolean
}[]

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

const Sidebar = ({ content }: { content?: InventoryListType }) => {
  // States
  const router = useRouter()
  const [expanded, setExpanded] = useState<number | false>(0)

  console.log(content)

  const handleChange = (panel: number) => (event: SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false)
  }


  return (
    <>
      <Accordion expanded={expanded === 0} onChange={handleChange(0)}>
        <AccordionSummary
          id='customized-panel-header-1'
          expandIcon={<i className='ri-arrow-right-s-line text-textSecondary' />}
          aria-controls={'sd'}
        >
          <div>
            <Typography variant='h5'>Product Metadata</Typography>
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
          </List>
        </AccordionDetails>
      </Accordion>
    </>
  )
}

export default Sidebar
