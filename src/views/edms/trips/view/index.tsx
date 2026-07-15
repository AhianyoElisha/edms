'use client'

// React Imports
import { useState, useEffect } from 'react'

// Next Imports
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// MUI Imports
import Grid from '@mui/material/Grid'
import { Breadcrumbs } from '@mui/material'
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

// Component Imports
import StyledBreadcrumb from '@/components/layout/shared/Breadcrumbs'

// Action Imports
import { getReturnWaybillsByTrip } from '@/libs/actions/returnwaybill.actions'

// Hook Imports
import { usePermissions } from '@/hooks/usePermissions'

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
      return 'info'
    case 'awaiting_manifests':
      return 'warning'
    case 'cancelled':
    case 'canceled':
      return 'error'
    default:
      return 'default'
  }
}

const TripView = ({ tripData }: { tripData: any }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'manifests' | 'checkpoints' | 'returns'>('manifests')
  const [returnWaybills, setReturnWaybills] = useState<any[]>([])
  const [loadingReturns, setLoadingReturns] = useState(false)
  
  const router = useRouter()
  const { hasPermission } = usePermissions()

  // Parse checkpoints
  const checkpoints = parseJSON(tripData.checkpoints)
  
  // Calculate manifest progress
  const manifests = tripData.manifests || []
  const completedManifests = manifests.filter((m: any) => 
    m.status === 'delivered' || m.status === 'completed'
  ).length
  
  // Calculate return waybills progress
  const completedReturns = returnWaybills.filter((rw: any) => 
    rw.status === 'delivered' || rw.status === 'processed'
  ).length
  
  // Combined progress: manifests + return waybills (if any returns exist)
  // A trip is only complete when all manifests AND all return waybills are done
  const totalItems = manifests.length + (returnWaybills.length > 0 ? returnWaybills.length : 0)
  const completedItems = completedManifests + completedReturns
  const progressPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0

  // Fetch return waybills on mount and when tab changes
  useEffect(() => {
    if (tripData.$id) {
      setLoadingReturns(true)
      getReturnWaybillsByTrip(tripData.$id)
        .then(data => {
          setReturnWaybills(data)
        })
        .catch(err => {
          console.error('Error fetching return waybills:', err)
        })
        .finally(() => {
          setLoadingReturns(false)
        })
    }
  }, [tripData.$id])

  return (
    <>
      <Typography className='mt-4' variant='h4'>Trip Details - {tripData.tripNumber}</Typography>
      <Divider className='my-8' />
      <Breadcrumbs aria-label="breadcrumb" className='mt-10 ml-5 mb-5'>
        <StyledBreadcrumb 
          component="a"
          onClick={() => router.back()}
          icon={<i className='ri-menu-4-line' />}
          className='cursor-pointer'
          label="Back" 
        />
        <StyledBreadcrumb
          label="Details"
          icon={<i className='ri-stack-line' />}
          className='cursor-pointer'
          disabled
        />
      </Breadcrumbs>
      
      {/* Header Info */}
      <Card className='mb-6'>
        <CardContent>
          <div className='flex items-start justify-between flex-wrap gap-4'>
            <div className='flex flex-wrap items-center gap-2'>
              <Typography variant='body2' color='text.secondary'>
                Status:
              </Typography>
              <Chip
                label={tripData.status?.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                variant='tonal'
                color={getStatusColor(tripData.status)}
                size='small'
              />
              {tripData.status === 'awaiting_manifests' && (
                <Chip
                  label='Needs Manifests'
                  variant='tonal'
                  color='warning'
                  size='small'
                  icon={<i className='ri-alert-line' />}
                />
              )}
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
              {tripData.status === 'awaiting_manifests' && hasPermission('manifests.create') && (
                <Button
                  variant='contained'
                  size='small'
                  color='warning'
                  startIcon={<i className='ri-file-add-line' />}
                  onClick={() => router.push(`/edms/trips/${tripData.$id}/add-manifests`)}
                >
                  Add Manifests
                </Button>
              )}
              {hasPermission('deliveries.create') && (
                <Button
                  variant='outlined'
                  size='small'
                  color='warning'
                  startIcon={<i className='ri-arrow-go-back-line' />}
                  onClick={() => router.push(`/edms/returns/waybills/create?tripId=${tripData.$id}`)}
                >
                  Create Return
                </Button>
              )}
              <Button
                variant='outlined'
                size='small'
                startIcon={<i className='ri-printer-line' />}
              >
                Print
              </Button>
              {hasPermission('trips.edit') && (
                <Button
                  variant='contained'
                  size='small'
                  startIcon={<i className='ri-edit-line' />}
                >
                  Edit
                </Button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {manifests.length > 0 && (
            <Box className='mt-6'>
              <div className='flex items-center justify-between mb-2'>
                <Typography variant='body2'>
                  Trip Progress {returnWaybills.length > 0 ? '(Manifests + Returns)' : '(Manifests)'}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {completedManifests}/{manifests.length} manifests
                  {returnWaybills.length > 0 && ` • ${completedReturns}/${returnWaybills.length} returns`}
                </Typography>
              </div>
              <LinearProgress
                variant='determinate'
                value={progressPercentage}
                className='h-2 rounded'
                color={progressPercentage === 100 ? 'success' : 'primary'}
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
          variant='scrollable'
          scrollButtons='auto'
          allowScrollButtonsMobile
        >
          <Tab
            label={`Manifests (${tripData.manifests?.length || 0})`}
            value='manifests'
            icon={<i className='ri-file-list-3-line' />}
            iconPosition='start'
          />
          <Tab
            label={`Returns (${returnWaybills.length})`}
            value='returns'
            icon={<i className='ri-arrow-go-back-line' />}
            iconPosition='start'
          />
          <Tab
            label='Overview'
            value='overview'
            icon={<i className='ri-dashboard-line' />}
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
                        {/* <TableCell>Departure Time</TableCell> */}
                        <TableCell>Arrival Time</TableCell>
                        <TableCell align='right'>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tripData.manifests.map((manifest: any) => {
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
                              <Typography>{manifest.packageCount} packages</Typography>
                              {manifest.packageSize && (
                              <Chip
                                label={manifest.packageSize.charAt(0).toUpperCase() + manifest.packageSize.slice(1)}
                                variant='outlined'
                                color="primary"
                                size='small'
                              />
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
                            {/* <TableCell>
                              <Typography variant='body2'>
                                {manifest.departureTime ? new Date(manifest.departureTime).toLocaleString() : 'Not departed'}
                              </Typography>
                            </TableCell> */}
                            <TableCell>
                              <Typography variant='body2'>
                                {manifest.arrivalTime ? new Date(manifest.arrivalTime).toLocaleString() : 'Not arrived'}
                              </Typography>
                            </TableCell>
                            <TableCell align='right'>
                              <div className='flex items-center justify-end gap-2'>
                                {(manifestStatus === 'delivered' || manifestStatus === 'completed' || manifestStatus === 'in-progress') && (
                                  <Button 
                                    size='small' 
                                    variant='outlined'
                                    color='warning'
                                    onClick={() => {
                                      const dropoffId = dropoffLocation && typeof dropoffLocation === 'object' ? dropoffLocation.$id : ''
                                      const dropoffName = encodeURIComponent(
                                        dropoffLocation && typeof dropoffLocation === 'object'
                                          ? dropoffLocation.locationName || dropoffLocation.address || ''
                                          : ''
                                      )
                                      router.push(
                                        `/edms/returns/waybills/create?tripId=${tripData.$id}&dropoffId=${dropoffId}&dropoffName=${dropoffName}&manifestId=${manifest.$id}`
                                      )
                                    }}
                                  >
                                    <i className='ri-arrow-go-back-line mr-1' />
                                    Return
                                  </Button>
                                )}
                                <Link href={`/edms/manifests/${manifest.$id}`} passHref>
                                  <Button size='small' variant='outlined'>
                                    View
                                  </Button>
                                </Link>
                              </div>
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
                                    Manifest: {checkpoint.manifestNumber || 'Not assigned'}
                                  </Typography>
                                    <Chip
                                      label={checkpoint.packageSize?.charAt(0).toUpperCase() + checkpoint.packageSize?.slice(1).replace('_', ' ')}
                                      variant='outlined'
                                      color={'secondary'}
                                      size='small'
                                    />
                                </div>
                                {/* Add Return Waybill Button - visible when checkpoint is completed or in-progress */}
                                {(isCompleted || isInProgress) && (
                                  <Button
                                    variant='outlined'
                                    size='small'
                                    color='warning'
                                    startIcon={<i className='ri-arrow-go-back-line' />}
                                    onClick={() => {
                                      const dropoffId = checkpoint.dropoffLocationId || checkpoint.dropofflocation?.$id
                                      const dropoffName = encodeURIComponent(checkpoint.dropoffLocationName || '')
                                      const manifestIdParam = checkpoint.manifestId || ''
                                      router.push(
                                        `/edms/returns/waybills/create?tripId=${tripData.$id}&dropoffId=${dropoffId}&dropoffName=${dropoffName}&manifestId=${manifestIdParam}`
                                      )
                                    }}
                                  >
                                    Add Return
                                  </Button>
                                )}
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
                                {checkpoint.completionTime && (
                                  <Typography variant='caption' color='text.secondary' className='block'>
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

          {/* Returns Tab */}
          {activeTab === 'returns' && (
            <div className='overflow-x-auto'>
              {loadingReturns ? (
                <div className='text-center py-12'>
                  <Typography variant='body2' color='text.secondary'>
                    Loading return waybills...
                  </Typography>
                </div>
              ) : returnWaybills.length > 0 ? (
                <TableContainer component={Paper} variant='outlined'>
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Waybill Number</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Return Reason</TableCell>
                        <TableCell>Pickup Location</TableCell>
                        <TableCell>Dropoff Location</TableCell>
                        <TableCell>Package Count</TableCell>
                        <TableCell>Return Date</TableCell>
                        <TableCell align='right'>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {returnWaybills.map((waybill: any) => {
                        const pickupLoc = waybill.pickuplocation
                        const dropoffLoc = waybill.dropofflocation

                        return (
                          <TableRow key={waybill.$id} hover>
                            <TableCell>
                              <Typography className='font-medium'>
                                {waybill.waybillNumber}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={waybill.status?.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                variant='tonal'
                                color={getStatusColor(waybill.status)}
                                size='small'
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2'>
                                {waybill.returnReason?.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2'>
                                {pickupLoc && typeof pickupLoc === 'object'
                                  ? pickupLoc.locationName || pickupLoc.address || pickupLoc.city
                                  : pickupLoc || 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2'>
                                {dropoffLoc && typeof dropoffLoc === 'object'
                                  ? dropoffLoc.locationName || dropoffLoc.address || dropoffLoc.city
                                  : dropoffLoc || 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2'>
                                {waybill.packageCount || 0} packages
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2'>
                                {waybill.returnDate 
                                  ? new Date(waybill.returnDate).toLocaleDateString() 
                                  : 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell align='right'>
                              <Button 
                                size='small' 
                                variant='outlined'
                                onClick={() => router.push(`/edms/returns/waybills/${waybill.$id}`)}
                              >
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <div className='text-center py-12'>
                  <i className='ri-arrow-go-back-line text-6xl text-textSecondary mb-2' />
                  <Typography variant='h6' color='text.secondary'>
                    No return waybills found
                  </Typography>
                  <Typography variant='body2' color='text.secondary' className='mb-4'>
                    This trip doesn't have any return waybills yet
                  </Typography>
                  {hasPermission('deliveries.create') && (
                    <Button
                      variant='contained'
                      startIcon={<i className='ri-add-line' />}
                      onClick={() => router.push(`/edms/returns/waybills/create?tripId=${tripData.$id}`)}
                    >
                      Create Return Waybill
                    </Button>
                  )}
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
