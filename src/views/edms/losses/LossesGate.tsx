'use client'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'

// Component Imports
import LossSheet from './LossSheet'
import DriverLedger from './DriverLedger'

// Hook Imports
import { useLossAccess } from './lossAccess'

const NoAccess = () => (
  <Card>
    <CardContent className='flex flex-col items-center gap-2 py-12'>
      <i className='ri-lock-line text-6xl text-error' />
      <Typography variant='h5'>You can&apos;t see this loss sheet</Typography>
      <Typography variant='body2' color='text.secondary' className='text-center'>
        Drivers can see their own losses. Contact the office if you think this is wrong.
      </Typography>
    </CardContent>
  </Card>
)

/**
 * Decides what a visitor to the loss sheet sees: office staff get every driver
 * (or the one asked for); a driver only ever gets their own.
 */
const LossesGate = ({ driverId }: { driverId?: string }) => {
  const { isLoading, isDriver, canViewSheet, userId } = useLossAccess()

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[300px]'>
        <CircularProgress />
      </div>
    )
  }

  if (isDriver) {
    if (!userId || (driverId && driverId !== userId)) return <NoAccess />

    return <DriverLedger driverId={userId} />
  }

  if (!canViewSheet) return <NoAccess />

  return driverId ? <DriverLedger driverId={driverId} /> : <LossSheet />
}

export default LossesGate
