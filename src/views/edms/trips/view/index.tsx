'use client'

// React Imports
import { useState, useEffect, useRef } from 'react'

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

// Third-party Imports
import { toast } from 'react-toastify'

// Component Imports
import StyledBreadcrumb from '@/components/layout/shared/Breadcrumbs'
import DeleteConfirmationDialog from '@/components/dialogs/delete-confirmation-dialog'
import LogDeliveryDialog from '@/views/edms/trips/LogDeliveryDialog'
import LogReturnDialog from '@/views/edms/trips/LogReturnDialog'

// Action Imports
import { getReturnWaybillsByTrip, isReturnWaybillAwaitingVerification } from '@/libs/actions/returnwaybill.actions'
import { getRouteDropoffLocations } from '@/libs/actions/route.actions'
import { deleteTrip } from '@/libs/actions/trip.actions'
import { isManifestAwaitingVerification } from '@/libs/actions/manifest.actions'

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

const TripView = ({ tripData, onRefresh }: { tripData: any; onRefresh?: () => void }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'manifests' | 'checkpoints' | 'returns'>('manifests')
  const [logDeliveryOpen, setLogDeliveryOpen] = useState(false)
  const [logReturnOpen, setLogReturnOpen] = useState(false)
  const [returnWaybills, setReturnWaybills] = useState<any[]>([])
  const [loadingReturns, setLoadingReturns] = useState(false)
  const [routeStopCount, setRouteStopCount] = useState<number | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)

  const router = useRouter()
  const { hasPermission, canViewFinancials, isAdmin, isDriver } = usePermissions()

  const handleConfirmDelete = async (deletedBy: string) => {
    try {
      setIsDeleting(true)
      const result = await deleteTrip(tripData.$id, deletedBy)

      if (result.success) {
        toast.success('Trip deleted successfully')
        router.push('/edms/trips')
      } else {
        toast.error(result.error || 'Failed to delete trip')
        setIsDeleting(false)
      }
    } catch (error: any) {
      console.error('Error deleting trip:', error)
      toast.error(error?.message || 'Failed to delete trip')
      setIsDeleting(false)
    }
  }

  // Parse checkpoints
  const checkpoints = parseJSON(tripData.checkpoints)
  
  // Calculate manifest progress
  const manifests = tripData.manifests || []
  const completedManifests = manifests.filter((m: any) => 
    m.status === 'delivered' || m.status === 'completed'
  ).length

  // Manifests the driver captured in the field that the office has not priced up yet.
  const awaitingReviewCount = manifests.filter(isManifestAwaitingVerification).length

  // A field-captured trip grows its manifests one stop at a time, so "manifests
  // delivered / manifests" reads 100% from the first stop. Measure those trips
  // against the route's dropoff stops instead - the same rule trip completion uses.
  const isFieldCapturedTrip = manifests.some(isManifestAwaitingVerification)
  const coveredStopCount = new Set(
    manifests
      .filter((m: any) => m.status === 'delivered' || m.status === 'completed')
      .map((m: any) => (typeof m.dropofflocation === 'object' && m.dropofflocation !== null ? m.dropofflocation.$id : m.dropofflocation))
      .filter(Boolean)
  ).size
  const useStopProgress = isFieldCapturedTrip && routeStopCount !== null && routeStopCount > 0

  // Field staff log deliveries straight from the trip while it is still running.
  const tripIsClosed = ['completed', 'cancelled', 'canceled', 'deleted'].includes(tripData.status)
  const canLogDelivery =
    !tripIsClosed && (isDriver || hasPermission('deliveries.proof') || hasPermission('manifests.create'))
  
  // Calculate return waybills progress
  const completedReturns = returnWaybills.filter((rw: any) => 
    rw.status === 'delivered' || rw.status === 'processed'
  ).length

  // Returns the driver logged in the field that the office has not entered figures for.
  const returnsAwaitingReviewCount = returnWaybills.filter(isReturnWaybillAwaitingVerification).length

  // Returns still on the truck - the trip cannot close until they are handed back.
  const returnsInTransit = returnWaybills.filter((rw: any) => rw.status === 'in_transit' || rw.status === 'pending')
  
  // Combined progress: manifests + return waybills (if any returns exist)
  // A trip is only complete when all manifests AND all return waybills are done
  const deliveryTotal = useStopProgress ? (routeStopCount as number) : manifests.length
  const deliveryDone = useStopProgress ? Math.min(coveredStopCount, deliveryTotal) : completedManifests
  const totalItems = deliveryTotal + (returnWaybills.length > 0 ? returnWaybills.length : 0)
  const completedItems = deliveryDone + completedReturns
  const progressPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0

  // Fetch return waybills on mount and after the driver logs one
  const loadReturnWaybills = () => {
    if (!tripData.$id) return

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

  useEffect(() => {
    loadReturnWaybills()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripData.$id])

  // Only field-captured trips need the route's stop count for their progress bar.
  const routeId = typeof tripData.route === 'object' && tripData.route !== null ? tripData.route.$id : tripData.route

  useEffect(() => {
    if (!isFieldCapturedTrip || !routeId) return

    let cancelled = false

    getRouteDropoffLocations(routeId)
      .then(stops => {
        if (!cancelled) setRouteStopCount(stops.length || null)
      })
      .catch(err => console.warn('Could not count route stops for progress:', err))

    return () => {
      cancelled = true
    }
  }, [isFieldCapturedTrip, routeId])

  const handleReturnLogged = () => {
    loadReturnWaybills()
    setActiveTab('returns')
    onRefresh?.()
  }

  // Keep the tab strip pinned to the start when the first tab (Manifests) is
  // active. On narrow screens MUI's scroll-into-view over-scrolls the selected
  // first tab, clipping it behind the start scroll button. Runs after MUI's own
  // layout effect so our reset wins.
  useEffect(() => {
    if (activeTab !== 'manifests') return
    let raf = 0
    const start = performance.now()
    const pin = () => {
      const scroller = tabsRef.current?.querySelector<HTMLElement>('.MuiTabs-scroller')
      if (scroller && scroller.scrollLeft !== 0) scroller.scrollLeft = 0
      if (performance.now() - start < 450) raf = requestAnimationFrame(pin)
    }
    raf = requestAnimationFrame(pin)
    return () => cancelAnimationFrame(raf)
  }, [activeTab])

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
              {canLogDelivery && (
                <Button
                  variant='contained'
                  size='small'
                  color='success'
                  startIcon={<i className='ri-camera-line' />}
                  onClick={() => setLogDeliveryOpen(true)}
                >
                  Log Delivery
                </Button>
              )}
              {canLogDelivery && (
                <Button
                  variant='contained'
                  size='small'
                  color='warning'
                  startIcon={<i className='ri-arrow-go-back-line' />}
                  onClick={() => setLogReturnOpen(true)}
                >
                  Log Return
                </Button>
              )}
              {/* The full manifest form is the office's tool; drivers use Log Delivery instead. */}
              {!isDriver && tripData.status === 'awaiting_manifests' && hasPermission('manifests.create') && (
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
              {!isDriver && hasPermission('deliveries.create') && (
                <Button
                  variant='outlined'
                  size='small'
                  color='warning'
                  startIcon={<i className='ri-file-add-line' />}
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
              {isAdmin && (
                <Button
                  variant='contained'
                  size='small'
                  startIcon={<i className='ri-edit-line' />}
                  onClick={() => router.push(`/edms/trips/${tripData.$id}/edit`)}
                >
                  Edit
                </Button>
              )}
              {hasPermission('trips.delete') && (
                <Button
                  variant='outlined'
                  size='small'
                  color='error'
                  startIcon={<i className='ri-delete-bin-7-line' />}
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={isDeleting}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {manifests.length > 0 && (
            <Box className='mt-6'>
              <div className='flex items-center justify-between mb-2'>
                <Typography variant='body2'>
                  Trip Progress {useStopProgress ? '(Stops' : '(Manifests'}
                  {returnWaybills.length > 0 ? ' + Returns)' : ')'}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {useStopProgress ? `${deliveryDone}/${deliveryTotal} stops` : `${completedManifests}/${manifests.length} manifests`}
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

      {/* Office prompt: the driver has logged stops that still need their figures. */}
      {!isDriver && awaitingReviewCount > 0 && (
        <Card className='mb-6 border border-warning'>
          <CardContent className='flex flex-col sm:flex-row sm:items-center gap-4'>
            <Avatar variant='rounded' sx={{ width: 48, height: 48, bgcolor: 'warning.main', color: 'common.white' }}>
              <i className='ri-file-search-line text-2xl' />
            </Avatar>
            <div className='flex-1'>
              <Typography variant='h6'>
                {awaitingReviewCount} manifest{awaitingReviewCount === 1 ? '' : 's'} awaiting your details
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                The driver logged {awaitingReviewCount === 1 ? 'this delivery' : 'these deliveries'} with a photo. Enter
                the manifest number, package size and quantity to finish the record.
              </Typography>
            </div>
            <Button
              variant='contained'
              color='warning'
              startIcon={<i className='ri-edit-box-line' />}
              onClick={() => router.push(`/edms/manifests/review?tripId=${tripData.$id}`)}
              className='max-sm:is-full'
            >
              Review Manifests
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Office prompt: the driver has logged returns that still need their figures. */}
      {!isDriver && returnsAwaitingReviewCount > 0 && (
        <Card className='mb-6 border border-warning'>
          <CardContent className='flex flex-col sm:flex-row sm:items-center gap-4'>
            <Avatar variant='rounded' sx={{ width: 48, height: 48, bgcolor: 'warning.main', color: 'common.white' }}>
              <i className='ri-arrow-go-back-line text-2xl' />
            </Avatar>
            <div className='flex-1'>
              <Typography variant='h6'>
                {returnsAwaitingReviewCount} return{returnsAwaitingReviewCount === 1 ? '' : 's'} awaiting your details
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                The driver logged {returnsAwaitingReviewCount === 1 ? 'this return' : 'these returns'} with a photo of
                the waybill. Enter the package count and reason to finish the record.
              </Typography>
            </div>
            <Button
              variant='contained'
              color='warning'
              startIcon={<i className='ri-edit-box-line' />}
              onClick={() => router.push(`/edms/returns/waybills/review?tripId=${tripData.$id}`)}
              className='max-sm:is-full'
            >
              Review Returns
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Field capture call-to-action. Drivers land here with paperwork in hand and
          need one obvious, thumb-sized target - not a form. */}
      {canLogDelivery && (
        <Card className='mb-6 border border-success'>
          <CardContent className='flex flex-col sm:flex-row sm:items-center gap-4'>
            <Avatar variant='rounded' sx={{ width: 48, height: 48, bgcolor: 'success.main', color: 'common.white' }}>
              <i className='ri-camera-line text-2xl' />
            </Avatar>
            <div className='flex-1'>
              <Typography variant='h6'>Delivered a stop?</Typography>
              <Typography variant='body2' color='text.secondary'>
                Pick the stop and snap the manifest. No package counts needed &mdash; the office fills those in.
              </Typography>
            </div>
            <Button
              variant='contained'
              color='success'
              size='large'
              startIcon={<i className='ri-camera-line' />}
              onClick={() => setLogDeliveryOpen(true)}
              className='max-sm:is-full'
            >
              Log Delivery
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Same idea for goods coming back: one photo of the return waybill at the stop. */}
      {canLogDelivery && (
        <Card className='mb-6 border border-warning'>
          <CardContent className='flex flex-col sm:flex-row sm:items-center gap-4'>
            <Avatar variant='rounded' sx={{ width: 48, height: 48, bgcolor: 'warning.main', color: 'common.white' }}>
              <i className='ri-arrow-go-back-line text-2xl' />
            </Avatar>
            <div className='flex-1'>
              <Typography variant='h6'>Taking goods back?</Typography>
              <Typography variant='body2' color='text.secondary'>
                Pick the stop and snap the return waybill. Hand it over at the depot when you get back &mdash; the office
                enters the counts.
              </Typography>
              {returnsInTransit.length > 0 && (
                <Typography variant='body2' color='warning.main' className='mt-1 font-medium'>
                  {returnsInTransit.length} return{returnsInTransit.length === 1 ? '' : 's'} on the truck &mdash; open the
                  Returns tab to confirm handover when you are back.
                </Typography>
              )}
            </div>
            <Button
              variant='contained'
              color='warning'
              size='large'
              startIcon={<i className='ri-camera-line' />}
              onClick={() => setLogReturnOpen(true)}
              className='max-sm:is-full'
            >
              Log Return
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Card>
        <Tabs
          ref={tabsRef}
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
              {canViewFinancials && (tripData.clientRate || tripData.driverRate || tripData.profit || tripData.invoiceAmount) && (
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
                        const needsReview = isManifestAwaitingVerification(manifest)

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
                              {needsReview && (
                                <Chip
                                  label='Needs review'
                                  size='small'
                                  color='warning'
                                  variant='tonal'
                                  className='mt-1'
                                  icon={<i className='ri-error-warning-line' />}
                                />
                              )}
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
                              {needsReview ? (
                                <Typography variant='body2' color='text.secondary'>
                                  Pending office entry
                                </Typography>
                              ) : (
                                <>
                                  <Typography>{manifest.packageCount || 0} packages</Typography>
                                  {manifest.packageSize && (
                                    <Chip
                                      label={manifest.packageSize.charAt(0).toUpperCase() + manifest.packageSize.slice(1)}
                                      variant='outlined'
                                      color='primary'
                                      size='small'
                                    />
                                  )}
                                </>
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
                                {!isDriver && (manifestStatus === 'delivered' || manifestStatus === 'completed' || manifestStatus === 'in-progress') && (
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
                                {!isDriver && (isCompleted || isInProgress) && (
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
                              {isReturnWaybillAwaitingVerification(waybill) ? (
                                <Chip
                                  label={isDriver ? 'Pending office entry' : 'Needs review'}
                                  size='small'
                                  color='warning'
                                  variant='tonal'
                                  icon={<i className='ri-error-warning-line' />}
                                />
                              ) : (
                                <Typography variant='body2'>
                                  {waybill.packageCount || 0} packages
                                </Typography>
                              )}
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
                                variant={waybill.status === 'in_transit' && canLogDelivery ? 'contained' : 'outlined'}
                                color={waybill.status === 'in_transit' && canLogDelivery ? 'success' : 'primary'}
                                onClick={() => router.push(`/edms/returns/waybills/${waybill.$id}`)}
                              >
                                {waybill.status === 'in_transit' && canLogDelivery ? 'Confirm Handover' : 'View'}
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
                  {canLogDelivery ? (
                    <Button
                      variant='contained'
                      color='warning'
                      startIcon={<i className='ri-camera-line' />}
                      onClick={() => setLogReturnOpen(true)}
                    >
                      Log Return
                    </Button>
                  ) : hasPermission('deliveries.create') ? (
                    <Button
                      variant='contained'
                      startIcon={<i className='ri-add-line' />}
                      onClick={() => router.push(`/edms/returns/waybills/create?tripId=${tripData.$id}`)}
                    >
                      Create Return Waybill
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <LogDeliveryDialog
        open={logDeliveryOpen}
        onClose={() => setLogDeliveryOpen(false)}
        tripData={tripData}
        onLogged={onRefresh}
      />

      <LogReturnDialog
        open={logReturnOpen}
        onClose={() => setLogReturnOpen(false)}
        tripData={tripData}
        onLogged={handleReturnLogged}
      />

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        setOpen={setDeleteDialogOpen}
        title={`Delete trip ${tripData.tripNumber}?`}
        description='This action cannot be undone.'
        confirmButtonText='Yes, Delete Trip'
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}

export default TripView
