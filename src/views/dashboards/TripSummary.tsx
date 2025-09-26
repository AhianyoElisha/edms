'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Grid from '@mui/material/Grid'
import Divider from '@mui/material/Divider'

// Third-party Imports
import classnames from 'classnames'

// Type Imports
import type { ThemeColor } from '@core/types'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'
import OptionMenu from '@core/components/option-menu'

// Type Imports
import type { TripType, TripStatusType } from '@/types/apps/deliveryTypes'

const TripSummary = ({ 
  tripData, 
  isLoading 
}: { 
  tripData?: TripType[]
  isLoading?: boolean 
}) => {
  const [activeTab, setActiveTab] = useState(0)

  const getStatusColor = (status: TripStatusType): ThemeColor => {
    switch (status) {
      case 'scheduled':
        return 'info'
      case 'in-progress':
        return 'primary'
      case 'completed':
        return 'success'
      case 'cancelled':
        return 'error'
      case 'delayed':
        return 'warning'
      default:
        return 'secondary'
    }
  }

  const getStatusIcon = (status: TripStatusType): string => {
    switch (status) {
      case 'scheduled':
        return 'ri-calendar-line'
      case 'in-progress':
        return 'ri-truck-line'
      case 'completed':
        return 'ri-checkbox-circle-line'
      case 'cancelled':
        return 'ri-close-circle-line'
      case 'delayed':
        return 'ri-time-line'
      default:
        return 'ri-route-line'
    }
  }

  const formatStatus = (status: TripStatusType): string => {
    return status.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  // Filter trips by status
  const activeTrips = tripData?.filter(trip => trip.status === 'in-progress') || []
  const completedTrips = tripData?.filter(trip => trip.status === 'completed') || []
  const scheduledTrips = tripData?.filter(trip => trip.status === 'scheduled') || []

  const getTabData = () => {
    switch (activeTab) {
      case 0: return activeTrips.slice(0, 5)
      case 1: return scheduledTrips.slice(0, 5)
      case 2: return completedTrips.slice(0, 5)
      default: return activeTrips.slice(0, 5)
    }
  }

  // Calculate summary stats
  const totalRevenue = tripData?.reduce((sum, trip) => sum + trip.revenue, 0) || 0
  const totalPackages = tripData?.reduce((sum, trip) => sum + trip.packagesCount, 0) || 0
  const totalDelivered = tripData?.reduce((sum, trip) => sum + trip.completedDeliveries, 0) || 0

  return (
    <Card>
      <CardHeader
        title='Trip Summary'
        subheader='Overview of delivery trips'
        action={<OptionMenu iconClassName='text-textPrimary' options={['View All', 'Export', 'Settings']} />}
      />
      <CardContent className='!pbs-5'>
        {/* Summary Statistics */}
        <Grid container spacing={4} className='mbe-6'>
          <Grid item xs={12} sm={3}>
            <div className='flex flex-col items-center gap-2 p-3 rounded-lg border border-divider'>
              <CustomAvatar color='primary' variant='rounded' className='bs-10 is-10'>
                <i className='ri-truck-line text-lg' />
              </CustomAvatar>
              <Typography variant='h6'>{activeTrips.length}</Typography>
              <Typography variant='caption' color='text.secondary'>Active Trips</Typography>
            </div>
          </Grid>
          <Grid item xs={12} sm={3}>
            <div className='flex flex-col items-center gap-2 p-3 rounded-lg border border-divider'>
              <CustomAvatar color='success' variant='rounded' className='bs-10 is-10'>
                <i className='ri-money-dollar-circle-line text-lg' />
              </CustomAvatar>
              <Typography variant='h6'>{formatCurrency(totalRevenue)}</Typography>
              <Typography variant='caption' color='text.secondary'>Total Revenue</Typography>
            </div>
          </Grid>
          <Grid item xs={12} sm={3}>
            <div className='flex flex-col items-center gap-2 p-3 rounded-lg border border-divider'>
              <CustomAvatar color='info' variant='rounded' className='bs-10 is-10'>
                <i className='ri-package-line text-lg' />
              </CustomAvatar>
              <Typography variant='h6'>{totalPackages}</Typography>
              <Typography variant='caption' color='text.secondary'>Total Packages</Typography>
            </div>
          </Grid>
          <Grid item xs={12} sm={3}>
            <div className='flex flex-col items-center gap-2 p-3 rounded-lg border border-divider'>
              <CustomAvatar color='warning' variant='rounded' className='bs-10 is-10'>
                <i className='ri-checkbox-circle-line text-lg' />
              </CustomAvatar>
              <Typography variant='h6'>{totalDelivered}</Typography>
              <Typography variant='caption' color='text.secondary'>Delivered</Typography>
            </div>
          </Grid>
        </Grid>

        <Divider className='mbe-4' />

        {/* Trip Tabs */}
        <Box className='mbe-4'>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant='scrollable'
            scrollButtons='auto'
          >
            <Tab label={`Active (${activeTrips.length})`} />
            <Tab label={`Scheduled (${scheduledTrips.length})`} />
            <Tab label={`Completed (${completedTrips.length})`} />
          </Tabs>
        </Box>

        {/* Trip List */}
        <div className='flex flex-col gap-4'>
          {getTabData().map((trip) => {
            const completionRate = trip.packagesCount > 0 
              ? Math.round((trip.completedDeliveries / trip.packagesCount) * 100) 
              : 0

            return (
              <div key={trip.$id} className='flex items-center gap-4 p-4 rounded-lg border border-divider'>
                <CustomAvatar
                  color={getStatusColor(trip.status)}
                  variant='rounded'
                  className='bs-12 is-12'
                >
                  <i className={classnames(getStatusIcon(trip.status), 'text-xl')} />
                </CustomAvatar>
                
                <div className='flex flex-col gap-2 flex-1'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <Typography variant='body1' className='font-medium'>
                        Trip #{trip.tripNumber}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {trip.driverName} • {trip.vehicleLicense}
                      </Typography>
                    </div>
                    <Chip
                      label={formatStatus(trip.status)}
                      color={getStatusColor(trip.status)}
                      size='small'
                    />
                  </div>
                  
                  <div className='flex items-center gap-4'>
                    <Typography variant='body2' color='text.secondary'>
                      📍 {trip.origin} → {trip.destination}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      🛣️ {trip.distance}
                    </Typography>
                  </div>
                  
                  <div className='flex items-center gap-6'>
                    <div className='flex items-center gap-2'>
                      <i className='ri-package-line text-sm' />
                      <Typography variant='caption'>
                        {trip.completedDeliveries}/{trip.packagesCount} packages ({completionRate}%)
                      </Typography>
                    </div>
                    
                    <div className='flex items-center gap-2'>
                      <i className='ri-time-line text-sm' />
                      <Typography variant='caption' color='text.secondary'>
                        {trip.status === 'completed' && trip.actualArrival
                          ? `Completed: ${new Date(trip.actualArrival).toLocaleTimeString()}`
                          : `ETA: ${new Date(trip.estimatedArrival).toLocaleTimeString()}`
                        }
                      </Typography>
                    </div>
                  </div>
                </div>
                
                <div className='flex flex-col gap-1 text-right'>
                  <Typography variant='body1' className='font-medium text-success'>
                    {formatCurrency(trip.revenue)}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Revenue
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Fuel: {formatCurrency(trip.fuelCost)}
                  </Typography>
                </div>
              </div>
            )
          })}
        </div>

        {getTabData().length === 0 && (
          <Box className='text-center py-8'>
            <CustomAvatar color='secondary' className='mbe-4 mli-auto bs-16 is-16'>
              <i className='ri-truck-line text-2xl' />
            </CustomAvatar>
            <Typography variant='h6' className='mbe-2'>No trips found</Typography>
            <Typography variant='body2' color='text.secondary'>
              {activeTab === 0 && 'No active trips at the moment.'}
              {activeTab === 1 && 'No scheduled trips found.'}
              {activeTab === 2 && 'No completed trips to show.'}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default TripSummary