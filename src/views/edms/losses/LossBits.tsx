'use client'

// MUI Imports
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

// Action Imports
import { needsPrice } from '@/libs/actions/driverloss.actions'

// Type Imports
import type { DriverLossType } from '@/types/apps/deliveryTypes'

// Util Imports
import { formatPrice } from '@/utils/dateAndCurrency'

const STATUS: Record<string, { label: string; color: 'error' | 'success' | 'secondary' }> = {
  owed: { label: 'Owed', color: 'error' },
  found: { label: 'Found', color: 'success' },
  waived: { label: 'Written off', color: 'secondary' }
}

export const lossStatusLabel = (status: string) => STATUS[status]?.label || status

export const LossStatusChip = ({ loss }: { loss: DriverLossType }) => {
  const status = STATUS[loss.status] || { label: loss.status, color: 'secondary' as const }

  return <Chip size='small' variant='tonal' color={status.color} label={status.label} />
}

/** The item's price, "Price needed" when owed and unpriced, struck through once it no longer counts. */
export const LossValue = ({ loss }: { loss: DriverLossType }) => {
  if (needsPrice(loss)) return <Chip size='small' variant='outlined' color='warning' label='Price needed' />

  if (loss.value === null || loss.value === undefined) {
    return (
      <Typography variant='body2' color='text.secondary'>
        —
      </Typography>
    )
  }

  return (
    <Typography variant='body2' className={loss.status === 'owed' ? 'font-medium' : 'line-through'} color={loss.status === 'owed' ? 'text.primary' : 'text.secondary'}>
      {formatPrice(Number(loss.value))}
    </Typography>
  )
}
