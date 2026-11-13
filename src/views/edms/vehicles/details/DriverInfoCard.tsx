'use client'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'

// Util Imports
import { getInitials } from '@/utils/getInitials'

const DriverInfoCard = ({ vehicleData, onChangeDriver }: { vehicleData?: any; onChangeDriver?: () => void }) => {
  // Driver can be a relationship object or just an ID string
  const driver = typeof vehicleData?.driver === 'object' && vehicleData?.driver !== null 
    ? vehicleData.driver 
    : null

  if (!driver) {
    return (
      <Card>
        <CardContent className='flex flex-col gap-4'>
          <Typography variant='h6'>Assigned Driver</Typography>
          <div className='flex flex-col items-center gap-3 py-6'>
            <CustomAvatar skin='light' color='secondary' size={60}>
              <i className='ri-user-add-line text-[32px]' />
            </CustomAvatar>
            <Typography color='text.secondary' className='text-center'>
              No driver assigned to this vehicle
            </Typography>
            {onChangeDriver && (
              <Button variant='outlined' size='small' onClick={onChangeDriver} startIcon={<i className='ri-user-add-line' />}>
                Assign driver
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className='flex flex-col gap-4'>
        <div className='flex items-center justify-between gap-2'>
          <Typography variant='h6'>Assigned Driver</Typography>
          {onChangeDriver && (
            <Button variant='text' size='small' onClick={onChangeDriver} startIcon={<i className='ri-user-shared-line' />}>
              Change driver
            </Button>
          )}
        </div>

        {driver.status === 'deleted' && (
          <Alert severity='warning'>
            This driver has been removed from the system. Assign the person who drives this vehicle now.
          </Alert>
        )}

        <div className='flex items-center gap-3'>
          {driver.avatar ? (
            <Avatar src={driver.avatar} sx={{ width: 48, height: 48 }} />
          ) : (
            <CustomAvatar skin='light' color='primary' size={48}>
              {getInitials(driver.name || 'D')}
            </CustomAvatar>
          )}
          <div className='flex flex-col'>
            <Typography color='text.primary' className='font-medium'>
              {driver.name || 'Unknown'}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {driver.email || 'No email'}
            </Typography>
          </div>
        </div>

        <Divider />

        <div className='flex flex-col gap-3'>
          {driver.phone && (
            <div className='flex justify-between items-center'>
              <Typography color='text.secondary'>Phone</Typography>
              <Typography className='font-medium'>{driver.phone}</Typography>
            </div>
          )}
          <div className='flex justify-between items-center'>
            <Typography color='text.secondary'>Status</Typography>
            <Chip
              variant='tonal'
              label={driver.status?.charAt(0).toUpperCase() + driver.status?.slice(1) || 'Active'}
              size='small'
              color={driver.status === 'active' ? 'success' : driver.status === 'suspended' ? 'error' : 'warning'}
            />
          </div>
          {driver.role && (
            <div className='flex justify-between items-center'>
              <Typography color='text.secondary'>Role</Typography>
              <Chip
                variant='tonal'
                label={typeof driver.role === 'object' ? driver.role.name : 'Driver'}
                size='small'
                color='info'
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default DriverInfoCard
