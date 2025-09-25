'use client'

// MUI Imports
import MuiCard from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { styled } from '@mui/material/styles'
import type { CardProps } from '@mui/material/Card'

// Types Imports
import type { ThemeColor } from '@core/types'
import type { CardStatsHorizontalWithBorderProps } from '@/types/pages/widgetTypes'

//Component Imports
import CustomAvatar from '@core/components/mui/Avatar'
import { StoreRequisition } from '@/types/apps/ecommerceTypes'
import { Chip } from '@mui/material'

type Props = CardProps & {
  color: ThemeColor
}

const Card = styled(MuiCard)<Props>(({ color }) => ({
  transition: 'border 0.3s ease-in-out, box-shadow 0.3s ease-in-out, margin 0.3s ease-in-out',
  borderBottomWidth: '2px',
  borderBottomColor: `var(--mui-palette-${color}-darkerOpacity)`,
  '[data-skin="bordered"] &:hover': {
    boxShadow: 'none'
  },
  '&:hover': {
    borderBottomWidth: '3px',
    borderBottomColor: `var(--mui-palette-${color}-main) !important`,
    boxShadow: 'var(--mui-customShadows-xl)',
    marginBlockEnd: '-1px'
  }
}))

const HorizontalWithBorder = (props: StoreRequisition) => {
  // Props
  const { category, requisitionist, requisitionEvent } = props

  return (
    <Card color={'primary'}>
      <CardContent className='flex flex-col gap-6'>
        <div className='flex items-center gap-4'>
          <CustomAvatar color={'primary'} skin='light' variant='rounded'>
            <i className={'ri-instance-line'} />
          </CustomAvatar>
          <Typography variant='h4'>{category?.categoryTitle}</Typography>
        </div>
        <div className='flex flex-col gap-5'>
          <Typography color='text.primary'>{
            // @ts-ignore
            `Created by: ${requisitionist?.name
            }`}</Typography>
          <div className='flex items-center gap-2'>
            <Chip
              label={requisitionEvent?.toString().charAt(0).toUpperCase() + requisitionEvent?.toString().slice(1)}
              variant='tonal'
              color={requisitionEvent === 'pending' ? 'warning' : 'info'}
              size='small'
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default HorizontalWithBorder
