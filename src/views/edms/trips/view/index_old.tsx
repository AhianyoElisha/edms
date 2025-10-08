'use client'

// React Imports
import { useState } from 'react'

// Next Imports
import Link from 'next/link'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import { styled } from '@mui/material/styles'
import { TripType } from '@/types/apps/deliveryTypes'

// Timeline Imports
import TimelineDot from '@mui/lab/TimelineDot'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineConnector from '@mui/lab/TimelineConnector'
import MuiTimeline from '@mui/lab/Timeline'
import type { TimelineProps } from '@mui/lab/Timeline'

// Styled Timeline component
const Timeline = styled(MuiTimeline)<TimelineProps>({
  paddingLeft: 0,
  paddingRight: 0,
  '& .MuiTimelineItem-root': {
    width: '100%',
    '&:before': {
      display: 'none'
    }
  }
})

// Helper function to parse JSON fields safely
const parseJSON = (jsonString: string | null | undefined) => {
  if (!jsonString) return []
  try {
    return JSON.parse(jsonString)
  } catch {
    return []
  }
}

// Helper function to get status color
const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return 'success'
    case 'in-progress':
    case 'in_progress':
      return 'primary'
    case 'pending':
    case 'planned':
      return 'warning'
    case 'cancelled':
    case 'canceled':
      return 'error'
    default:
      return 'default'
  }
}

