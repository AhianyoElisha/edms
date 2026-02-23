'use client'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Box from '@mui/material/Box'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'

const VehicleInfoCard = ({ vehicleData }: { vehicleData?: any }) => {
  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'truck': return 'ri-truck-line'
      case 'van': return 'ri-car-line'
      case 'bike': return 'ri-e-bike-2-line'
      case 'car': return 'ri-car-fill'
      default: return 'ri-truck-line'
    }
  }

  return (
    <Card>
      <CardContent className='flex flex-col gap-6'>
        <div className='flex items-center gap-4'>
          <CustomAvatar skin='light' color='primary' size={56}>
            <i className={`${getVehicleIcon(vehicleData?.vehicleType)} text-[28px]`} />
          </CustomAvatar>
          <div className='flex flex-col'>
            <Typography variant='h5'>{vehicleData?.vehicleNumber || 'N/A'}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {vehicleData?.vehicleType?.charAt(0).toUpperCase() + vehicleData?.vehicleType?.slice(1) || 'Unknown Type'}
            </Typography>
          </div>
        </div>

        <Divider />

        <Typography variant='h6'>Vehicle Details</Typography>

        <div className='flex flex-col gap-3'>
          <div className='flex justify-between items-center'>
            <Typography color='text.secondary'>Brand</Typography>
            <Typography className='font-medium'>{vehicleData?.brand || 'N/A'}</Typography>
          </div>
          <div className='flex justify-between items-center'>
            <Typography color='text.secondary'>Model</Typography>
            <Typography className='font-medium'>{vehicleData?.model || 'N/A'}</Typography>
          </div>
          <div className='flex justify-between items-center'>
            <Typography color='text.secondary'>Year</Typography>
            <Typography className='font-medium'>{vehicleData?.year || 'N/A'}</Typography>
          </div>
          {vehicleData?.cbmVolume && (
            <div className='flex justify-between items-center'>
              <Typography color='text.secondary'>CBM Volume</Typography>
              <Typography className='font-medium'>{vehicleData.cbmVolume} CBM</Typography>
            </div>
          )}
          <div className='flex justify-between items-center'>
            <Typography color='text.secondary'>Status</Typography>
            <Chip
              variant='tonal'
              label={vehicleData?.status?.charAt(0).toUpperCase() + vehicleData?.status?.slice(1) || 'Unknown'}
              size='small'
              color={
                vehicleData?.status === 'active' ? 'success' :
                vehicleData?.status === 'maintenance' ? 'warning' :
                'error'
              }
            />
          </div>
        </div>

        <Divider />

        <Typography variant='h6'>Ownership</Typography>

        <div className='flex flex-col gap-3'>
          <div className='flex justify-between items-center'>
            <Typography color='text.secondary'>Ownership Type</Typography>
            <Chip
              variant='tonal'
              label={vehicleData?.ownership === 'owned' ? 'Owned' : 'Rented'}
              size='small'
              color={vehicleData?.ownership === 'owned' ? 'success' : 'warning'}
              icon={vehicleData?.ownership === 'owned' ?
                <i className='ri-check-line' /> :
                <i className='ri-exchange-line' />
              }
            />
          </div>
          {vehicleData?.ownership === 'rented' && vehicleData?.monthlyRentalCost > 0 && (
            <div className='flex justify-between items-center'>
              <Typography color='text.secondary'>Monthly Rental Cost</Typography>
              <Typography className='font-medium'>GHS {vehicleData.monthlyRentalCost?.toLocaleString()}</Typography>
            </div>
          )}
        </div>

        <Divider />

        <Box className='flex flex-col gap-2'>
          <div className='flex justify-between items-center'>
            <Typography color='text.secondary' variant='body2'>Created</Typography>
            <Typography variant='body2'>
              {vehicleData?.$createdAt ? new Date(vehicleData.$createdAt).toLocaleDateString() : 'N/A'}
            </Typography>
          </div>
          <div className='flex justify-between items-center'>
            <Typography color='text.secondary' variant='body2'>Last Updated</Typography>
            <Typography variant='body2'>
              {vehicleData?.$updatedAt ? new Date(vehicleData.$updatedAt).toLocaleDateString() : 'N/A'}
            </Typography>
          </div>
        </Box>
      </CardContent>
    </Card>
  )
}

export default VehicleInfoCard
