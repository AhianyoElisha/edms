// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import type { TypographyProps } from '@mui/material/Typography'

// Type Imports
import type { ThemeColor } from '@core/types'

// Component Imports
import AddEditEndRouteDialog from '@components/dialogs/add-edit-end-route-dialog'
import OpenDialogOnElementClick from '@components/dialogs/OpenDialogOnElementClick'

const EndRouteAddress = ({ vehicleData, onUpdate }: { vehicleData?: any, onUpdate?: () => void }) => {
  // Vars
  const typographyProps = (children: string, color: ThemeColor, className: string): TypographyProps => ({
    children,
    color,
    className
  })

  const endData = {
    vehicleId: vehicleData?.$id,
    endtown: vehicleData?.endtown || '',
    endcity: vehicleData?.endcity || '',
    endcountry: vehicleData?.endcountry || '',
    status: vehicleData?.status || 'active'
  }

  return (
    <Card>
      <CardContent className='flex flex-col gap-6'>
        <div className='flex justify-between items-center'>
          <Typography variant='h5'>End Route</Typography>
          <OpenDialogOnElementClick
            element={Typography}
            elementProps={typographyProps('Edit', 'primary', 'cursor-pointer font-medium')}
            dialog={AddEditEndRouteDialog}
            dialogProps={{ data: endData, onUpdate }}
          />
        </div>
        <div className='flex flex-col'>
          <div className='flex flex-row justify-between'>
          <Typography className='font-medium'>End Town:</Typography>
          <Typography className='font-medium'> {vehicleData?.endtown || 'Not specified'}</Typography>
          </div>
          <div className='flex flex-row justify-between'>
            <Typography className='font-medium'>End City:</Typography>
          <Typography className='font-medium'>{vehicleData?.endcity || 'Not specified'}</Typography>
          </div>
          <div className='flex flex-row justify-between'>
          <Typography className='font-medium'>End Country:</Typography>
          <Typography className='font-medium'>{vehicleData?.endcountry || 'Not specified'}</Typography>
          </div>
        </div>
        <div className='mt-4'>
          <Typography variant='h6' color='text.primary' className='mb-2'>Status</Typography>
          <Typography 
            className='capitalize'
            color={vehicleData?.status === 'active' ? 'success.main' : 'error.main'}
          >
            {vehicleData?.status || 'Unknown'}
          </Typography>
        </div>
      </CardContent>
    </Card>
  )
}

export default EndRouteAddress