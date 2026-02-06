'use client'

// React Imports
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import { DatePicker } from '@mui/x-date-pickers-pro'
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers-pro'
import { LicenseInfo } from '@mui/x-license'
import dayjs from 'dayjs'

LicenseInfo.setLicenseKey('e0d9bb8070ce0054c9d9ecb6e82cb58fTz0wLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxLVj0y')

// Third-party Imports
import { toast } from 'react-toastify'

// Type Imports
import type { 
  ReturnWaybillInput, 
  ReturnReasonType, 
  PackageBreakdown,
  TripType,
  PickupLocationType,
  DropoffLocationType
} from '@/types/apps/deliveryTypes'

// Actions Imports
import { createReturnWaybill } from '@/libs/actions/returnwaybill.actions'
import { getAllTrips, getTripById } from '@/libs/actions/trip.actions'
import { getAllPickupLocations, getAllDropoffLocations } from '@/libs/actions/location.actions'

interface ReturnWaybillCreateFormProps {
  tripId?: string
}

const returnReasons: { value: ReturnReasonType; label: string }[] = [
  { value: 'rejected', label: 'Rejected by Customer' },
  { value: 'damaged', label: 'Damaged Goods' },
  { value: 'wrong_delivery', label: 'Wrong Delivery' },
  { value: 'customer_return', label: 'Customer Return' },
  { value: 'other', label: 'Other' }
]

