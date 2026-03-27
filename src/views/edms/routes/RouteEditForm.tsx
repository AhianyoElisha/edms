'use client'

// React Imports
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Autocomplete from '@mui/material/Autocomplete'
import Alert from '@mui/material/Alert'
import { TimePicker } from '@mui/x-date-pickers-pro'
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers-pro'
import { LicenseInfo } from '@mui/x-license'
import dayjs from 'dayjs'

LicenseInfo.setLicenseKey('e0d9bb8070ce0054c9d9ecb6e82cb58fTz0wLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxLVj0y')

// Drag and Drop
import { useDragAndDrop } from '@formkit/drag-and-drop/react'

// Third-party Imports
import { toast } from 'react-toastify'

// Type Imports
import type { RouteType, PickupLocationType, DropoffLocationType, RouteStopType } from '@/types/apps/deliveryTypes'

// Actions Imports
import { getAllPickupLocations, getAllDropoffLocations } from '@/libs/actions/location.actions'
import { updateRoute } from '@/libs/actions/route.actions'

// ==========================================
// Interfaces
// ==========================================

interface IntermediateStop {
  id: string
  locationId: string
  locationName: string
  locationCode: string
  address: string
  sequence: number
  estimatedArrival?: string
}

interface RouteEditFormProps {
  route: RouteType
}

// ==========================================
// Main Component
// ==========================================

