// MUI Imports
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import type { ButtonProps } from '@mui/material/Button'

// Type Imports
import type { ThemeColor } from '@core/types'

// Component Imports
import ConfirmationDialog from '@components/dialogs/confirmation-dialog'
import OpenDialogOnElementClick from '@components/dialogs/OpenDialogOnElementClick'

type StatusChipColorType = {
  color: ThemeColor
}

export const statusChipColor: { [key: string]: StatusChipColorType } = {
  active: { color: 'success' },
  inactive: { color: 'error' },
  maintenance: { color: 'warning' }
}

const VehicleDetailHeader = ({ vehicleData, vehicleId }: { vehicleData?: any; vehicleId: string }) => {
  // Vars
  const buttonProps = (children: string, color: ThemeColor, variant: ButtonProps['variant']): ButtonProps => ({
    children,
    color,
    variant
  })

  return (
    <div className='flex flex-wrap justify-between sm:items-center max-sm:flex-col gap-y-4'>
      <div className='flex flex-col items-start gap-1'>
        <div className='flex items-center gap-2'>
          <Typography variant='h5'>{`Vehicle: ${vehicleData?.vehicleNumber || vehicleId}`}</Typography>
          <Chip
            variant='tonal'
            label={vehicleData?.status || 'active'}
            color={statusChipColor[vehicleData?.status || 'active'].color}
            size='small'
          />
          <Chip
            variant='tonal'
            label={vehicleData?.vehicleType || 'Unknown'}
            color='primary'
            size='small'
          />
        </div>
        <Typography>{`Created: ${new Date(vehicleData?.$createdAt || '').toDateString()}`}</Typography>
        <Typography color='text.secondary'>
          Route: {vehicleData?.starttown}, {vehicleData?.startcity} → {vehicleData?.endtown}, {vehicleData?.endcity}
        </Typography>
      </div>
      <OpenDialogOnElementClick
        element={Button}
        elementProps={buttonProps('Delete Vehicle', 'error', 'outlined')}
        dialog={ConfirmationDialog}
        dialogProps={{ type: 'delete-vehicle' }}
      />
    </div>
  )
}

export default VehicleDetailHeader