const ReturnWaybillCreateForm = ({ tripId: initialTripId }: ReturnWaybillCreateFormProps) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get URL parameters
  const preselectedTripId = searchParams.get('tripId') || initialTripId
  const preselectedDropoffId = searchParams.get('dropoffId')
  const preselectedDropoffName = searchParams.get('dropoffName')
  const manifestId = searchParams.get('manifestId')

  // Determine if we're in "trip context" mode (creating from within a trip)
  const hasTripContext = Boolean(preselectedTripId)

  // States
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [trips, setTrips] = useState<TripType[]>([])
  const [tripDetails, setTripDetails] = useState<any>(null)
  const [pickupLocations, setPickupLocations] = useState<PickupLocationType[]>([])
  const [dropoffLocations, setDropoffLocations] = useState<DropoffLocationType[]>([])
  const [tripDropoffLocations, setTripDropoffLocations] = useState<any[]>([])

  // Form states
  const [tripId, setTripId] = useState(preselectedTripId || '')
  const [dropoffLocationId, setDropoffLocationId] = useState(preselectedDropoffId || '')
  const [pickupLocationId, setPickupLocationId] = useState('')
  const [returnDate, setReturnDate] = useState<dayjs.Dayjs | null>(dayjs())
  const [returnReason, setReturnReason] = useState<ReturnReasonType>('rejected')
  const [reasonNotes, setReasonNotes] = useState('')
  const [packageCount, setPackageCount] = useState('')
  const [smallPackages, setSmallPackages] = useState('')
  const [mediumPackages, setMediumPackages] = useState('')
  const [bigPackages, setBigPackages] = useState('')
  const [notes, setNotes] = useState('')

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // If we have a trip context, load trip details
        if (preselectedTripId) {
          // Load trip data, pickup locations, AND all dropoff locations
          const [tripData, pickups, allDropoffs] = await Promise.all([
            getTripById(preselectedTripId),
            getAllPickupLocations({ isActive: true }),
            getAllDropoffLocations({ isActive: true })
          ])
          
          setTripDetails(tripData)
          setPickupLocations(pickups)
          setDropoffLocations(allDropoffs) // Store all dropoffs for fallback
          
          // Build dropoff locations list from multiple sources:
          // 1. From trip's manifests (have associated manifest info)
          // 2. From route's dropoff locations (may not have manifests assigned)
          // 3. From all dropoff locations (for any location along the route)
          
          const dropoffsFromManifests: any[] = []
          const dropoffsFromRoute: any[] = []
          
          // Get dropoffs from manifests
          if (tripData.manifests && tripData.manifests.length > 0) {
            tripData.manifests
              .filter((m: any) => m.dropofflocation)
              .forEach((m: any) => {
                dropoffsFromManifests.push({
                  $id: m.dropofflocation.$id,
                  locationName: m.dropofflocation.locationName || m.dropofflocation.address,
                  manifestId: m.$id,
                  manifestNumber: m.manifestNumber,
                  hasManifest: true
                })
              })
          }
          
          // Get dropoffs from route if available
          if (tripData.route && tripData.route.dropoffLocations) {
            const routeDropoffs = Array.isArray(tripData.route.dropoffLocations)
              ? tripData.route.dropoffLocations
              : []
            
            routeDropoffs.forEach((loc: any) => {
              const locId = typeof loc === 'object' ? loc.$id : loc
              const locName = typeof loc === 'object' ? (loc.locationName || loc.address) : ''
              
              // Only add if not already in manifest list
              if (!dropoffsFromManifests.find(d => d.$id === locId)) {
                dropoffsFromRoute.push({
                  $id: locId,
                  locationName: locName || `Location ${locId.substring(0, 8)}`,
                  hasManifest: false
                })
              }
            })
          }
          
          // Combine and deduplicate - manifest dropoffs take priority (they have more info)
          const allTripDropoffs = [...dropoffsFromManifests]
          dropoffsFromRoute.forEach(loc => {
            if (!allTripDropoffs.find(d => d.$id === loc.$id)) {
              allTripDropoffs.push(loc)
            }
          })
          
          // If we still have no dropoffs from trip context, use all active dropoff locations
          if (allTripDropoffs.length === 0) {
            const fallbackDropoffs = allDropoffs.map((loc: any) => ({
              $id: loc.$id,
              locationName: loc.locationName || loc.address,
              hasManifest: false
            }))
            setTripDropoffLocations(fallbackDropoffs)
          } else {
            setTripDropoffLocations(allTripDropoffs)
          }
          
          // If dropoff was preselected, set it
          if (preselectedDropoffId) {
            setDropoffLocationId(preselectedDropoffId)
          }
          
          // Try to auto-select pickup location from trip's route
          if (tripData.route && tripData.route.pickupLocation) {
            const pickupLoc = tripData.route.pickupLocation
            if (typeof pickupLoc === 'object' && pickupLoc.$id) {
              setPickupLocationId(pickupLoc.$id)
            }
          }
        } else {
          // No trip context - load all data for manual selection
          const [tripsData, pickups, dropoffs] = await Promise.all([
            getAllTrips({ status: 'active' }).catch(() => []),
            getAllPickupLocations({ isActive: true }),
            getAllDropoffLocations({ isActive: true })
          ])
          setTrips(tripsData)
          setPickupLocations(pickups)
          setDropoffLocations(dropoffs)
        }
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Failed to load data. Please refresh the page.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [preselectedTripId, preselectedDropoffId])

  // Calculate total package count from breakdown
  useEffect(() => {
    const small = parseInt(smallPackages) || 0
    const medium = parseInt(mediumPackages) || 0
    const big = parseInt(bigPackages) || 0
    
    if (small > 0 || medium > 0 || big > 0) {
      setPackageCount((small + medium + big).toString())
    }
  }, [smallPackages, mediumPackages, bigPackages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!tripId || !dropoffLocationId || !pickupLocationId || !returnDate || !packageCount) {
      toast.error('Please fill in all required fields')
      return
    }

    const count = parseInt(packageCount)
    if (isNaN(count) || count <= 0) {
      toast.error('Please enter a valid package count')
      return
    }

    try {
      setSubmitting(true)

      // Build package details if breakdown is provided
      let packageDetails: PackageBreakdown | undefined
      const small = parseInt(smallPackages) || 0
      const medium = parseInt(mediumPackages) || 0
      const big = parseInt(bigPackages) || 0
      
      if (small > 0 || medium > 0 || big > 0) {
        packageDetails = { small, medium, big }
      }

      const waybillData: ReturnWaybillInput = {
        tripId,
        dropoffLocationId,
        pickupLocationId,
        returnDate: returnDate.toISOString(),
        returnReason,
        reasonNotes: reasonNotes.trim() || undefined,
        packageCount: count,
        packageDetails,
        manifestId: manifestId || undefined,
        notes: notes.trim() || undefined
      }

      await createReturnWaybill(waybillData)

      toast.success('Return waybill created successfully!')
      
      // Navigate back to trip view if we came from there, otherwise to waybills list
      if (hasTripContext) {
        router.push(`/edms/trips/${tripId}`)
      } else {
        router.push('/edms/returns/waybills')
      }
    } catch (error) {
      console.error('Error creating return waybill:', error)
      toast.error('Failed to create return waybill. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography>Loading data...</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={6}>
          {/* Context Info Alert */}
          <Grid item xs={12}>
            {hasTripContext ? (
              <Alert severity='info' icon={<i className='ri-truck-line' />}>
                <Typography variant='subtitle2'>
                  Creating return waybill for Trip: {tripDetails?.tripNumber || tripId}
                </Typography>
                <Typography variant='body2'>
                  Returns from a dropoff location will be tracked until delivered back to the origin.
                </Typography>
              </Alert>
            ) : (
              <Alert severity='info'>
                A return waybill tracks packages being returned from a dropoff location back to a pickup location. 
                The trip is not complete until all return waybills are delivered.
              </Alert>
            )}
          </Grid>

          {/* Trip Information - Only show selector if not in trip context */}
          {!hasTripContext ? (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant='h6' className='mb-4'>
                    Trip Information
                  </Typography>
                  <Grid container spacing={4}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        select
                        label='Select Trip *'
                        value={tripId}
                        onChange={e => setTripId(e.target.value)}
                        helperText='Select the trip this return is associated with'
                      >
                        <MenuItem value=''>Select a trip</MenuItem>
                        {trips.map(trip => (
                          <MenuItem key={trip.$id} value={trip.$id}>
                            {/* @ts-ignore */}
                            {trip.tripNumber} - {trip.route?.routeName || 'Unknown Route'}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ) : (
            // Show trip info summary in a card
            <Grid item xs={12}>
              <Card variant='outlined'>
                <CardContent>
                  <Box className='flex items-center gap-3'>
                    <Chip 
                      label='Trip' 
                      color='primary' 
                      size='small' 
                    />
                    <Typography variant='h6'>
                      {tripDetails?.tripNumber}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {tripDetails?.route?.routeName || 'Route not specified'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Location Selection */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant='h6' className='mb-4'>
                  Locations
                </Typography>
                <Typography variant='body2' color='text.secondary' className='mb-4'>
                  Returns travel from a dropoff location back to a pickup location
                </Typography>
                <Grid container spacing={4}>
                  <Grid item xs={12} md={6}>
                    {hasTripContext && tripDropoffLocations.length > 0 ? (
                      // Show dropoff locations from this trip (from manifests and route)
                      <TextField
                        fullWidth
                        select
                        label='From (Dropoff Location) *'
                        value={dropoffLocationId}
                        onChange={e => setDropoffLocationId(e.target.value)}
                        helperText='Select the dropoff location where returns are collected'
                      >
                        <MenuItem value=''>Select dropoff location</MenuItem>
                        {tripDropoffLocations.map(location => (
                          <MenuItem key={location.$id} value={location.$id}>
                            <Box className='flex items-center gap-2'>
                              <span>{location.locationName}</span>
                              {location.hasManifest && location.manifestNumber && (
                                <Chip 
                                  label={`Manifest: ${location.manifestNumber}`} 
                                  size='small' 
                                  variant='outlined'
                                  color='primary'
                                />
                              )}
                              {!location.hasManifest && (
                                <Chip 
                                  label='No manifest' 
                                  size='small' 
                                  variant='outlined'
                                  color='default'
                                />
                              )}
                            </Box>
                          </MenuItem>
                        ))}
                      </TextField>
                    ) : hasTripContext && tripDropoffLocations.length === 0 ? (
                      // Trip context but no locations found - show all dropoffs
                      <TextField
                        fullWidth
                        select
                        label='From (Dropoff Location) *'
                        value={dropoffLocationId}
                        onChange={e => setDropoffLocationId(e.target.value)}
                        helperText='Select any dropoff location for this return'
                      >
                        <MenuItem value=''>Select dropoff location</MenuItem>
                        {dropoffLocations.map(location => (
                          <MenuItem key={location.$id} value={location.$id}>
                            {location.locationName}
                          </MenuItem>
                        ))}
                      </TextField>
                    ) : (
                      // Show all dropoff locations
                      <TextField
                        fullWidth
                        select
                        label='From (Dropoff Location) *'
                        value={dropoffLocationId}
                        onChange={e => setDropoffLocationId(e.target.value)}
                        helperText='Where the return is coming from'
                      >
                        <MenuItem value=''>Select dropoff location</MenuItem>
                        {dropoffLocations.map(location => (
                          <MenuItem key={location.$id} value={location.$id}>
                            {location.locationName}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                    {preselectedDropoffName && (
                      <Typography variant='caption' color='primary' sx={{ mt: 1, display: 'block' }}>
                        Pre-selected: {decodeURIComponent(preselectedDropoffName)}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      select
                      label='To (Pickup Location) *'
                      value={pickupLocationId}
                      onChange={e => setPickupLocationId(e.target.value)}
                      helperText='Where the return is going to (usually the origin)'
                    >
                      <MenuItem value=''>Select pickup location</MenuItem>
                      {pickupLocations.map(location => (
                        <MenuItem key={location.$id} value={location.$id}>
                          {location.locationName}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Return Details */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant='h6' className='mb-4'>
                  Return Details
                </Typography>
                <Grid container spacing={4}>
                  <Grid item xs={12} md={6}>
                    <DatePicker
                      label='Return Date *'
                      value={returnDate}
                      onChange={setReturnDate}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          helperText: 'Date the return was initiated'
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      select
                      label='Return Reason *'
                      value={returnReason}
                      onChange={e => setReturnReason(e.target.value as ReturnReasonType)}
                    >
                      {returnReasons.map(reason => (
                        <MenuItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label='Reason Notes'
                      placeholder='Additional details about the return reason...'
                      value={reasonNotes}
                      onChange={e => setReasonNotes(e.target.value)}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Package Information */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant='h6' className='mb-4'>
                  Package Information
                </Typography>
                <Typography variant='body2' color='text.secondary' className='mb-4'>
                  Enter total package count or provide breakdown by size
                </Typography>
                <Grid container spacing={4}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type='number'
                      label='Total Package Count *'
                      placeholder='10'
                      value={packageCount}
                      onChange={e => setPackageCount(e.target.value)}
                      inputProps={{ min: 1 }}
                      helperText='Total number of packages being returned'
                    />
                  </Grid>
                </Grid>
                
                <Divider className='my-4' />
                
                <Typography variant='subtitle2' className='mb-4'>
                  Package Breakdown (Optional)
                </Typography>
                <Grid container spacing={4}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      type='number'
                      label='Small Packages'
                      placeholder='0'
                      value={smallPackages}
                      onChange={e => setSmallPackages(e.target.value)}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      type='number'
                      label='Medium Packages'
                      placeholder='0'
                      value={mediumPackages}
                      onChange={e => setMediumPackages(e.target.value)}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      type='number'
                      label='Big Packages'
                      placeholder='0'
                      value={bigPackages}
                      onChange={e => setBigPackages(e.target.value)}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Additional Notes */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant='h6' className='mb-4'>
                  Additional Notes
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label='Notes'
                  placeholder='Any additional notes about this return waybill...'
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Actions */}
          <Grid item xs={12}>
            <div className='flex items-center justify-end gap-4'>
              <Button
                variant='outlined'
                color='secondary'
                onClick={() => hasTripContext ? router.push(`/edms/trips/${tripId}`) : router.push('/edms/returns/waybills')}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                variant='contained'
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create Return Waybill'}
              </Button>
            </div>
          </Grid>
        </Grid>
      </form>
    </LocalizationProvider>
  )
}

export default ReturnWaybillCreateForm
