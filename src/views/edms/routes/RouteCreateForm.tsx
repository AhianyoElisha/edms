'use client'

// React Imports
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import { TimePicker } from '@mui/x-date-pickers-pro'
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers-pro'
import { LicenseInfo } from '@mui/x-license'
import dayjs from 'dayjs'

LicenseInfo.setLicenseKey('e0d9bb8070ce0054c9d9ecb6e82cb58fTz0wLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxLVj0y')

// Third-party Imports
import { toast } from 'react-toastify'

// Type Imports
import type { PickupLocationType, DropoffLocationType, RouteStopType } from '@/types/apps/deliveryTypes'

// Actions Imports
import { getAllPickupLocations, getAllDropoffLocations } from '@/libs/actions/location.actions'
import { createRoute } from '@/libs/actions/route.actions'

interface IntermediateStop {
  tempId: string
  locationId: string
  locationName: string
  address: string
  sequence: number
  estimatedArrival?: string
}

const RouteCreateForm = () => {
  const router = useRouter()

  // States
  const [pickupLocations, setPickupLocations] = useState<PickupLocationType[]>([])
  const [dropoffLocations, setDropoffLocations] = useState<DropoffLocationType[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [routeName, setRouteName] = useState('')
  const [routeCode, setRouteCode] = useState('')
  const [startLocationId, setStartLocationId] = useState('')
  const [endLocationId, setEndLocationId] = useState('')
  const [intermediateStops, setIntermediateStops] = useState<IntermediateStop[]>([])
  const [distance, setDistance] = useState('')
  const [estimatedDuration, setEstimatedDuration] = useState('')
  const [baseRate, setBaseRate] = useState('')
  const [isActive, setIsActive] = useState(true)

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

  const addIntermediateStop = () => {
    const newStop: IntermediateStop = {
      tempId: `temp-${Date.now()}`,
      locationId: '',
      locationName: '',
      address: '',
      sequence: intermediateStops.length + 1
    }
    setIntermediateStops([...intermediateStops, newStop])
  }

  const removeIntermediateStop = (tempId: string) => {
    const updated = intermediateStops
      .filter(stop => stop.tempId !== tempId)
      .map((stop, index) => ({ ...stop, sequence: index + 1 }))
    setIntermediateStops(updated)
  }

  const updateIntermediateStop = (tempId: string, field: string, value: string) => {
    if (field === 'locationId') {
      const location = dropoffLocations.find(loc => loc.$id === value)
      if (location) {
        setIntermediateStops(stops =>
          stops.map(stop =>
            stop.tempId === tempId
              ? {
                  ...stop,
                  locationId: value,
                  locationName: location.locationName,
                  address: location.address
                }
              : stop
          )
        )
      }
    } else {
      setIntermediateStops(stops =>
        stops.map(stop =>
          stop.tempId === tempId ? { ...stop, [field]: value } : stop
        )
      )
    }
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

      const routeStops: RouteStopType[] = intermediateStops.map(stop => ({
        locationId: stop.locationId,
        locationName: stop.locationName,
        address: stop.address,
        sequence: stop.sequence,
        estimatedArrival: stop.estimatedArrival
      }))

      await createRoute({
        routeName,
        routeCode,
        startLocation: startLocation.$id,
        startLocationName: startLocation.locationName,
        endLocation: endLocation.$id,
        endLocationName: endLocation.locationName,
        intermediateStops: routeStops,
        distance: distance ? parseFloat(distance) : undefined,
        estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : undefined,
        baseRate: parseFloat(baseRate),
        isActive
      })

      toast.success('Route created successfully!')
      router.push('/edms/routes')
    } catch (error) {
      console.error('Error creating route:', error)
      toast.error('Failed to create route. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography>Loading locations...</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={6}>
        {/* Basic Information */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant='h6' className='mb-4'>
                Route Information
              </Typography>
              <Grid container spacing={4}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label='Route Name'
                    value={routeName}
                    onChange={e => setRouteName(e.target.value)}
                    required
                    placeholder='e.g., Downtown Express Route'
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

        {/* Start Location */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant='h6' className='mb-4'>
                Start Location (Pickup)
              </Typography>
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
                        {location.locationCode} - {location.address}
                      </Typography>
                    </div>
                  </MenuItem>
                ))}
              </TextField>
            </CardContent>
          </Card>
        </Grid>

        {/* End Location */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant='h6' className='mb-4'>
                End Location (Final Destination)
              </Typography>
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
                        {location.locationCode} - {location.address}
                      </Typography>
                    </div>
                  </MenuItem>
                ))}
              </TextField>
            </CardContent>
          </Card>
        </Grid>

        {/* Intermediate Stops */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <div className='flex items-center justify-between mb-4'>
                <Typography variant='h6'>Intermediate Stops (Optional)</Typography>
                <Button
                  variant='outlined'
                  size='small'
                  startIcon={<i className='ri-add-line' />}
                  onClick={addIntermediateStop}
                >
                  Add Stop
                </Button>
              </div>

              {intermediateStops.length === 0 ? (
                <Typography color='text.secondary' className='text-center py-4'>
                  No intermediate stops added. Click "Add Stop" to add dropoff points along the route.
                </Typography>
              ) : (
                <div className='space-y-4'>
                  {intermediateStops.map((stop, index) => (
                    <div key={stop.tempId}>
                      {index > 0 && <Divider className='my-4' />}
                      <Grid container spacing={3} alignItems='center'>
                        <Grid item xs={12} sm={1}>
                          <Typography variant='h6' color='primary' className='text-center'>
                            {stop.sequence}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={5}>
                          <TextField
                            select
                            fullWidth
                            label='Dropoff Location'
                            value={stop.locationId}
                            onChange={e => updateIntermediateStop(stop.tempId, 'locationId', e.target.value)}
                            required
                            size='small'
                          >
                            {dropoffLocations.map(location => (
                              <MenuItem key={location.$id} value={location.$id}>
                                {location.locationName} - {location.locationCode}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid item xs={12} sm={5}>
                          <TimePicker
                            label='Estimated Arrival Time'
                            value={stop.estimatedArrival ? dayjs(stop.estimatedArrival, 'HH:mm') : null}
                            onChange={(time) => {
                              const timeString = time ? time.format('HH:mm') : ''
                              updateIntermediateStop(stop.tempId, 'estimatedArrival', timeString)
                            }}
                            slotProps={{
                              textField: {
                                fullWidth: true,
                                size: 'small'
                              }
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={1}>
                          <IconButton
                            size='small'
                            color='error'
                            onClick={() => removeIntermediateStop(stop.tempId)}
                          >
                            <i className='ri-delete-bin-7-line' />
                          </IconButton>
                        </Grid>
                      </Grid>
                    </div>
                  ))}
                </div>
              )}
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
            >
              {submitting ? 'Creating...' : 'Create Route'}
            </Button>
            <Button
              variant='outlined'
              color='secondary'
              onClick={() => router.push('/edms/routes')}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </Grid>
        </Grid>
      </form>
    </LocalizationProvider>
  )
}

export default RouteCreateForm
