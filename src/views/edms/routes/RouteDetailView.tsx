'use client'

// React Imports
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Timeline from '@mui/lab/Timeline'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineConnector from '@mui/lab/TimelineConnector'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineDot from '@mui/lab/TimelineDot'
import { Breadcrumbs } from '@mui/material'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'

// Component Imports
import Link from '@/components/Link'
import StyledBreadcrumb from '@/components/layout/shared/Breadcrumbs'

// Type Imports
import type { RouteType, DropoffLocationType, PickupLocationType } from '@/types/apps/deliveryTypes'

// Actions Imports
import { deleteRoute, updateRoute, toggleRouteStatus, getRouteById } from '@/libs/actions/route.actions'
import { getAllDropoffLocations } from '@/libs/actions/location.actions'
import { toast } from 'react-toastify'

// Context
import { useAuth } from '@/contexts/AppwriteProvider'

// ==========================================
// Interfaces
// ==========================================

interface RouteDetailViewProps {
  route: RouteType
}

interface LocationDetailDialogProps {
  open: boolean
  onClose: () => void
  location: any | null
  locationType: 'pickup' | 'dropoff'
}

// ==========================================
// Helper Functions
// ==========================================

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDuration = (minutes?: number) => {
  if (!minutes) return 'N/A'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMins = minutes % 60
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
}

const formatDistance = (km?: number) => {
  if (!km) return 'N/A'
  return `${km.toLocaleString()} km`
}

const formatCurrency = (amount?: number) => {
  if (!amount && amount !== 0) return 'N/A'
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount)
}

// ==========================================
// Location Detail Dialog Component
// ==========================================

