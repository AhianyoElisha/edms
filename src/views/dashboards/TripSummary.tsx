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
import type { TripType } from '@/types/apps/deliveryTypes'

type TripStatusType = 'planned' | 'in_progress' | 'at_pickup' | 'on_route' | 'completed' | 'cancelled'

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
      case 'planned':
        return 'info'
      case 'in_progress':
      case 'on_route':
        return 'primary'
      case 'at_pickup':
        return 'warning'
      case 'completed':
        return 'success'
      case 'cancelled':
        return 'error'
      default:
        return 'secondary'
    }
  }

  const getStatusIcon = (status: TripStatusType): string => {
    switch (status) {
      case 'planned':
        return 'ri-calendar-line'
      case 'in_progress':
      case 'on_route':
        return 'ri-truck-line'
      case 'at_pickup':
        return 'ri-map-pin-line'
      case 'completed':
        return 'ri-checkbox-circle-line'
      case 'cancelled':
        return 'ri-close-circle-line'
      default:
        return 'ri-route-line'
    }
  }

  const formatStatus = (status: TripStatusType): string => {
    return status.split('_').map(word => 
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
  const activeTrips = tripData?.filter(trip => trip.status === 'in_progress' || trip.status === 'on_route' || trip.status === 'at_pickup') || []
  const completedTrips = tripData?.filter(trip => trip.status === 'completed') || []
  const scheduledTrips = tripData?.filter(trip => trip.status === 'planned') || []

  const getTabData = () => {
    switch (activeTab) {
      case 0: return activeTrips.slice(0, 5)
      case 1: return scheduledTrips.slice(0, 5)
      case 2: return completedTrips.slice(0, 5)
      default: return activeTrips.slice(0, 5)
    }
  }

  // Calculate summary stats - using available fields from new TripType
  const totalRevenue = tripData?.reduce((sum, trip) => sum + (trip.profit || 0), 0) || 0
  const totalPackages = tripData?.reduce((sum, trip) => sum + (trip.manifests?.length || 0), 0) || 0
  const totalDelivered = completedTrips.length

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
            const manifestCount = Array.isArray(trip.manifests) ? trip.manifests.length : 0
            const checkpoints = trip.checkpoints ? JSON.parse(trip.checkpoints) : []
            const completedCheckpoints = checkpoints.filter((cp: any) => cp.status === 'completed').length
            const completionRate = checkpoints.length > 0 
              ? Math.round((completedCheckpoints / checkpoints.length) * 100) 
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
                        Driver ID: {trip.driver} • Vehicle ID: {trip.vehicle}
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
                      📍 Route ID: {trip.route}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      🛣️ {trip.distanceTraveled ? `${trip.distanceTraveled.toFixed(1)} km` : 'N/A'}
                    </Typography>
                  </div>
                  
                  <div className='flex items-center gap-6'>
                    <div className='flex items-center gap-2'>
                      <i className='ri-map-pin-line text-sm' />
                      <Typography variant='caption'>
                        {completedCheckpoints}/{checkpoints.length} checkpoints ({completionRate}%)
                      </Typography>
                    </div>
                    
                    <div className='flex items-center gap-2'>
                      <i className='ri-file-list-line text-sm' />
                      <Typography variant='caption'>
                        {manifestCount} manifest(s)
                      </Typography>
                    </div>
                    
                    <div className='flex items-center gap-2'>
                      <i className='ri-time-line text-sm' />
                      <Typography variant='caption' color='text.secondary'>
                        {trip.status === 'completed' && trip.endTime
                          ? `Completed: ${new Date(trip.endTime).toLocaleTimeString()}`
                          : `Started: ${new Date(trip.startTime).toLocaleTimeString()}`
                        }
                      </Typography>
                    </div>
                  </div>
                </div>
                
                <div className='flex flex-col gap-1 text-right'>
                  <Typography variant='body1' className='font-medium text-success'>
                    {formatCurrency(trip.profit || 0)}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Profit
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Status: {formatStatus(trip.status)}
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