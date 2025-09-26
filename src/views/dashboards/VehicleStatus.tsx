'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'

// Third-party Imports
import classnames from 'classnames'

// Type Imports
import type { ThemeColor } from '@core/types'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'
import OptionMenu from '@core/components/option-menu'

// Type Imports
import type { VehicleType, VehicleStats } from '@/types/apps/deliveryTypes'

const VehicleStatus = ({ vehicleData, vehicleStats, isLoading }: { 
  vehicleData?: VehicleType[]
  vehicleStats?: VehicleStats
  isLoading?: boolean 
}) => {
  
  const getStatusColor = (status: string): ThemeColor => {
    switch (status) {
      case 'active':
        return 'success'
      case 'maintenance':
        return 'warning'
      case 'retired':
        return 'error'
      default:
        return 'secondary'
    }
  }

  const getVehicleIcon = (type: string): string => {
    switch (type) {
      case 'truck':
        return 'ri-truck-line'
      case 'van':
        return 'ri-car-line'
      case 'bike':
        return 'ri-motorbike-line'
      case 'car':
        return 'ri-car-line'
      default:
        return 'ri-car-line'
    }
  }

  const getOwnershipIcon = (ownership: string | undefined): string => {
    if (!ownership) return 'ri-question-line'
    return ownership === 'owned' ? 'ri-home-line' : 'ri-exchange-line'
  }

  const totalVehicles = vehicleStats ? Object.values(vehicleStats).reduce((sum, count) => sum + count, 0) : 0

  return (
    <Card>
      <CardHeader
        title='Fleet Status'
        subheader='Real-time vehicle monitoring'
        action={<OptionMenu iconClassName='text-textPrimary' options={['Refresh', 'Export', 'Settings']} />}
      />
      <CardContent className='!pbs-5'>
        {/* Vehicle Statistics Overview */}
        <Grid container spacing={4} className='mbe-6'>
          <Grid item xs={12} sm={4}>
            <div className='flex flex-col items-center gap-2'>
              <CustomAvatar color='success' variant='rounded' className='bs-12 is-12'>
                <i className='ri-car-line text-2xl' />
              </CustomAvatar>
              <Typography variant='h6'>{vehicleStats?.active || 0}</Typography>
              <Typography variant='body2' color='text.secondary'>Active</Typography>
            </div>
          </Grid>
          <Grid item xs={12} sm={4}>
            <div className='flex flex-col items-center gap-2'>
              <CustomAvatar color='warning' variant='rounded' className='bs-12 is-12'>
                <i className='ri-tools-line text-2xl' />
              </CustomAvatar>
              <Typography variant='h6'>{vehicleStats?.maintenance || 0}</Typography>
              <Typography variant='body2' color='text.secondary'>Maintenance</Typography>
            </div>
          </Grid>
          <Grid item xs={12} sm={4}>
            <div className='flex flex-col items-center gap-2'>
              <CustomAvatar color='error' variant='rounded' className='bs-12 is-12'>
                <i className='ri-close-circle-line text-2xl' />
              </CustomAvatar>
              <Typography variant='h6'>{vehicleStats?.retired || 0}</Typography>
              <Typography variant='body2' color='text.secondary'>Retired</Typography>
            </div>
          </Grid>
        </Grid>

        {/* Individual Vehicle List */}
        <Typography variant='h6' className='mbe-4'>Fleet Overview</Typography>
        <div className='flex flex-col gap-4'>
          {vehicleData?.slice(0, 5).map((vehicle) => (
            <div key={vehicle.$id} className='flex items-center gap-4 p-4 rounded-lg border border-divider'>
              <CustomAvatar
                color={getStatusColor(vehicle.status)}
                variant='rounded'
                className='bs-10 is-10'
              >
                <i className={classnames(getVehicleIcon(vehicle.vehicleType), 'text-lg')} />
              </CustomAvatar>
              
              <div className='flex flex-col gap-1 flex-1'>
                <div className='flex items-center justify-between'>
                  <Typography variant='body1' className='font-medium'>
                    {vehicle.vehicleNumber}
                  </Typography>
                  <Chip
                    label={vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                    color={getStatusColor(vehicle.status)}
                    size='small'
                  />
                </div>
                
                <div className='flex items-center gap-4'>
                  <Typography variant='body2' color='text.secondary'>
                    {vehicle.brand} {vehicle.model} ({vehicle.year})
                  </Typography>
                  {vehicle.ownership && (
                    <div className='flex items-center gap-1'>
                      <i className={classnames(getOwnershipIcon(vehicle.ownership), 'text-sm')} />
                      <Typography variant='body2' color='text.secondary'>
                        {vehicle.ownership.charAt(0).toUpperCase() + vehicle.ownership.slice(1)}
                      </Typography>
                    </div>
                  )}
                </div>
                
                {vehicle.ownership === 'rented' && vehicle.monthlyRentalCost && vehicle.monthlyRentalCost > 0 && (
                  <Typography variant='caption' color='text.secondary'>
                    Monthly Cost: GHS {vehicle.monthlyRentalCost.toLocaleString()}
                  </Typography>
                )}
              </div>
              
              <Typography variant='caption' color='text.secondary'>
                Updated {new Date(vehicle.$updatedAt).toLocaleDateString()}
              </Typography>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default VehicleStatus