const LocationDetailDialog = ({ open, onClose, location, locationType }: LocationDetailDialogProps) => {
  if (!location) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle>
        <div className='flex items-center gap-2'>
          <i className={locationType === 'pickup' ? 'ri-map-pin-2-fill text-success text-xl' : 'ri-map-pin-fill text-error text-xl'} />
          {locationType === 'pickup' ? 'Pickup' : 'Dropoff'} Location Details
        </div>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Typography variant='h6' gutterBottom>
              Basic Information
            </Typography>
            <Box mb={2}>
              <Typography variant='body2' color='text.secondary'>Location Name</Typography>
              <Typography variant='body1' fontWeight='medium'>{location.locationName || 'N/A'}</Typography>
            </Box>
            <Box mb={2}>
              <Typography variant='body2' color='text.secondary'>Location Code</Typography>
              <Typography variant='body1'>{location.locationCode || 'N/A'}</Typography>
            </Box>
            <Box mb={2}>
              <Typography variant='body2' color='text.secondary'>Status</Typography>
              <Chip
                label={location.isActive ? 'Active' : 'Inactive'}
                color={location.isActive ? 'success' : 'default'}
                size='small'
                variant='outlined'
              />
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant='h6' gutterBottom>
              Address
            </Typography>
            <Box mb={2}>
              <Typography variant='body1'>{location.address || 'N/A'}</Typography>
              <Typography variant='body1'>
                {[location.city, location.region].filter(Boolean).join(', ') || 'N/A'}
              </Typography>
              {location.country && (
                <Typography variant='body2' color='text.secondary'>{location.country}</Typography>
              )}
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant='h6' gutterBottom>
              Contact Information
            </Typography>
            {location.contactPerson ? (
              <Box mb={1}>
                <Typography variant='body2' color='text.secondary'>Contact Person</Typography>
                <Typography variant='body1'>{location.contactPerson}</Typography>
              </Box>
            ) : (
              <Typography variant='body2' color='text.secondary'>No contact person specified</Typography>
            )}
            {location.contactPhone && (
              <Box mb={1}>
                <Typography variant='body2' color='text.secondary'>Phone</Typography>
                <Typography variant='body1'>{location.contactPhone}</Typography>
              </Box>
            )}
          </Grid>

          {location.gpsCoordinates && (
            <Grid item xs={12} sm={6}>
              <Typography variant='h6' gutterBottom>
                GPS Coordinates
              </Typography>
              <Typography variant='body1' sx={{ mb: 1 }}>
                {location.gpsCoordinates}
              </Typography>
              <Button
                variant='outlined'
                size='small'
                startIcon={<i className='ri-map-pin-line' />}
                onClick={() => window.open(`https://maps.google.com/?q=${location.gpsCoordinates}`, '_blank')}
              >
                View on Google Maps
              </Button>
            </Grid>
          )}

          {(location.$createdAt || location.$updatedAt) && (
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Box display='flex' gap={4} mt={1}>
                {location.$createdAt && (
                  <Box>
                    <Typography variant='body2' color='text.secondary'>Created</Typography>
                    <Typography variant='body2'>{formatDate(location.$createdAt)}</Typography>
                  </Box>
                )}
                {location.$updatedAt && (
                  <Box>
                    <Typography variant='body2' color='text.secondary'>Last Updated</Typography>
                    <Typography variant='body2'>{formatDate(location.$updatedAt)}</Typography>
                  </Box>
                )}
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

// ==========================================
// Main RouteDetailView Component
// ==========================================

const RouteDetailView = ({ route: initialRoute }: RouteDetailViewProps) => {
  const router = useRouter()
  const { user } = useAuth()
  const isAdmin = user?.role?.name === 'admin'

  // State
  const [route, setRoute] = useState(initialRoute)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [locationDialogOpen, setLocationDialogOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<any | null>(null)
  const [selectedLocationType, setSelectedLocationType] = useState<'pickup' | 'dropoff'>('pickup')
  const [removeStopDialogOpen, setRemoveStopDialogOpen] = useState(false)
  const [stopToRemove, setStopToRemove] = useState<any | null>(null)
  const [isRemovingStop, setIsRemovingStop] = useState(false)
  const [changeEndDialogOpen, setChangeEndDialogOpen] = useState(false)
  const [availableDropoffs, setAvailableDropoffs] = useState<DropoffLocationType[]>([])
  const [newEndLocation, setNewEndLocation] = useState<DropoffLocationType | null>(null)
  const [isChangingEnd, setIsChangingEnd] = useState(false)
  const [loadingDropoffs, setLoadingDropoffs] = useState(false)

  // Extract populated relationships
  const startLocation = route.startLocation as any
  const endLocation = route.endLocation as any
  const intermediateStops = (route.intermediateStops || []) as any[]

  // ==========================================
  // Handlers
  // ==========================================

  const handleRefresh = useCallback(async () => {
    try {
      const refreshedRoute = await getRouteById(route.$id)
      setRoute(refreshedRoute)
    } catch (error) {
      console.error('Error refreshing route:', error)
    }
  }, [route.$id])

  const handleViewLocation = (location: any, type: 'pickup' | 'dropoff') => {
    setSelectedLocation(location)
    setSelectedLocationType(type)
    setLocationDialogOpen(true)
  }

  const handleToggleStatus = async () => {
    try {
      await toggleRouteStatus(route.$id)
      toast.success(route.isActive ? 'Route deactivated' : 'Route activated')
      await handleRefresh()
    } catch (error) {
      console.error('Error toggling status:', error)
      toast.error('Failed to update route status')
    }
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      setDeleteError(null)
      await deleteRoute(route.$id)
      toast.success(`Route "${route.routeName}" deleted successfully`)
      router.push('/edms/routes')
    } catch (error: any) {
      console.error('Error deleting route:', error)
      setDeleteError(error?.message || 'Failed to delete route')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRemoveStopClick = (stop: any) => {
    setStopToRemove(stop)
    setRemoveStopDialogOpen(true)
  }

  const handleConfirmRemoveStop = async () => {
    if (!stopToRemove) return

    try {
      setIsRemovingStop(true)
      const stopId = stopToRemove.$id || stopToRemove.locationId
      const updatedStops = intermediateStops
        .filter((s: any) => {
          const sId = s.$id || s.locationId
          return sId !== stopId
        })
        .map((s: any) => (typeof s === 'string' ? s : s.$id || s.locationId))

      await updateRoute(route.$id, { intermediateStops: updatedStops as any })
      toast.success(`Removed "${stopToRemove.locationName || 'stop'}" from route`)
      setRemoveStopDialogOpen(false)
      setStopToRemove(null)
      await handleRefresh()
    } catch (error: any) {
      console.error('Error removing stop:', error)
      toast.error(error?.message || 'Failed to remove intermediate stop')
    } finally {
      setIsRemovingStop(false)
    }
  }

  const handleChangeEndClick = async () => {
    try {
      setLoadingDropoffs(true)
      const dropoffs = await getAllDropoffLocations({ isActive: true })
      setAvailableDropoffs(dropoffs)
      setChangeEndDialogOpen(true)
    } catch (error) {
      console.error('Error loading dropoff locations:', error)
      toast.error('Failed to load dropoff locations')
    } finally {
      setLoadingDropoffs(false)
    }
  }

  const handleConfirmChangeEnd = async () => {
    if (!newEndLocation) return

    try {
      setIsChangingEnd(true)
      await updateRoute(route.$id, {
        endLocation: newEndLocation.$id
      })
      toast.success(`End location changed to "${newEndLocation.locationName}"`)
      setChangeEndDialogOpen(false)
      setNewEndLocation(null)
      await handleRefresh()
    } catch (error: any) {
      console.error('Error changing end location:', error)
      toast.error(error?.message || 'Failed to change end location')
    } finally {
      setIsChangingEnd(false)
    }
  }

  // ==========================================
  // Render
  // ==========================================

  return (
    <div className='flex flex-col gap-6'>
      {/* Breadcrumbs & Actions */}
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <Breadcrumbs aria-label='breadcrumb'>
          <StyledBreadcrumb
            component='a'
            label='Dashboard'
            onClick={() => router.push('/dashboard')}
            icon={<i className='ri-home-line' />}
            className='cursor-pointer'
          />
          <StyledBreadcrumb
            component='a'
            label='Routes'
            onClick={() => router.push('/edms/routes')}
            icon={<i className='ri-route-line' />}
            className='cursor-pointer'
          />
          <StyledBreadcrumb label={route.routeName || route.routeCode} disabled />
        </Breadcrumbs>
        <div className='flex gap-2'>
          <Button
            variant='outlined'
            color={route.isActive ? 'warning' : 'success'}
            startIcon={<i className={route.isActive ? 'ri-close-circle-line' : 'ri-checkbox-circle-line'} />}
            onClick={handleToggleStatus}
          >
            {route.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          {isAdmin && (
            <Button
              variant='outlined'
              color='error'
              startIcon={<i className='ri-delete-bin-line' />}
              onClick={() => { setDeleteDialogOpen(true); setDeleteError(null) }}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Header Card */}
      <Card>
        <CardContent>
          <div className='flex flex-wrap items-start justify-between gap-4'>
            <div>
              <div className='flex items-center gap-3 mb-2'>
                <i className='ri-route-line text-3xl text-primary' />
                <Typography variant='h4'>{route.routeName}</Typography>
                <Chip
                  label={route.isActive ? 'Active' : 'Inactive'}
                  color={route.isActive ? 'success' : 'secondary'}
                  variant='tonal'
                />
              </div>
              <Typography variant='body1' color='text.secondary'>
                Route Code: <strong>{route.routeCode}</strong>
              </Typography>
            </div>
            <div className='text-right'>
              <Box display='flex' gap={4} justifyContent='flex-end'>
                <Box>
                  <Typography variant='body2' color='text.secondary'>Distance</Typography>
                  <Typography variant='h5' color='primary'>{formatDistance(route.distance)}</Typography>
                </Box>
                <Box>
                  <Typography variant='body2' color='text.secondary'>Est. Duration</Typography>
                  <Typography variant='h5' color='primary'>{formatDuration(route.estimatedDuration)}</Typography>
                </Box>
              </Box>
              {route.baseRate > 0 && (
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                  Base Rate: <strong>{formatCurrency(route.baseRate)}</strong>
                </Typography>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Grid container spacing={6}>
        {/* Route Timeline / Map */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              title='Route Path'
              subheader={`${1 + intermediateStops.length + 1} stops total — from pickup to final destination`}
              action={
                <Chip
                  label={`${intermediateStops.length} intermediate stop${intermediateStops.length !== 1 ? 's' : ''}`}
                  color='info'
                  variant='tonal'
                  size='small'
                />
              }
            />
            <CardContent>
              <Timeline position='right' sx={{ p: 0, m: 0 }}>
                {/* Start Location */}
                <TimelineItem sx={{ '&::before': { display: 'none' } }}>
                  <TimelineSeparator>
                    <TimelineDot color='success' variant='filled'>
                      <i className='ri-flag-line text-base' />
                    </TimelineDot>
                    {(intermediateStops.length > 0 || endLocation) && <TimelineConnector />}
                  </TimelineSeparator>
                  <TimelineContent sx={{ py: '12px', px: 2 }}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'success.main',
                        bgcolor: 'success.lighter',
                        cursor: 'pointer',
                        '&:hover': { boxShadow: 2 },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                      onClick={() => handleViewLocation(startLocation, 'pickup')}
                    >
                      <Box>
                        <Chip label='START — Pickup Location' color='success' size='small' sx={{ mb: 1 }} />
                        <Typography variant='subtitle1' fontWeight='bold'>
                          {typeof startLocation === 'object' ? startLocation.locationName : route.startLocationName || 'Pickup Location'}
                        </Typography>
                        {typeof startLocation === 'object' && startLocation.address && (
                          <Typography variant='body2' color='text.secondary'>
                            {startLocation.address}
                            {startLocation.city && `, ${startLocation.city}`}
                          </Typography>
                        )}
                        {typeof startLocation === 'object' && startLocation.locationCode && (
                          <Typography variant='caption' color='text.secondary'>
                            Code: {startLocation.locationCode}
                          </Typography>
                        )}
                      </Box>
                      <Tooltip title='View location details'>
                        <IconButton size='small' color='success'>
                          <i className='ri-eye-line' />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TimelineContent>
                </TimelineItem>

                {/* Intermediate Stops */}
                {intermediateStops.map((stop: any, index: number) => {
                  const isPopulated = typeof stop === 'object' && (stop.$id || stop.locationId)
                  const stopName = isPopulated ? (stop.locationName || `Stop ${index + 1}`) : `Stop ${index + 1}`
                  const stopAddress = isPopulated ? stop.address : ''
                  const stopCode = isPopulated ? stop.locationCode : ''

                  return (
                    <TimelineItem key={stop.$id || stop.locationId || index} sx={{ '&::before': { display: 'none' } }}>
                      <TimelineSeparator>
                        <TimelineDot color='info' variant='outlined'>
                          <Typography variant='caption' fontWeight='bold' sx={{ width: 16, textAlign: 'center' }}>
                            {index + 1}
                          </Typography>
                        </TimelineDot>
                        {(index < intermediateStops.length - 1 || endLocation) && <TimelineConnector />}
                      </TimelineSeparator>
                      <TimelineContent sx={{ py: '12px', px: 2 }}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'action.hover',
                            cursor: 'pointer',
                            '&:hover': { boxShadow: 2 },
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                          onClick={() => handleViewLocation(stop, 'dropoff')}
                        >
                          <Box>
                            <Chip
                              label={`STOP ${index + 1} — Intermediate`}
                              color='info'
                              size='small'
                              variant='outlined'
                              sx={{ mb: 1 }}
                            />
                            <Typography variant='subtitle1' fontWeight='medium'>
                              {stopName}
                            </Typography>
                            {stopAddress && (
                              <Typography variant='body2' color='text.secondary'>
                                {stopAddress}
                              </Typography>
                            )}
                            {stopCode && (
                              <Typography variant='caption' color='text.secondary'>
                                Code: {stopCode}
                              </Typography>
                            )}
                          </Box>
                          <Box display='flex' alignItems='center' gap={1}>
                            <Tooltip title='View location details'>
                              <IconButton size='small' color='info'>
                                <i className='ri-eye-line' />
                              </IconButton>
                            </Tooltip>
                            {isAdmin && (
                              <Tooltip title='Remove from route'>
                                <IconButton
                                  size='small'
                                  color='error'
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRemoveStopClick(stop)
                                  }}
                                >
                                  <i className='ri-close-circle-line' />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                      </TimelineContent>
                    </TimelineItem>
                  )
                })}

                {/* End Location */}
                {endLocation && (
                  <TimelineItem sx={{ '&::before': { display: 'none' } }}>
                    <TimelineSeparator>
                      <TimelineDot color='error' variant='filled'>
                        <i className='ri-map-pin-line text-base' />
                      </TimelineDot>
                    </TimelineSeparator>
                    <TimelineContent sx={{ py: '12px', px: 2 }}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'error.main',
                          bgcolor: 'error.lighter',
                          cursor: 'pointer',
                          '&:hover': { boxShadow: 2 },
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                        onClick={() => handleViewLocation(endLocation, 'dropoff')}
                      >
                        <Box>
                          <Chip label='END — Final Destination' color='error' size='small' sx={{ mb: 1 }} />
                          <Typography variant='subtitle1' fontWeight='bold'>
                            {typeof endLocation === 'object' ? endLocation.locationName : route.endLocationName || 'End Location'}
                          </Typography>
                          {typeof endLocation === 'object' && endLocation.address && (
                            <Typography variant='body2' color='text.secondary'>
                              {endLocation.address}
                              {endLocation.city && `, ${endLocation.city}`}
                            </Typography>
                          )}
                          {typeof endLocation === 'object' && endLocation.locationCode && (
                            <Typography variant='caption' color='text.secondary'>
                              Code: {endLocation.locationCode}
                            </Typography>
                          )}
                        </Box>
                        <Box display='flex' alignItems='center' gap={1}>
                          <Tooltip title='View location details'>
                            <IconButton size='small' color='error'>
                              <i className='ri-eye-line' />
                            </IconButton>
                          </Tooltip>
                          {isAdmin && (
                            <Tooltip title='Change end location'>
                              <IconButton
                                size='small'
                                color='warning'
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleChangeEndClick()
                                }}
                                disabled={loadingDropoffs}
                              >
                                <i className='ri-exchange-line' />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                    </TimelineContent>
                  </TimelineItem>
                )}
              </Timeline>

              {intermediateStops.length === 0 && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Typography variant='body2' color='text.secondary'>
                    This route has no intermediate stops — direct from pickup to final destination.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar - Route Summary */}
        <Grid item xs={12} md={4}>
          <Grid container spacing={6}>
            {/* Quick Stats Card */}
            <Grid item xs={12}>
              <Card>
                <CardHeader title='Route Summary' />
                <CardContent>
                  <Box display='flex' flexDirection='column' gap={2.5}>
                    <Box display='flex' justifyContent='space-between' alignItems='center'>
                      <Box display='flex' alignItems='center' gap={1.5}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'primary.lighter'
                          }}
                        >
                          <i className='ri-route-line text-primary text-lg' />
                        </Box>
                        <Typography variant='body2' color='text.secondary'>Distance</Typography>
                      </Box>
                      <Typography variant='subtitle1' fontWeight='bold'>{formatDistance(route.distance)}</Typography>
                    </Box>

                    <Divider />

                    <Box display='flex' justifyContent='space-between' alignItems='center'>
                      <Box display='flex' alignItems='center' gap={1.5}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'info.lighter'
                          }}
                        >
                          <i className='ri-time-line text-info text-lg' />
                        </Box>
                        <Typography variant='body2' color='text.secondary'>Est. Duration</Typography>
                      </Box>
                      <Typography variant='subtitle1' fontWeight='bold'>{formatDuration(route.estimatedDuration)}</Typography>
                    </Box>

                    <Divider />

                    <Box display='flex' justifyContent='space-between' alignItems='center'>
                      <Box display='flex' alignItems='center' gap={1.5}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'warning.lighter'
                          }}
                        >
                          <i className='ri-map-pin-add-line text-warning text-lg' />
                        </Box>
                        <Typography variant='body2' color='text.secondary'>Total Stops</Typography>
                      </Box>
                      <Typography variant='subtitle1' fontWeight='bold'>
                        {1 + intermediateStops.length + (endLocation ? 1 : 0)}
                      </Typography>
                    </Box>

                    <Divider />

                    <Box display='flex' justifyContent='space-between' alignItems='center'>
                      <Box display='flex' alignItems='center' gap={1.5}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'success.lighter'
                          }}
                        >
                          <i className='ri-money-dollar-circle-line text-success text-lg' />
                        </Box>
                        <Typography variant='body2' color='text.secondary'>Base Rate</Typography>
                      </Box>
                      <Typography variant='subtitle1' fontWeight='bold'>{formatCurrency(route.baseRate)}</Typography>
                    </Box>

                    <Divider />

                    <Box display='flex' justifyContent='space-between' alignItems='center'>
                      <Box display='flex' alignItems='center' gap={1.5}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: route.isActive ? 'success.lighter' : 'secondary.lighter'
                          }}
                        >
                          <i className={`ri-${route.isActive ? 'checkbox-circle' : 'close-circle'}-line text-${route.isActive ? 'success' : 'secondary'} text-lg`} />
                        </Box>
                        <Typography variant='body2' color='text.secondary'>Status</Typography>
                      </Box>
                      <Chip
                        label={route.isActive ? 'Active' : 'Inactive'}
                        color={route.isActive ? 'success' : 'secondary'}
                        variant='tonal'
                        size='small'
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Start Location Quick Card */}
            <Grid item xs={12}>
              <Card
                sx={{
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 4 },
                  transition: 'box-shadow 0.2s'
                }}
                onClick={() => handleViewLocation(startLocation, 'pickup')}
              >
                <CardContent>
                  <Box display='flex' alignItems='center' gap={2} mb={1.5}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'success.lighter'
                      }}
                    >
                      <i className='ri-flag-line text-success text-xl' />
                    </Box>
                    <Box>
                      <Typography variant='caption' color='text.secondary'>Start Location</Typography>
                      <Typography variant='subtitle1' fontWeight='bold'>
                        {typeof startLocation === 'object' ? startLocation.locationName : route.startLocationName || 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                  {typeof startLocation === 'object' && startLocation.address && (
                    <Typography variant='body2' color='text.secondary' sx={{ ml: 7 }}>
                      {startLocation.address}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* End Location Quick Card */}
            <Grid item xs={12}>
              <Card
                sx={{
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 4 },
                  transition: 'box-shadow 0.2s'
                }}
                onClick={() => handleViewLocation(endLocation, 'dropoff')}
              >
                <CardContent>
                  <Box display='flex' alignItems='center' gap={2} mb={1.5}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'error.lighter'
                      }}
                    >
                      <i className='ri-map-pin-line text-error text-xl' />
                    </Box>
                    <Box>
                      <Typography variant='caption' color='text.secondary'>End Location</Typography>
                      <Typography variant='subtitle1' fontWeight='bold'>
                        {typeof endLocation === 'object' ? endLocation.locationName : route.endLocationName || 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                  {typeof endLocation === 'object' && endLocation.address && (
                    <Typography variant='body2' color='text.secondary' sx={{ ml: 7 }}>
                      {endLocation.address}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Timestamps Card */}
            <Grid item xs={12}>
              <Card>
                <CardHeader title='Record Info' />
                <CardContent>
                  <Box display='flex' flexDirection='column' gap={2}>
                    <Box>
                      <Typography variant='body2' color='text.secondary'>Created</Typography>
                      <Typography variant='body1'>{formatDate(route.$createdAt)}</Typography>
                    </Box>
                    <Divider />
                    <Box>
                      <Typography variant='body2' color='text.secondary'>Last Updated</Typography>
                      <Typography variant='body1'>{formatDate(route.$updatedAt)}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Danger Zone */}
        {isAdmin && (
          <Grid item xs={12}>
            <Card sx={{ borderColor: 'error.main', borderWidth: 1, borderStyle: 'solid' }}>
              <CardHeader
                title='Danger Zone'
                titleTypographyProps={{ color: 'error' }}
              />
              <CardContent>
                <div className='flex flex-wrap items-center justify-between gap-4'>
                  <div>
                    <Typography variant='body1' fontWeight='medium'>
                      Delete this route
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Once deleted, this route cannot be recovered. Any trips or rate cards associated with this route may be affected.
                    </Typography>
                  </div>
                  <Button
                    variant='outlined'
                    color='error'
                    startIcon={<i className='ri-delete-bin-line' />}
                    onClick={() => { setDeleteDialogOpen(true); setDeleteError(null) }}
                  >
                    Delete Route
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* ==================== DIALOGS ==================== */}

      {/* Location Detail Dialog */}
      <LocationDetailDialog
        open={locationDialogOpen}
        onClose={() => { setLocationDialogOpen(false); setSelectedLocation(null) }}
        location={selectedLocation}
        locationType={selectedLocationType}
      />

      {/* Remove Intermediate Stop Dialog */}
      <Dialog
        open={removeStopDialogOpen}
        onClose={() => { setRemoveStopDialogOpen(false); setStopToRemove(null) }}
        maxWidth='xs'
        fullWidth
      >
        <DialogTitle>
          <div className='flex items-center gap-2'>
            <i className='ri-error-warning-line text-warning text-2xl' />
            Remove Intermediate Stop
          </div>
        </DialogTitle>
        <DialogContent>
          <Typography className='mb-2'>
            Are you sure you want to remove <strong>"{stopToRemove?.locationName || 'this stop'}"</strong> from this route?
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            The location itself will not be deleted — it will only be removed from this route&apos;s intermediate stops.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => { setRemoveStopDialogOpen(false); setStopToRemove(null) }}
            variant='outlined'
            color='secondary'
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmRemoveStop}
            color='warning'
            variant='contained'
            disabled={isRemovingStop}
          >
            {isRemovingStop ? 'Removing...' : 'Remove Stop'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change End Location Dialog */}
      <Dialog
        open={changeEndDialogOpen}
        onClose={() => { setChangeEndDialogOpen(false); setNewEndLocation(null) }}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          <div className='flex items-center gap-2'>
            <i className='ri-exchange-line text-warning text-2xl' />
            Change End Location
          </div>
        </DialogTitle>
        <DialogContent>
          <Typography className='mb-4'>
            Select a new final destination for this route.
            The current end location is <strong>"{typeof endLocation === 'object' ? endLocation.locationName : route.endLocationName || 'Unknown'}"</strong>.
          </Typography>
          <Autocomplete
            options={availableDropoffs}
            getOptionLabel={(option) => `${option.locationName} (${option.locationCode})`}
            value={newEndLocation}
            onChange={(_, newValue) => setNewEndLocation(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label='Select Dropoff Location'
                placeholder='Search dropoff locations...'
                fullWidth
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.$id}>
                <Box>
                  <Typography variant='body1'>{option.locationName}</Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {option.locationCode} — {option.address}, {option.city}
                  </Typography>
                </Box>
              </li>
            )}
            isOptionEqualToValue={(option, value) => option.$id === value.$id}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => { setChangeEndDialogOpen(false); setNewEndLocation(null) }}
            variant='outlined'
            color='secondary'
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmChangeEnd}
            color='primary'
            variant='contained'
            disabled={!newEndLocation || isChangingEnd}
          >
            {isChangingEnd ? 'Changing...' : 'Change End Location'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setDeleteError(null) }}
        maxWidth='xs'
        fullWidth
      >
        <DialogTitle>
          <div className='flex items-center gap-2'>
            <i className='ri-error-warning-line text-error text-2xl' />
            Delete Route
          </div>
        </DialogTitle>
        <DialogContent>
          <Typography className='mb-2'>
            Are you sure you want to delete route <strong>"{route.routeName}"</strong> ({route.routeCode})?
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            This action cannot be undone. All data associated with this route will be permanently removed.
          </Typography>
          {deleteError && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'error.lighter', borderRadius: 1, border: '1px solid', borderColor: 'error.main' }}>
              <Typography color='error.main' variant='body2'>
                {deleteError}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => { setDeleteDialogOpen(false); setDeleteError(null) }}
            variant='outlined'
            color='secondary'
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color='error'
            variant='contained'
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Route'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default RouteDetailView