const RouteEditForm = ({ route: initialRoute }: RouteEditFormProps) => {
  const router = useRouter()

  // Data states
  const [pickupLocations, setPickupLocations] = useState<PickupLocationType[]>([])
  const [dropoffLocations, setDropoffLocations] = useState<DropoffLocationType[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [routeName, setRouteName] = useState(initialRoute.routeName)
  const [routeCode, setRouteCode] = useState(initialRoute.routeCode)
  const [startLocationId, setStartLocationId] = useState(
    typeof initialRoute.startLocation === 'object'
      ? (initialRoute.startLocation as any).$id
      : initialRoute.startLocation
  )
  const [endLocationId, setEndLocationId] = useState(
    typeof initialRoute.endLocation === 'object'
      ? (initialRoute.endLocation as any).$id
      : initialRoute.endLocation
  )
  const [distance, setDistance] = useState(initialRoute.distance?.toString() || '')
  const [estimatedDuration, setEstimatedDuration] = useState(initialRoute.estimatedDuration?.toString() || '')
  const [baseRate, setBaseRate] = useState(initialRoute.baseRate?.toString() || '')
  const [isActive, setIsActive] = useState(initialRoute.isActive)

  // Add/Insert stop dialog
  const [addStopDialogOpen, setAddStopDialogOpen] = useState(false)
  const [newStopLocationId, setNewStopLocationId] = useState('')
  const [newStopEstimatedArrival, setNewStopEstimatedArrival] = useState('')
  const [insertPosition, setInsertPosition] = useState<number | null>(null)

  // Confirm remove dialog
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [stopToRemove, setStopToRemove] = useState<IntermediateStop | null>(null)

  // Build initial intermediate stops from route data
  const buildInitialStops = useCallback((): IntermediateStop[] => {
    const rawStops = initialRoute.intermediateStops || []
    return rawStops.map((stop: any, index: number) => {
      if (typeof stop === 'object' && (stop.$id || stop.locationId)) {
        return {
          id: stop.$id || stop.locationId || `stop-${index}`,
          locationId: stop.$id || stop.locationId,
          locationName: stop.locationName || '',
          locationCode: stop.locationCode || '',
          address: stop.address || '',
          sequence: index + 1,
          estimatedArrival: stop.estimatedArrival
        }
      }
      return {
        id: typeof stop === 'string' ? stop : `stop-${index}`,
        locationId: typeof stop === 'string' ? stop : '',
        locationName: '',
        locationCode: '',
        address: '',
        sequence: index + 1
      }
    })
  }, [initialRoute])

  // Drag and drop setup for intermediate stops
  const [parentRef, stops, setStops] = useDragAndDrop<HTMLDivElement, IntermediateStop>(
    buildInitialStops(),
    {
      dragHandle: '.drag-handle',
      draggingClass: 'opacity-50',
    }
  )

  // Load locations
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const [pickups, dropoffs] = await Promise.all([
          getAllPickupLocations({ isActive: true }),
          getAllDropoffLocations({ isActive: true })
        ])
        setPickupLocations(pickups)
        setDropoffLocations(dropoffs)
      } catch (error) {
        console.error('Error loading locations:', error)
        toast.error('Failed to load locations. Please refresh the page.')
      } finally {
        setLoading(false)
      }
    }

    loadLocations()
  }, [])

  // ==========================================
  // Handlers
  // ==========================================

  const handleAddStop = () => {
    setNewStopLocationId('')
    setNewStopEstimatedArrival('')
    setInsertPosition(null)
    setAddStopDialogOpen(true)
  }

  const handleInsertStopAt = (position: number) => {
    setNewStopLocationId('')
    setNewStopEstimatedArrival('')
    setInsertPosition(position)
    setAddStopDialogOpen(true)
  }

  const handleConfirmAddStop = () => {
    if (!newStopLocationId) {
      toast.error('Please select a dropoff location')
      return
    }

    // Check for duplicates
    const isDuplicate = stops.some(s => s.locationId === newStopLocationId)
    if (isDuplicate) {
      toast.error('This location is already in the route')
      return
    }

    const location = dropoffLocations.find(loc => loc.$id === newStopLocationId)
    if (!location) return

    const newStop: IntermediateStop = {
      id: `new-${Date.now()}`,
      locationId: location.$id,
      locationName: location.locationName,
      locationCode: location.locationCode || '',
      address: location.address || '',
      sequence: 0,
      estimatedArrival: newStopEstimatedArrival || undefined
    }

    let updatedStops: IntermediateStop[]

    if (insertPosition !== null) {
      updatedStops = [...stops]
      updatedStops.splice(insertPosition, 0, newStop)
    } else {
      updatedStops = [...stops, newStop]
    }

    // Re-sequence
    updatedStops = updatedStops.map((s, i) => ({ ...s, sequence: i + 1 }))
    setStops(updatedStops)
    setAddStopDialogOpen(false)

    const posLabel = insertPosition !== null ? `at position ${insertPosition + 1}` : 'to the end'
    toast.success(`Added "${location.locationName}" ${posLabel}`)
  }

  const handleRemoveStopClick = (stop: IntermediateStop) => {
    setStopToRemove(stop)
    setRemoveDialogOpen(true)
  }

  const handleConfirmRemoveStop = () => {
    if (!stopToRemove) return
    const updated = stops
      .filter(s => s.id !== stopToRemove.id)
      .map((s, i) => ({ ...s, sequence: i + 1 }))
    setStops(updated)
    setRemoveDialogOpen(false)
    toast.success(`Removed "${stopToRemove.locationName || 'stop'}" from route`)
    setStopToRemove(null)
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const updated = [...stops]
    const temp = updated[index - 1]
    updated[index - 1] = updated[index]
    updated[index] = temp
    setStops(updated.map((s, i) => ({ ...s, sequence: i + 1 })))
  }

  const handleMoveDown = (index: number) => {
    if (index === stops.length - 1) return
    const updated = [...stops]
    const temp = updated[index + 1]
    updated[index + 1] = updated[index]
    updated[index] = temp
    setStops(updated.map((s, i) => ({ ...s, sequence: i + 1 })))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!routeName || !routeCode || !startLocationId || !endLocationId || !baseRate) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)

      const startLocation = pickupLocations.find(loc => loc.$id === startLocationId)
      const endLocation = dropoffLocations.find(loc => loc.$id === endLocationId)

      if (!startLocation || !endLocation) {
        toast.error('Invalid start or end location')
        return
      }

      // Build the stops array in current drag-and-drop order
      const routeStops: RouteStopType[] = stops.map((stop, index) => ({
        locationId: stop.locationId,
        locationName: stop.locationName,
        address: stop.address,
        sequence: index + 1,
        estimatedArrival: stop.estimatedArrival
      }))

      await updateRoute(initialRoute.$id, {
        routeName,
        routeCode,
        startLocation: startLocation.$id,
        endLocation: endLocation.$id,
        intermediateStops: routeStops,
        distance: distance ? parseFloat(distance) : undefined,
        estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : undefined,
        baseRate: parseFloat(baseRate),
        isActive
      })

      toast.success('Route updated successfully!')
      router.push(`/edms/routes/${initialRoute.$id}`)
    } catch (error) {
      console.error('Error updating route:', error)
      toast.error('Failed to update route. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Available dropoffs (excluding already-used ones)
  const availableDropoffs = dropoffLocations.filter(loc => {
    const usedIds = stops.map(s => s.locationId)
    return !usedIds.includes(loc.$id) && loc.$id !== endLocationId
  })

  // Resolve start/end location display names
  const startLocation = (() => {
    const found = pickupLocations.find(l => l.$id === startLocationId)
    if (found) return found.locationName
    const raw = initialRoute.startLocation as any
    return typeof raw === 'object' ? raw.locationName : 'Pickup Location'
  })()

  const endLocation = (() => {
    const found = dropoffLocations.find(l => l.$id === endLocationId)
    if (found) return found.locationName
    const raw = initialRoute.endLocation as any
    return typeof raw === 'object' ? raw.locationName : 'Final Destination'
  })()

  // ==========================================
  // Render
  // ==========================================

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography>Loading route data...</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={6}>
          {/* Route Information Card */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title='Route Information' />
              <CardContent>
                <Grid container spacing={4}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label='Route Name'
                      value={routeName}
                      onChange={e => setRouteName(e.target.value)}
                      required
                      placeholder='e.g., Downtown Express Route (Route A)'
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label='Route Code'
                      value={routeCode}
                      onChange={e => setRouteCode(e.target.value)}
                      required
                      placeholder='e.g., RT-001'
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      type='number'
                      label='Distance (km)'
                      value={distance}
                      onChange={e => setDistance(e.target.value)}
                      inputProps={{ min: 0, step: 0.1 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      type='number'
                      label='Estimated Duration (min)'
                      value={estimatedDuration}
                      onChange={e => setEstimatedDuration(e.target.value)}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      type='number'
                      label='Base Rate'
                      value={baseRate}
                      onChange={e => setBaseRate(e.target.value)}
                      required
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={<Switch checked={isActive} onChange={e => setIsActive(e.target.checked)} />}
                      label='Active Route'
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Start & End Locations */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardHeader
                title='Start Location (Pickup)'
                avatar={
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'success.lighter'
                    }}
                  >
                    <i className='ri-flag-line text-success' />
                  </Box>
                }
              />
              <CardContent>
                <TextField
                  select
                  fullWidth
                  label='Select Pickup Location'
                  value={startLocationId}
                  onChange={e => setStartLocationId(e.target.value)}
                  required
                >
                  {pickupLocations.map(location => (
                    <MenuItem key={location.$id} value={location.$id}>
                      <div>
                        <Typography variant='body1'>{location.locationName}</Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {location.locationCode} — {location.address}
                        </Typography>
                      </div>
                    </MenuItem>
                  ))}
                </TextField>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardHeader
                title='End Location (Final Destination)'
                avatar={
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'error.lighter'
                    }}
                  >
                    <i className='ri-map-pin-line text-error' />
                  </Box>
                }
              />
              <CardContent>
                <TextField
                  select
                  fullWidth
                  label='Select Dropoff Location'
                  value={endLocationId}
                  onChange={e => setEndLocationId(e.target.value)}
                  required
                >
                  {dropoffLocations.map(location => (
                    <MenuItem key={location.$id} value={location.$id}>
                      <div>
                        <Typography variant='body1'>{location.locationName}</Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {location.locationCode} — {location.address}
                        </Typography>
                      </div>
                    </MenuItem>
                  ))}
                </TextField>
              </CardContent>
            </Card>
          </Grid>

          {/* ================================================== */}
          {/* Intermediate Stops — Kanban-style Board             */}
          {/* ================================================== */}
          <Grid item xs={12}>
            <Card>
              <CardHeader
                title={
                  <Box display='flex' alignItems='center' gap={1}>
                    <Typography variant='h6'>Route Stops</Typography>
                    <Chip
                      label={`${stops.length + 2} locations`}
                      size='small'
                      variant='outlined'
                    />
                  </Box>
                }
                subheader='Drag stops to reorder, or use the arrows. Click between stops to insert a new one.'
                action={
                  <Button
                    variant='outlined'
                    size='small'
                    startIcon={<i className='ri-add-line' />}
                    onClick={handleAddStop}
                  >
                    Add Stop
                  </Button>
                }
              />
              <CardContent>
                {/* ---- Route Flow Board ---- */}
                <Box
                  sx={{
                    position: 'relative',
                    pl: { xs: 3, sm: 4 },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: { xs: 18, sm: 22 },
                      top: 0,
                      bottom: 0,
                      width: 2,
                      bgcolor: 'divider'
                    }
                  }}
                >
                  {/* ---- START marker ---- */}
                  <Box sx={{ position: 'relative', mb: 1 }}>
                    <Box
                      sx={{
                        position: 'absolute',
                        left: { xs: -15, sm: -18 },
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: 'success.main',
                        zIndex: 1
                      }}
                    />
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        px: 2,
                        py: 1.5,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper'
                      }}
                    >
                      <i className='ri-flag-line text-lg text-success' />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant='caption' color='text.secondary' textTransform='uppercase' letterSpacing={0.5}>
                          Pickup
                        </Typography>
                        <Typography variant='subtitle2'>
                          {startLocation}
                        </Typography>
                      </Box>
                      <Chip label='START' size='small' variant='outlined' color='success' />
                    </Box>
                  </Box>

                  {/* Insert before first intermediate stop */}
                  {stops.length > 0 && <InsertButton onClick={() => handleInsertStopAt(0)} />}

                  {/* ---- Draggable Intermediate Stops ---- */}
                  {stops.length === 0 ? (
                    <Box
                      sx={{
                        position: 'relative',
                        my: 2,
                        py: 4,
                        textAlign: 'center',
                        border: '2px dashed',
                        borderColor: 'divider',
                        borderRadius: 1
                      }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          left: { xs: -15, sm: -18 },
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: 'divider',
                          zIndex: 1
                        }}
                      />
                      <i className='ri-route-line text-3xl text-textDisabled' />
                      <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                        No intermediate stops yet
                      </Typography>
                      <Button
                        variant='text'
                        size='small'
                        startIcon={<i className='ri-add-line' />}
                        onClick={handleAddStop}
                        sx={{ mt: 0.5 }}
                      >
                        Add First Stop
                      </Button>
                    </Box>
                  ) : (
                    <div ref={parentRef}>
                      {stops.map((stop, index) => (
                        <div key={stop.id} data-label={stop.id}>
                          <StopCard
                            stop={stop}
                            index={index}
                            total={stops.length}
                            onRemove={() => handleRemoveStopClick(stop)}
                            onInsertAfter={() => handleInsertStopAt(index + 1)}
                            onMoveUp={() => handleMoveUp(index)}
                            onMoveDown={() => handleMoveDown(index)}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ---- END marker ---- */}
                  <Box sx={{ position: 'relative', mt: 1 }}>
                    <Box
                      sx={{
                        position: 'absolute',
                        left: { xs: -15, sm: -18 },
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: 'error.main',
                        zIndex: 1
                      }}
                    />
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        px: 2,
                        py: 1.5,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper'
                      }}
                    >
                      <i className='ri-map-pin-line text-lg text-error' />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant='caption' color='text.secondary' textTransform='uppercase' letterSpacing={0.5}>
                          Final Destination
                        </Typography>
                        <Typography variant='subtitle2'>
                          {endLocation}
                        </Typography>
                      </Box>
                      <Chip label='END' size='small' variant='outlined' color='error' />
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Route Summary */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title='Route Summary' />
              <CardContent>
                <Box display='flex' flexWrap='wrap' gap={4}>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>Total Stops</Typography>
                    <Typography variant='h6'>{stops.length + 2}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      1 pickup + {stops.length} intermediate + 1 destination
                    </Typography>
                  </Box>
                  <Divider orientation='vertical' flexItem />
                  <Box>
                    <Typography variant='body2' color='text.secondary'>Route</Typography>
                    <Typography variant='h6'>{routeName || '—'}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {routeCode || 'No code'}
                    </Typography>
                  </Box>
                  {distance && (
                    <>
                      <Divider orientation='vertical' flexItem />
                      <Box>
                        <Typography variant='body2' color='text.secondary'>Distance</Typography>
                        <Typography variant='h6'>{distance} km</Typography>
                      </Box>
                    </>
                  )}
                  {estimatedDuration && (
                    <>
                      <Divider orientation='vertical' flexItem />
                      <Box>
                        <Typography variant='body2' color='text.secondary'>Duration</Typography>
                        <Typography variant='h6'>{estimatedDuration} min</Typography>
                      </Box>
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Action Buttons */}
          <Grid item xs={12}>
            <div className='flex items-center gap-4'>
              <Button
                variant='contained'
                type='submit'
                disabled={submitting}
                startIcon={<i className={submitting ? 'ri-loader-4-line' : 'ri-save-line'} />}
              >
                {submitting ? 'Saving Changes...' : 'Save Changes'}
              </Button>
              <Button
                variant='outlined'
                color='secondary'
                onClick={() => router.push(`/edms/routes/${initialRoute.$id}`)}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </Grid>
        </Grid>
      </form>

      {/* ==================== Add / Insert Stop Dialog ==================== */}
      <Dialog
        open={addStopDialogOpen}
        onClose={() => setAddStopDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          <Box display='flex' alignItems='center' gap={1}>
            <i className='ri-map-pin-add-line text-xl' />
            {insertPosition !== null
              ? `Insert Stop at Position ${insertPosition + 1}`
              : 'Add Intermediate Stop'
            }
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {insertPosition !== null && (
              <Alert severity='info' variant='outlined' icon={<i className='ri-information-line' />}>
                The new stop will be inserted at position {insertPosition + 1}
                {insertPosition > 0
                  ? ` — after "${stops[insertPosition - 1]?.locationName || `Stop ${insertPosition}`}"`
                  : ' — at the beginning of intermediate stops'
                }.
              </Alert>
            )}
            <Autocomplete
              options={availableDropoffs}
              getOptionLabel={(option) => `${option.locationName} (${option.locationCode || 'N/A'})`}
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
              onChange={(_, value) => setNewStopLocationId(value?.$id || '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label='Select Dropoff Location'
                  placeholder='Search locations...'
                />
              )}
            />
            <TimePicker
              label='Estimated Arrival Time (Optional)'
              value={newStopEstimatedArrival ? dayjs(newStopEstimatedArrival, 'HH:mm') : null}
              onChange={(time) => {
                setNewStopEstimatedArrival(time ? time.format('HH:mm') : '')
              }}
              slotProps={{
                textField: {
                  fullWidth: true
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddStopDialogOpen(false)} color='secondary'>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmAddStop}
            variant='contained'
            disabled={!newStopLocationId}
          >
            {insertPosition !== null ? 'Insert Stop' : 'Add Stop'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Remove Stop Confirmation Dialog ==================== */}
      <Dialog
        open={removeDialogOpen}
        onClose={() => { setRemoveDialogOpen(false); setStopToRemove(null) }}
        maxWidth='xs'
        fullWidth
      >
        <DialogTitle>
          <Box display='flex' alignItems='center' gap={1}>
            <i className='ri-delete-bin-line text-xl text-error' />
            Remove Stop
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove <strong>{stopToRemove?.locationName || 'this stop'}</strong> from the route?
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
            The remaining stops will be re-sequenced automatically.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setRemoveDialogOpen(false); setStopToRemove(null) }} color='secondary'>
            Cancel
          </Button>
          <Button onClick={handleConfirmRemoveStop} variant='contained' color='error'>
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  )
}

