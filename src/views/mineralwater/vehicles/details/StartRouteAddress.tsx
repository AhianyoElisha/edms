// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import type { TypographyProps } from '@mui/material/Typography'

// Type Imports
import type { ThemeColor } from '@core/types'

// Component Imports
import AddEditStartRouteDialog from '@components/dialogs/add-edit-start-route-dialog'
import OpenDialogOnElementClick from '@components/dialogs/OpenDialogOnElementClick'

const StartRouteAddress = ({ vehicleData, onUpdate }: { vehicleData?: any, onUpdate?: () => void }) => {
  // Vars
  const typographyProps = (children: string, color: ThemeColor, className: string): TypographyProps => ({
    children,
    color,
    className
  })

  const startData = {
    vehicleId: vehicleData?.$id,
    vehicleType: vehicleData?.vehicleType || '',
    vehicleNumber: vehicleData?.vehicleNumber || '',
    starttown: vehicleData?.starttown || '',
    startcity: vehicleData?.startcity || '',
    startcountry: vehicleData?.startcountry || ''
  }

  return (
    <Card>
      <CardContent className='flex flex-col gap-6'>
        <div className='flex flex-col gap-1'>
          <div className='flex justify-between items-center'>
            <Typography variant='h5'>Start Route</Typography>
            <OpenDialogOnElementClick
              element={Typography}
              elementProps={typographyProps('Edit', 'primary', 'cursor-pointer font-medium')}
              dialog={AddEditStartRouteDialog}
              dialogProps={{ data: startData, onUpdate }}
            />
          </div>
          <div className='flex flex-col'>
            <div className='flex flex-row justify-between'>
            <Typography className='font-medium'>Start Town:</Typography>
            <Typography className='font-medium'>{vehicleData?.starttown || 'Not specified'}</Typography>
            </div>
            <div className='flex flex-row justify-between'>
            <Typography className='font-medium'>Start City:</Typography>
            <Typography className='font-medium'>{vehicleData?.startcity || 'Not specified'}</Typography>
            </div>
            <div className='flex flex-row justify-between'>
            <Typography className='font-medium'>Start Country:</Typography>
            <Typography className='font-medium'>{vehicleData?.startcountry || 'Not specified'}</Typography>
            </div>
          </div>
        </div>
        <div className='flex flex-col items-start gap-1'>
          <Typography variant='h6' color='text.primary'>Vehicle Type</Typography>
          <Typography className='capitalize'>{vehicleData?.vehicleType || 'Unknown'}</Typography>
        </div>
      </CardContent>
    </Card>
  )
}

export default StartRouteAddress
      