const TripView = ({ tripData }: { tripData: any }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'manifests' | 'checkpoints'>('overview')

  // Parse checkpoints
  const checkpoints = parseJSON(tripData.checkpoints)
  
  // Calculate progress
  const completedCheckpoints = checkpoints.filter((cp: any) => cp.status === 'completed').length
  const progressPercentage = checkpoints.length > 0 ? (completedCheckpoints / checkpoints.length) * 100 : 0

  return (
    <>
      <Typography className='mt-4' variant='h4'>Trip Details - {tripData.tripNumber}</Typography>
      <Divider className='my-8' />
      
      {/* Header Info */}
      <Card className='mb-6'>
        <CardContent>
          <div className='flex items-start justify-between flex-wrap gap-4'>
            <div className='flex items-center gap-3'>
              <Typography variant='body2' color='text.secondary'>
                Status:
              </Typography>
              <Chip
                label={tripData.status?.charAt(0).toUpperCase() + tripData.status?.slice(1)}
                variant='tonal'
                color={getStatusColor(tripData.status)}
                size='small'
              />
              {tripData.invoiceGenerated && (
                <Chip
                  label='Invoice Generated'
                  variant='tonal'
                  color='info'
                  size='small'
                />
              )}
            </div>
            <div className='flex gap-2'>
              <Button
                variant='outlined'
                size='small'
                startIcon={<i className='ri-printer-line' />}
              >
                Print
              </Button>
              <Button
                variant='contained'
                size='small'
                startIcon={<i className='ri-edit-line' />}
              >
                Edit
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          {checkpoints.length > 0 && (
            <Box className='mt-6'>
              <div className='flex items-center justify-between mb-2'>
                <Typography variant='body2'>
                  Trip Progress
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {completedCheckpoints} / {checkpoints.length} completed
                </Typography>
              </div>
              <LinearProgress
                variant='determinate'
                value={progressPercentage}
                className='h-2 rounded'
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          aria-label='trip details tabs'
        >
          <Tab 
            label='Overview' 
            value='overview'
            icon={<i className='ri-dashboard-line' />}
            iconPosition='start'
          />
          <Tab 
            label={`Manifests (${tripData.manifests?.length || 0})`}
            value='manifests'
            icon={<i className='ri-file-list-3-line' />}
            iconPosition='start'
          />
          <Tab 
            label={`Checkpoints (${checkpoints.length})`}
            value='checkpoints'
            icon={<i className='ri-map-pin-line' />}
            iconPosition='start'
          />
        </Tabs>

        <CardContent>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <Grid container spacing={6}>
              {/* Trip Information */}
              <Grid item xs={12} md={6} lg={4}>
                <div className='flex items-center gap-4'>
                  <Avatar variant='rounded' className='bg-primary'>
                    <i className='ri-truck-line' />
                  </Avatar>
                  <div>
                    <Typography variant='h5'>{typeof tripData.vehicle === 'object' && tripData.vehicle !== null
                      ? tripData.vehicle.vehicleNumber || tripData.vehicle.$id
                      : tripData.vehicle || 'N/A'}</Typography>
                    <Typography>Vehicle Number</Typography>
                  </div>
                </div>
              </Grid>
              <Grid item xs={12} md={6} lg={4}>
                <div className='flex items-center gap-4'>
                  <Avatar variant='rounded' className='bg-success'>
                    <i className='ri-user-line' />
                  </Avatar>
                  <div>
                    <Typography variant='h5'>{typeof tripData.driver === 'object' && tripData.driver !== null
                      ? tripData.driver.name || tripData.driver.email || tripData.driver.$id
                      : tripData.driver || 'N/A'}</Typography>
                    <Typography>Driver Name</Typography>
                  </div>
                </div>
              </Grid>
              <Grid item xs={12} md={6} lg={4}>
                <div className='flex items-center gap-4'>
                  <Avatar variant='rounded' className='bg-info'>
                    <i className='ri-route-line' />
                  </Avatar>
                  <div>
                    <Typography variant='h5'>{tripData.totalDistance || 'N/A'}</Typography>
                    <Typography>Total Distance (km)</Typography>
                  </div>
                </div>
              </Grid>

              {/* Additional Details */}
              <Grid item xs={12}>
                <Divider />
              </Grid>

              <Grid item xs={12} md={6} lg={3}>
                <Typography color='text.secondary'>Start Date</Typography>
                <Typography className='font-medium'>{new Date(tripData.startDate).toLocaleDateString()}</Typography>
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <Typography color='text.secondary'>End Date</Typography>
                <Typography className='font-medium'>{tripData.endDate ? new Date(tripData.endDate).toLocaleDateString() : 'Not completed'}</Typography>
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <Typography color='text.secondary'>Total Cost</Typography>
                <Typography className='font-medium'>${Number(tripData.totalCost || 0).toFixed(2)}</Typography>
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <Typography color='text.secondary'>Created</Typography>
                <Typography className='font-medium'>{new Date(tripData.$createdAt).toLocaleDateString()}</Typography>
              </Grid>

              {tripData.notes && (
                <>
                  <Grid item xs={12}>
                    <Divider />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant='h6' className='mb-2'>Notes</Typography>
                    <Typography color='text.secondary'>{tripData.notes}</Typography>
                  </Grid>
                </>
              )}

              {/* Route Details if available */}
              {tripData.route && typeof tripData.route === 'object' && (
                <>
                  <Grid item xs={12}>
                    <Divider />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant='h6' className='mb-4'>Route Details</Typography>
                    <Grid container spacing={4}>
                      <Grid item xs={12} md={6}>
                    <CardContent>
                      <div className='flex items-center gap-3 mb-4'>
                        <Avatar className='bg-info' sx={{ width: 48, height: 48 }}>
                          <i className='ri-route-line text-2xl' />
                        </Avatar>
                        <div>
                          <Typography variant='h6' className='font-bold'>
                            Route Information
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            Assigned route details
                          </Typography>
                        </div>
                      </div>
                      <div className='space-y-3'>
                        <div className='flex items-center gap-2'>
                          <i className='ri-map-pin-line text-textSecondary' />
                          <div className='flex-1'>
                            <Typography variant='body2' color='text.secondary'>
                              Route Name
                            </Typography>
                            <Typography variant='body1' className='font-semibold'>
                              {typeof tripData.route === 'object' && tripData.route !== null
                                ? tripData.route.routeName || tripData.route.$id
                                : tripData.route || 'N/A'}
                            </Typography>
                          </div>
                        </div>
                        {typeof tripData.route === 'object' && tripData.route !== null && tripData.route.routeCode && (
                          <div className='flex items-center gap-2'>
                            <i className='ri-barcode-line text-textSecondary' />
                            <div className='flex-1'>
                              <Typography variant='body2' color='text.secondary'>
                                Route Code
                              </Typography>
                              <Typography variant='body1' className='font-semibold'>
                                {tripData.route.routeCode}
                              </Typography>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Trip Statistics Card */}
                <Grid item xs={12} md={6}>
                  <Card variant='outlined' className='h-full'>
                    <CardContent>
                      <div className='flex items-center gap-3 mb-4'>
                        <Avatar className='bg-warning' sx={{ width: 48, height: 48 }}>
                          <i className='ri-dashboard-line text-2xl' />
                        </Avatar>
                        <div>
                          <Typography variant='h6' className='font-bold'>
                            Trip Statistics
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            Real-time trip metrics
                          </Typography>
                        </div>
                      </div>
                      <div className='space-y-3'>
                        <div className='flex items-center gap-2'>
                          <i className='ri-flag-line text-textSecondary' />
                          <div className='flex-1'>
                            <Typography variant='body2' color='text.secondary'>
                              Current Status
                            </Typography>
                            <Chip
                              label={tripData.status}
                              color={getStatusColor(tripData.status)}
                              size='small'
                            />
                          </div>
                        </div>
                        <div className='flex items-center gap-2'>
                          <i className='ri-map-pin-range-line text-textSecondary' />
                          <div className='flex-1'>
                            <Typography variant='body2' color='text.secondary'>
                              Checkpoint Progress
                            </Typography>
                            <Chip
                              label={`${tripData.currentCheckpoint} of ${checkpoints.length}`}
                              color='secondary'
                              size='small'
                              icon={<i className='ri-map-pin-line' />}
                            />
                          </div>
                        </div>
                        <div className='flex items-center gap-2'>
                          <i className='ri-road-map-line text-textSecondary' />
                          <div className='flex-1'>
                            <Typography variant='body2' color='text.secondary'>
                              Distance Traveled
                            </Typography>
                            <Typography variant='body1' className='font-semibold'>
                              {tripData.distanceTraveled || 0} km
                            </Typography>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Trip Details Card */}
                <Grid item xs={12} md={6}>
                  <Card variant='outlined' className='h-full'>
                    <CardContent>
                      <div className='flex items-center gap-3 mb-4'>
                        <Avatar className='bg-secondary' sx={{ width: 48, height: 48 }}>
                          <i className='ri-calendar-line text-2xl' />
                        </Avatar>
                        <div>
                          <Typography variant='h6' className='font-bold'>
                            Trip Details
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            Schedule and timing
                          </Typography>
                        </div>
                      </div>
                      <div className='space-y-3'>
                        <div className='flex items-center gap-2'>
                          <i className='ri-hashtag text-textSecondary' />
                          <div className='flex-1'>
                            <Typography variant='body2' color='text.secondary'>
                              Trip Number
                            </Typography>
                            <Typography variant='body1' className='font-semibold'>
                              {tripData.tripNumber}
                            </Typography>
                          </div>
                        </div>
                        <div className='flex items-center gap-2'>
                          <i className='ri-calendar-check-line text-textSecondary' />
                          <div className='flex-1'>
                            <Typography variant='body2' color='text.secondary'>
                              Trip Date
                            </Typography>
                            <Typography variant='body1' className='font-semibold'>
                              {new Date(tripData.tripDate).toLocaleDateString()}
                            </Typography>
                          </div>
                        </div>
                        <div className='flex items-center gap-2'>
                          <i className='ri-time-line text-textSecondary' />
                          <div className='flex-1'>
                            <Typography variant='body2' color='text.secondary'>
                              Start Time
                            </Typography>
                            <Typography variant='body1' className='font-semibold'>
                              {new Date(tripData.startTime).toLocaleTimeString()}
                            </Typography>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Financial Information Card */}
                <Grid item xs={12} md={6}>
                  <Card variant='outlined' className='h-full'>
                    <CardContent>
                      <div className='flex items-center gap-3 mb-4'>
                        <Avatar className='bg-error' sx={{ width: 48, height: 48 }}>
                          <i className='ri-money-dollar-circle-line text-2xl' />
                        </Avatar>
                        <div>
                          <Typography variant='h6' className='font-bold'>
                            Financial Information
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            Invoice and payment status
                          </Typography>
                        </div>
                      </div>
                      <div className='space-y-3'>
                        <div className='flex items-center gap-2'>
                          <i className='ri-file-text-line text-textSecondary' />
                          <div className='flex-1'>
                            <Typography variant='body2' color='text.secondary'>
                              Invoice Status
                            </Typography>
                            <Chip
                              label={tripData.invoiceGenerated ? 'Generated' : 'Not Generated'}
                              color={tripData.invoiceGenerated ? 'success' : 'default'}
                              size='small'
                            />
                          </div>
                        </div>
                        <div className='flex items-center gap-2'>
                          <i className='ri-money-dollar-box-line text-textSecondary' />
                          <div className='flex-1'>
                            <Typography variant='body2' color='text.secondary'>
                              Invoice Amount
                            </Typography>
                            <Typography variant='body1' className='font-semibold'>
                              ${tripData.invoiceAmount?.toFixed(2) || '0.00'}
                            </Typography>
                          </div>
                        </div>
                        <div className='flex items-center gap-2'>
                          <i className='ri-secure-payment-line text-textSecondary' />
                          <div className='flex-1'>
                            <Typography variant='body2' color='text.secondary'>
                              Payment Status
                            </Typography>
                            <Chip
                              label={tripData.paymentStatus}
                              color={tripData.paymentStatus === 'paid' ? 'success' : 'warning'}
                              size='small'
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Notes */}
                {tripData.notes && (
                  <Grid item xs={12}>
                    <Card variant='outlined'>
                      <CardContent>
                        <div className='flex items-center gap-3 mb-3'>
                          <Avatar className='bg-grey-500' sx={{ width: 40, height: 40 }}>
                            <i className='ri-file-text-line text-xl' />
                          </Avatar>
                          <Typography variant='h6' className='font-bold'>
                            Notes
                          </Typography>
                        </div>
                        <Typography variant='body2'>{tripData.notes}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            )}

            {/* Manifests Tab */}
            {activeTab === 'manifests' && (
              <div>
                {tripData.manifests && tripData.manifests.length > 0 ? (
                  <div className='space-y-4'>
                    <Typography variant='body1' className='mb-4'>
                      This trip has {tripData.manifests.length} manifest(s).
                    </Typography>
                    <div className='grid gap-3'>
                      {tripData.manifests.map((manifest: any, index: number) => {
                        // Handle both object and string manifest
                        const isObject = typeof manifest === 'object' && manifest !== null
                        const manifestId = isObject ? manifest.$id : manifest
                        const manifestNumber = isObject ? manifest.manifestNumber : `Manifest ${index + 1}`
                        const totalPackages = isObject ? manifest.totalPackages : 0
                        const status = isObject ? manifest.status : 'unknown'
                        const dropoffLocation = isObject && manifest.dropofflocation 
                          ? (typeof manifest.dropofflocation === 'object' 
                              ? manifest.dropofflocation.locationName 
                              : manifest.dropofflocation)
                          : 'N/A'
                        
                        return (
                          <Card key={manifestId} variant='outlined' className='border-l-4 border-l-primary'>
                            <CardContent>
                              <div className='flex items-center justify-between flex-wrap gap-4'>
                                <div className='flex gap-3'>
                                  <Avatar variant='rounded' className='bg-primary'>
                                    <i className='ri-file-list-3-line' />
                                  </Avatar>
                                  <div>
                                    <Typography variant='h6' className='font-bold'>
                                      {manifestNumber}
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary'>
                                      {dropoffLocation}
                                    </Typography>
                                    <Typography variant='caption' color='text.secondary'>
                                      ID: {manifestId.substring(0, 12)}...
                                    </Typography>
                                  </div>
                                </div>
                                <div className='flex gap-2 items-center flex-wrap'>
                                  <Chip
                                    label={`${totalPackages} packages`}
                                    color='info'
                                    size='small'
                                    icon={<i className='ri-inbox-line' />}
                                  />
                                  <Chip
                                    label={status}
                                    color={getStatusColor(status)}
                                    size='small'
                                  />
                                  <Link href={`/edms/manifests/${manifestId}`} passHref>
                                    <Button 
                                      size='small' 
                                      variant='outlined'
                                      startIcon={<i className='ri-eye-line' />}
                                    >
                                      View Details
                                    </Button>
                                  </Link>
                                </div>
                              </div>
                              
                              {/* Show packages if available */}
                              {isObject && manifest.packages && Array.isArray(manifest.packages) && manifest.packages.length > 0 && (
                                <div className='mt-4 pt-4 border-t'>
                                  <div className='flex items-center gap-2 mb-3'>
                                    <i className='ri-inbox-line text-textSecondary' />
                                    <Chip
                                      label={`${manifest.packages.length} Packages`}
                                      color='primary'
                                      size='small'
                                      variant='outlined'
                                    />
                                  </div>
                                  <div className='flex gap-2 flex-wrap'>
                                    {manifest.packages.slice(0, 5).map((pkg: any) => {
                                      const pkgObj = typeof pkg === 'object' ? pkg : null
                                      return (
                                        <Chip
                                          key={pkgObj?.$id || pkg}
                                          label={pkgObj?.trackingNumber || pkg}
                                          size='small'
                                          variant='outlined'
                                        />
                                      )
                                    })}
                                    {manifest.packages.length > 5 && (
                                      <Chip
                                        label={`+${manifest.packages.length - 5} more`}
                                        size='small'
                                        variant='outlined'
                                        color='secondary'
                                      />
                                    )}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className='text-center py-8'>
                    <i className='ri-file-list-line text-6xl text-textSecondary mb-2' />
                    <Typography variant='body1' color='text.secondary'>
                      No manifests found for this trip
                    </Typography>
                  </div>
                )}
              </div>
            )}

            {/* Checkpoints Tab */}
            {activeTab === 'checkpoints' && (
              <div>
                {checkpoints.length > 0 ? (
                  <Timeline>
                    {checkpoints.map((checkpoint: any, index: number) => (
                      <TimelineItem key={index}>
                        <TimelineSeparator>
                          <TimelineDot
                            color={
                              checkpoint.status === 'completed'
                                ? 'success'
                                : checkpoint.status === 'in-progress'
                                ? 'primary'
                                : 'grey'
                            }
                            sx={{ width: 40, height: 40 }}
                          >
                            {checkpoint.status === 'completed' ? (
                              <i className='ri-check-line text-xl' />
                            ) : checkpoint.status === 'in-progress' ? (
                              <i className='ri-time-line text-xl' />
                            ) : (
                              <i className='ri-map-pin-line text-xl' />
                            )}
                          </TimelineDot>
                          {index < checkpoints.length - 1 && <TimelineConnector />}
                        </TimelineSeparator>
                        <TimelineContent>
                          <Card variant='outlined' className='mb-4'>
                            <CardContent>
                              <div className='flex items-start justify-between flex-wrap gap-4 mb-3'>
                                <div className='flex items-center gap-3'>
                                  <Avatar className='bg-primary' sx={{ width: 48, height: 48 }}>
                                    <i className='ri-map-pin-2-line text-2xl' />
                                  </Avatar>
                                  <div>
                                    <Typography variant='h6' className='font-bold mb-1'>
                                      {checkpoint.dropoffLocationName || `Checkpoint ${checkpoint.sequence}`}
                                    </Typography>
                                    <div className='flex items-center gap-2 flex-wrap'>
                                      <Chip
                                        label={checkpoint.status}
                                        color={getStatusColor(checkpoint.status)}
                                        size='small'
                                      />
                                      {checkpoint.gpsVerified && (
                                        <Chip
                                          label='GPS Verified'
                                          color='success'
                                          size='small'
                                          icon={<i className='ri-map-pin-user-line' />}
                                        />
                                      )}
                                      <Chip
                                        label={`Sequence #${checkpoint.sequence}`}
                                        variant='outlined'
                                        size='small'
                                      />
                                    </div>
                                  </div>
                                </div>
                                <div className='text-right'>
                                  {checkpoint.arrivalTime && (
                                    <div className='flex items-center gap-1 justify-end mb-1'>
                                      <i className='ri-login-circle-line text-info' />
                                      <Typography variant='caption' color='text.secondary'>
                                        Arrived: {new Date(checkpoint.arrivalTime).toLocaleString()}
                                      </Typography>
                                    </div>
                                  )}
                                  {checkpoint.completionTime && (
                                    <div className='flex items-center gap-1 justify-end'>
                                      <i className='ri-checkbox-circle-line text-success' />
                                      <Typography variant='caption' color='text.secondary'>
                                        Completed: {new Date(checkpoint.completionTime).toLocaleString()}
                                      </Typography>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <Divider className='my-3' />
                              
                              {/* Delivery Stats */}
                              <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                                <div className='text-center'>
                                  <div className='flex items-center justify-center gap-1 mb-1'>
                                    <i className='ri-inbox-line text-primary' />
                                    <Typography variant='caption' color='text.secondary'>
                                      Delivered
                                    </Typography>
                                  </div>
                                  <Typography variant='h6' className='font-bold text-success'>
                                    {checkpoint.packagesDelivered || 0}
                                  </Typography>
                                </div>
                                <div className='text-center'>
                                  <div className='flex items-center justify-center gap-1 mb-1'>
                                    <i className='ri-error-warning-line text-error' />
                                    <Typography variant='caption' color='text.secondary'>
                                      Missing
                                    </Typography>
                                  </div>
                                  <Typography variant='h6' className='font-bold text-error'>
                                    {checkpoint.packagesMissing || 0}
                                  </Typography>
                                </div>
                                {checkpoint.manifestId && (
                                  <div className='text-center col-span-2'>
                                    <div className='flex items-center justify-center gap-1 mb-1'>
                                      <i className='ri-file-list-3-line text-info' />
                                      <Typography variant='caption' color='text.secondary'>
                                        Manifest ID
                                      </Typography>
                                    </div>
                                    <Typography variant='body2' className='font-semibold'>
                                      {checkpoint.manifestId.substring(0, 12)}...
                                    </Typography>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </TimelineContent>
                      </TimelineItem>
                    ))}
                  </Timeline>
                ) : (
                  <div className='text-center py-12'>
                    <Avatar className='bg-grey-200 mx-auto mb-4' sx={{ width: 80, height: 80 }}>
                      <i className='ri-map-pin-line text-5xl text-textSecondary' />
                    </Avatar>
                    <Typography variant='h6' color='text.secondary' className='mb-1'>
                      No checkpoints found
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      This trip doesn't have any checkpoints yet
                    </Typography>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
    </>
  )
}

export default TripView
