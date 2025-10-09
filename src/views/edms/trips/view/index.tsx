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
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'

// Timeline Imports
import TimelineDot from '@mui/lab/TimelineDot'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineConnector from '@mui/lab/TimelineConnector'
import MuiTimeline from '@mui/lab/Timeline'
import type { TimelineProps } from '@mui/lab/Timeline'
import { styled } from '@mui/material/styles'

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
            <div className='flex flex-wrap items-center gap-2'>
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
            <div className='flex flex-wrap gap-2'>
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
              {/* Summary Cards */}
              <Grid item xs={12} sm={6} lg={4}>
                <div className='flex items-center gap-4'>
                  <Avatar variant='rounded' className='bg-primary'>
                    <i className='ri-truck-line' />
                  </Avatar>
                  <div className='overflow-hidden'>
                    <Typography variant='h5' className='truncate'>
                      {typeof tripData.vehicle === 'object' && tripData.vehicle !== null
                        ? tripData.vehicle.vehicleNumber || tripData.vehicle.$id
                        : tripData.vehicle || 'N/A'}
                    </Typography>
                    <Typography variant='body2'>Vehicle Number</Typography>
                  </div>
                </div>
              </Grid>
              <Grid item xs={12} sm={6} lg={4}>
                <div className='flex items-center gap-4'>
                  <Avatar variant='rounded' className='bg-success'>
                    <i className='ri-user-line' />
                  </Avatar>
                  <div className='overflow-hidden'>
                    <Typography variant='h5' className='truncate'>
                      {typeof tripData.driver === 'object' && tripData.driver !== null
                        ? tripData.driver.name || tripData.driver.email || tripData.driver.$id
                        : tripData.driver || 'N/A'}
                    </Typography>
                    <Typography variant='body2'>Driver Name</Typography>
                  </div>
                </div>
              </Grid>
              <Grid item xs={12} sm={6} lg={4}>
                <div className='flex items-center gap-4'>
                  <Avatar variant='rounded' className='bg-info'>
                    <i className='ri-route-line' />
                  </Avatar>
                  <div className='overflow-hidden'>
                    <Typography variant='h5'>{tripData.distanceTraveled || tripData.totalDistance || 'N/A'} km</Typography>
                    <Typography variant='body2'>Distance Traveled</Typography>
                  </div>
                </div>
              </Grid>

              {/* Vehicle & Driver Details */}
              <Grid item xs={12}>
                <Divider />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant='h6' className='mb-4'>Vehicle Information</Typography>
                {typeof tripData.vehicle === 'object' && tripData.vehicle !== null ? (
                  <>
                    <Typography color='text.secondary' className='mb-1'>
                      <strong>Vehicle Number:</strong> {tripData.vehicle.vehicleNumber || 'N/A'}
                    </Typography>
                    <Typography color='text.secondary' className='mb-1'>
                      <strong>Type:</strong> {tripData.vehicle.vehicleType || tripData.vehicle.type || 'N/A'}
                    </Typography>
                    <Typography color='text.secondary' className='mb-1'>
                      <strong>Brand & Model:</strong> {tripData.vehicle.brand} {tripData.vehicle.model || 'N/A'}
                    </Typography>
                    {tripData.vehicle.licensePlate && (
                      <Typography color='text.secondary' className='mb-1'>
                        <strong>License Plate:</strong> {tripData.vehicle.licensePlate}
                      </Typography>
                    )}
                    {tripData.vehicle.capacity && (
                      <Typography color='text.secondary' className='mb-1'>
                        <strong>Capacity:</strong> {tripData.vehicle.capacity} units
                      </Typography>
                    )}
                  </>
                ) : (
                  <Typography color='text.secondary'>Vehicle details not available</Typography>
                )}
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant='h6' className='mb-4'>Driver Information</Typography>
                {typeof tripData.driver === 'object' && tripData.driver !== null ? (
                  <>
                    <Typography color='text.secondary' className='mb-1'>
                      <strong>Name:</strong> {tripData.driver.name || tripData.driver.email || 'N/A'}
                    </Typography>
                    {tripData.driver.phone && (
                      <Typography color='text.secondary' className='mb-1'>
                        <strong>Phone:</strong> {tripData.driver.phone}
                      </Typography>
                    )}
                    {tripData.driver.email && (
                      <Typography color='text.secondary' className='mb-1'>
                        <strong>Email:</strong> {tripData.driver.email}
                      </Typography>
                    )}
                    {tripData.driver.rating !== undefined && (
                      <Typography color='text.secondary' className='mb-1'>
                        <strong>Rating:</strong> {tripData.driver.rating} / 5.0
                      </Typography>
                    )}
                    {tripData.driver.licenseNumber && (
                      <Typography color='text.secondary' className='mb-1'>
                        <strong>License:</strong> {tripData.driver.licenseNumber}
                      </Typography>
                    )}
                  </>
                ) : (
                  <Typography color='text.secondary'>Driver details not available</Typography>
                )}
              </Grid>

              {/* Trip Timeline */}
              <Grid item xs={12}>
                <Divider />
              </Grid>

              <Grid item xs={12} md={6} lg={3}>
                <Typography color='text.secondary'>Trip Date</Typography>
                <Typography className='font-medium'>
                  {tripData.tripDate ? new Date(tripData.tripDate).toLocaleDateString() : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <Typography color='text.secondary'>Start Time</Typography>
                <Typography className='font-medium'>
                  {tripData.startTime ? new Date(tripData.startTime).toLocaleString() : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <Typography color='text.secondary'>Current Checkpoint</Typography>
                <Typography className='font-medium'>
                  {tripData.currentCheckpoint !== undefined ? `${tripData.currentCheckpoint + 1} of ${checkpoints.length}` : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <Typography color='text.secondary'>Created</Typography>
                <Typography className='font-medium'>
                  {new Date(tripData.$createdAt).toLocaleDateString()}
                </Typography>
              </Grid>

              {/* Financial Information */}
              {(tripData.clientRate || tripData.driverRate || tripData.profit || tripData.invoiceAmount) && (
                <>
                  <Grid item xs={12}>
                    <Divider />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant='h6' className='mb-4'>Financial Information</Typography>
                  </Grid>
                  {tripData.clientRate !== undefined && (
                    <Grid item xs={12} md={6} lg={3}>
                      <Typography color='text.secondary'>Client Rate</Typography>
                      <Typography className='font-medium'>${Number(tripData.clientRate || 0).toFixed(2)}</Typography>
                    </Grid>
                  )}
                  {tripData.driverRate !== undefined && (
                    <Grid item xs={12} md={6} lg={3}>
                      <Typography color='text.secondary'>Driver Rate</Typography>
                      <Typography className='font-medium'>${Number(tripData.driverRate || 0).toFixed(2)}</Typography>
                    </Grid>
                  )}
                  {tripData.profit !== undefined && (
                    <Grid item xs={12} md={6} lg={3}>
                      <Typography color='text.secondary'>Profit</Typography>
                      <Typography className='font-medium'>${Number(tripData.profit || 0).toFixed(2)}</Typography>
                    </Grid>
                  )}
                  {tripData.invoiceAmount !== undefined && (
                    <Grid item xs={12} md={6} lg={3}>
                      <Typography color='text.secondary'>Invoice Amount</Typography>
                      <Typography className='font-medium'>${Number(tripData.invoiceAmount || 0).toFixed(2)}</Typography>
                    </Grid>
                  )}
                  {tripData.paymentStatus && (
                    <Grid item xs={12} md={6} lg={3}>
                      <Typography color='text.secondary'>Payment Status</Typography>
                      <Chip
                        label={tripData.paymentStatus.charAt(0).toUpperCase() + tripData.paymentStatus.slice(1)}
                        variant='tonal'
                        color={tripData.paymentStatus === 'paid' ? 'success' : tripData.paymentStatus === 'partial' ? 'warning' : 'error'}
                        size='small'
                      />
                    </Grid>
                  )}
                </>
              )}

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
            </Grid>
          )}

          {/* Manifests Tab */}
          {activeTab === 'manifests' && (
            <div className='overflow-x-auto'>
              {tripData.manifests && tripData.manifests.length > 0 ? (
                <TableContainer component={Paper} variant='outlined'>
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Sequence</TableCell>
                        <TableCell>Manifest Number</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Packages</TableCell>
                        <TableCell>Dropoff Location</TableCell>
                        <TableCell>Departure Time</TableCell>
                        <TableCell>Arrival Time</TableCell>
                        <TableCell align='right'>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tripData.manifests.map((manifest: any) => {
                        const manifestPackages = Array.isArray(manifest.packages) ? manifest.packages : []
                        const manifestStatus = manifest.status || 'pending'
                        const pickupLocation = manifest.pickupLocation || manifest.pickuplocation
                        const dropoffLocation = manifest.dropoffLocation || manifest.dropofflocation

                        return (
                          <TableRow key={manifest.$id} hover>
                            <TableCell>
                              <Typography className='font-medium'>
                                #{manifest.dropoffSequence || 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography className='font-medium'>
                                {manifest.manifestNumber}
                              </Typography>
                              {manifest.manifestDate && (
                                <Typography variant='caption' color='text.secondary' className='block'>
                                  {new Date(manifest.manifestDate).toLocaleDateString()}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={manifestStatus.charAt(0).toUpperCase() + manifestStatus.slice(1)}
                                variant='tonal'
                                color={getStatusColor(manifestStatus)}
                                size='small'
                              />
                            </TableCell>
                            <TableCell>
                              <Typography>{manifestPackages.length} packages</Typography>
                              {manifest.packageTypes && (
                                <Typography variant='caption' color='text.secondary' className='block'>
                                  {(() => {
                                    try {
                                      const types = JSON.parse(manifest.packageTypes)
                                      return Object.entries(types)
                                        .filter(([_, count]) => (count as number) > 0)
                                        .map(([type, count]) => `${count} ${type}`)
                                        .join(', ')
                                    } catch {
                                      return 'Mixed'
                                    }
                                  })()}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2'>
                                {dropoffLocation && typeof dropoffLocation === 'object'
                                  ? dropoffLocation.locationName || dropoffLocation.address || dropoffLocation.city
                                  : dropoffLocation || 'N/A'}
                              </Typography>
                              {dropoffLocation && typeof dropoffLocation === 'object' && dropoffLocation.city && (
                                <Typography variant='caption' color='text.secondary' className='block'>
                                  {dropoffLocation.city}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2'>
                                {manifest.departureTime ? new Date(manifest.departureTime).toLocaleString() : 'Not departed'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2'>
                                {manifest.arrivalTime ? new Date(manifest.arrivalTime).toLocaleString() : 'Not arrived'}
                              </Typography>
                            </TableCell>
                            <TableCell align='right'>
                              <Link href={`/edms/manifests/${manifest.$id}`} passHref>
                                <Button size='small' variant='outlined'>
                                  View Details
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <div className='text-center py-12'>
                  <i className='ri-file-list-line text-6xl text-textSecondary mb-2' />
                  <Typography variant='h6' color='text.secondary'>
                    No manifests found
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    This trip doesn't have any manifests yet
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
                  {checkpoints.map((checkpoint: any, index: number) => {
                    const isCompleted = checkpoint.status === 'completed'
                    const isPending = checkpoint.status === 'pending'
                    const isInProgress = checkpoint.status === 'in-progress' || checkpoint.status === 'in_progress'

                    return (
                      <TimelineItem key={index}>
                        <TimelineSeparator>
                          <TimelineDot
                            color={isCompleted ? 'success' : isInProgress ? 'primary' : 'grey'}
                            sx={{ width: 40, height: 40 }}
                          >
                            <i className={isCompleted ? 'ri-checkbox-circle-line' : isInProgress ? 'ri-truck-line' : 'ri-map-pin-line'} />
                          </TimelineDot>
                          {index < checkpoints.length - 1 && <TimelineConnector />}
                        </TimelineSeparator>
                        <TimelineContent>
                          <Card className='mb-4'>
                            <CardContent>
                              <div className='flex items-start justify-between flex-wrap gap-2 mb-3'>
                                <div className='flex-1'>
                                  <div className='flex items-center gap-2 mb-1'>
                                    <Typography variant='h6'>
                                      {checkpoint.dropoffLocationName || `Checkpoint ${checkpoint.sequence || index + 1}`}
                                    </Typography>
                                    <Chip
                                      label={checkpoint.status?.charAt(0).toUpperCase() + checkpoint.status?.slice(1).replace('_', ' ')}
                                      variant='tonal'
                                      color={getStatusColor(checkpoint.status)}
                                      size='small'
                                    />
                                  </div>
                                  <Typography variant='body2' color='text.secondary'>
                                    Manifest: {checkpoint.manifestId || 'Not assigned'}
                                  </Typography>
                                </div>
                              </div>

                              {/* Package delivery stats */}
                              {isCompleted && (
                                <div className='flex gap-4 my-3'>
                                  <div className='flex items-center gap-2'>
                                    <i className='ri-checkbox-circle-line text-success' />
                                    <Typography variant='body2'>
                                      <strong>{checkpoint.packagesDelivered || 0}</strong> delivered
                                    </Typography>
                                  </div>
                                  {checkpoint.packagesMissing > 0 && (
                                    <div className='flex items-center gap-2'>
                                      <i className='ri-error-warning-line text-error' />
                                      <Typography variant='body2'>
                                        <strong>{checkpoint.packagesMissing}</strong> missing
                                      </Typography>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Timestamps */}
                              <div className='mt-3 space-y-1'>
                                {checkpoint.arrivalTime && (
                                  <Typography variant='caption' color='text.secondary' className='block'>
                                    <i className='ri-time-line mr-1' />
                                    Arrived: {new Date(checkpoint.arrivalTime).toLocaleString()}
                                  </Typography>
                                )}
                                {checkpoint.completionTime && (
                                  <Typography variant='caption' color='text.secondary' className='block'>
                                    <i className='ri-check-line mr-1' />
                                    Completed: {new Date(checkpoint.completionTime).toLocaleString()}
                                  </Typography>
                                )}
                              </div>

                              {/* GPS verification */}
                              {checkpoint.gpsVerified && (
                                <div className='mt-2'>
                                  <Chip
                                    label='GPS Verified'
                                    size='small'
                                    color='success'
                                    variant='outlined'
                                    icon={<i className='ri-map-pin-line' />}
                                  />
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </TimelineContent>
                      </TimelineItem>
                    )
                  })}
                </Timeline>
              ) : (
                <div className='text-center py-12'>
                  <i className='ri-map-pin-line text-6xl text-textSecondary mb-2' />
                  <Typography variant='h6' color='text.secondary'>
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