// ==========================================
// Stop Card Sub-component (Kanban Card)
// ==========================================

interface StopCardProps {
  stop: IntermediateStop
  index: number
  total: number
  onRemove: () => void
  onInsertAfter: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

const StopCard = ({ stop, index, total, onRemove, onInsertAfter, onMoveUp, onMoveDown }: StopCardProps) => {
  return (
    <>
      <Box sx={{ position: 'relative', mb: 0 }}>
        {/* Timeline dot */}
        <Box
          sx={{
            position: 'absolute',
            left: { xs: -15, sm: -18 },
            top: '50%',
            transform: 'translateY(-50%)',
            width: 12,
            height: 12,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            zIndex: 1
          }}
        />

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1.5,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'background.paper',
            transition: 'box-shadow 0.2s, border-color 0.2s',
            '&:hover': {
              boxShadow: 1,
              borderColor: 'primary.light'
            }
          }}
        >
          {/* Drag Handle */}
          <Tooltip title='Drag to reorder'>
            <Box
              className='drag-handle'
              sx={{
                cursor: 'grab',
                display: 'flex',
                alignItems: 'center',
                px: 0.5,
                color: 'text.disabled',
                '&:active': { cursor: 'grabbing' },
                '&:hover': { color: 'text.secondary' }
              }}
            >
              <i className='ri-draggable text-xl' />
            </Box>
          </Tooltip>

