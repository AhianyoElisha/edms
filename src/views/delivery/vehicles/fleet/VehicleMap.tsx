'use client'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Chip from '@mui/material/Chip'

// Type Imports
import { VehicleType } from '@/types/apps/deliveryTypes'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'

interface VehicleMapProps {
  vehicles: VehicleType[]
  selectedVehicle?: VehicleType
  onVehicleSelect: (vehicleId: string) => void
}

const VehicleMap = ({ vehicles, selectedVehicle, onVehicleSelect }: VehicleMapProps) => {
  // Group vehicles by status since location isn't in the schema
  const vehiclesByStatus = vehicles.reduce((acc, vehicle) => {
    const status = vehicle.status || 'Unknown Status'
    if (!acc[status]) {
      acc[status] = []
    }
    acc[status].push(vehicle)
    return acc
  }, {} as Record<string, VehicleType[]>)

  return (
    <div className='h-full'>
      <Alert severity='info' className='mb-4'>
        <Typography variant='body2'>
          Map integration is coming soon. For now, you can view vehicles grouped by location.
        </Typography>
      </Alert>

      <Grid container spacing={4}>
        {/* Map Placeholder */}
        <Grid item xs={12} md={8}>
          <Card className='h-96'>
            <CardHeader title='Vehicle Locations Map' />
            <CardContent className='h-full flex items-center justify-center'>
              <div className='text-center'>
                <div className='w-32 h-32 mx-auto mb-4 bg-primary/10 rounded-lg flex items-center justify-center'>
                  <i className='ri-map-pin-2-line text-6xl text-primary' />
                </div>
                <Typography variant='h6' className='mb-2'>
                  Interactive Map Coming Soon
                </Typography>
                <Typography color='text.secondary'>
                  Real-time vehicle tracking and location mapping
                </Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>

        {/* Vehicle Status List */}
        <Grid item xs={12} md={4}>
          <Card className='h-96'>
            <CardHeader title='Vehicles by Status' />
            <CardContent>
              <div className='space-y-4 max-h-80 overflow-y-auto'>
                {Object.entries(vehiclesByStatus).map(([status, statusVehicles]) => (
                  <div key={status}>
                    <div className='flex items-center justify-between mb-2'>
                      <Typography variant='subtitle2' className='font-medium'>
                        � {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Typography>
                      <Chip size='small' label={statusVehicles.length} />
                    </div>
                    
                    <div className='ml-4 space-y-2'>
                      {statusVehicles.map((vehicle) => (
                        <div
                          key={vehicle.$id}
                          className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-action-hover ${
                            selectedVehicle?.$id === vehicle.$id ? 'bg-primary/5 border border-primary/20' : ''
                          }`}
                          onClick={() => onVehicleSelect(vehicle.$id)}
                        >
                          <CustomAvatar size={24}>
                            {vehicle.vehicleType === 'truck' && <i className='ri-truck-line text-sm' />}
                            {vehicle.vehicleType === 'van' && <i className='ri-car-line text-sm' />}
                            {vehicle.vehicleType === 'bike' && <i className='ri-motorbike-line text-sm' />}
                            {vehicle.vehicleType === 'car' && <i className='ri-car-line text-sm' />}
                          </CustomAvatar>
                          
                          <div className='flex-1 min-w-0'>
                            <Typography variant='body2' className='font-medium'>
                              {vehicle.vehicleNumber}
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {vehicle.brand} {vehicle.model}
                            </Typography>
                          </div>
                          
                          <Chip
                            size='small'
                            variant='tonal'
                            color={
                              vehicle.status === 'active' ? 'success' :
                              vehicle.status === 'maintenance' ? 'warning' : 'error'
                            }
                            label={vehicle.status}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {Object.keys(vehiclesByStatus).length === 0 && (
                  <Typography color='text.secondary' className='text-center py-8'>
                    No vehicles available
                  </Typography>
                )}
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Selected Vehicle Details */}
      {selectedVehicle && (
        <Card className='mt-4'>
          <CardHeader title={`Vehicle Details - ${selectedVehicle.vehicleNumber}`} />
          <CardContent>
            <Grid container spacing={4}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant='subtitle2' color='text.secondary'>Type</Typography>
                <Typography variant='body1' className='capitalize'>
                  {selectedVehicle.vehicleType}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant='subtitle2' color='text.secondary'>Status</Typography>
                <Chip
                  size='small'
                  variant='tonal'
                  color={
                    selectedVehicle.status === 'active' ? 'success' :
                    selectedVehicle.status === 'maintenance' ? 'warning' : 'error'
                  }
                  label={selectedVehicle.status}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant='subtitle2' color='text.secondary'>Brand</Typography>
                <Typography variant='body1'>
                  {selectedVehicle.brand || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant='subtitle2' color='text.secondary'>Model & Year</Typography>
                <Typography variant='body1'>
                  {selectedVehicle.model} ({selectedVehicle.year})
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant='subtitle2' color='text.secondary'>Ownership</Typography>
                <Typography variant='body1' className='capitalize'>
                  {selectedVehicle.ownership}
                </Typography>
              </Grid>
              {selectedVehicle.ownership === 'rented' && selectedVehicle.monthlyRentalCost && (
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant='subtitle2' color='text.secondary'>Monthly Cost</Typography>
                  <Typography variant='body1'>
                    GHS {selectedVehicle.monthlyRentalCost.toLocaleString()}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default VehicleMap