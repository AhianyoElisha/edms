'use client'

// Next Imports
import Link from 'next/link'

// MUI Imports
import Typography from '@mui/material/Typography'

// Util Imports
import { tripSubtitle } from '@/utils/tripLabel'

interface TripTitleProps {
  /** The trip, with its route and vehicle expanded or flattened (see utils/tripLabel) */
  trip: any

  /** Link the trip number to the trip's page */
  link?: boolean

  /** Shown when the trip has no number */
  fallback?: string

  /** The number's typography (defaults to a medium-weight body2) */
  variant?: 'body1' | 'body2' | 'subtitle1' | 'subtitle2' | 'h6'
  className?: string
}

/**
 * A trip number with what identifies the trip beneath it: its route and vehicle.
 * Use it wherever a trip number is shown, so no trip is ever just "TRP-261126-0013".
 */
const TripTitle = ({ trip, link = false, fallback = 'Trip', variant = 'body2', className }: TripTitleProps) => {
  const number = trip?.tripNumber || fallback
  const subtitle = tripSubtitle(trip)
  const id = trip?.$id

  return (
    <div className={className}>
      {link && id ? (
        <Typography component={Link} href={`/edms/trips/${id}`} variant={variant} color='primary' className='font-medium'>
          {number}
        </Typography>
      ) : (
        <Typography variant={variant} className='font-medium'>
          {number}
        </Typography>
      )}
      {subtitle && (
        <Typography variant='caption' color='text.secondary' component='div' className='leading-tight'>
          {subtitle}
        </Typography>
      )}
    </div>
  )
}

export default TripTitle