          {/* Sequence Badge */}
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid',
              borderColor: 'primary.main',
              flexShrink: 0
            }}
          >
            <Typography variant='caption' fontWeight='bold' color='primary.main'>
              {index + 1}
            </Typography>
          </Box>

          {/* Stop Info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant='subtitle2' noWrap>
              {stop.locationName || 'Unknown Location'}
            </Typography>
            <Typography variant='caption' color='text.secondary' noWrap component='div'>
              {stop.locationCode && `${stop.locationCode} — `}
              {stop.address || 'No address'}
            </Typography>
          </Box>

          {/* ETA chip */}
          {stop.estimatedArrival && (
            <Chip
              label={stop.estimatedArrival}
              size='small'
              variant='outlined'
              icon={<i className='ri-time-line text-sm' />}
              sx={{ height: 24, fontSize: '0.75rem' }}
            />
          )}

          {/* Reorder arrows */}
          <Box sx={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <Tooltip title='Move up'>
              <span>
                <IconButton size='small' onClick={onMoveUp} disabled={index === 0} sx={{ p: 0.25 }}>
                  <i className='ri-arrow-up-s-line text-base' />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title='Move down'>
              <span>
                <IconButton size='small' onClick={onMoveDown} disabled={index === total - 1} sx={{ p: 0.25 }}>
                  <i className='ri-arrow-down-s-line text-base' />
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          {/* Remove */}
          <Tooltip title='Remove stop'>
            <IconButton size='small' onClick={onRemove} sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
              <i className='ri-close-line' />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Insert-between button */}
      <InsertButton onClick={onInsertAfter} />
    </>
  )
}

// ==========================================
// Insert Button Sub-component
// ==========================================

interface InsertButtonProps {
  onClick: () => void
}

const InsertButton = ({ onClick }: InsertButtonProps) => {
  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 0.25,
        opacity: 0,
        transition: 'opacity 0.2s',
        '&:hover': { opacity: 1 }
      }}
    >
      <Tooltip title='Insert a stop here'>
        <IconButton
          size='small'
          onClick={onClick}
          sx={{
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            px: 1.5,
            py: 0.25,
            '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' }
          }}
        >
          <i className='ri-add-line text-sm' />
          <Typography variant='caption' color='text.secondary' sx={{ ml: 0.5, fontSize: '0.7rem' }}>
            Insert stop
          </Typography>
        </IconButton>
      </Tooltip>
    </Box>
  )
}

export default RouteEditForm
