'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import { DateTimePicker } from '@mui/x-date-pickers-pro'
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers-pro'
import { LicenseInfo } from '@mui/x-license'
import dayjs from 'dayjs'

LicenseInfo.setLicenseKey('e0d9bb8070ce0054c9d9ecb6e82cb58fTz0wLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxLVj0y')

// Type Imports
import type { WizardStepProps } from './types'
import type { VehicleType, RouteType } from '@/types/apps/deliveryTypes'
import { VOLUME_TIERS } from '@/types/apps/deliveryTypes'

// Actions
import { getAllVehicles } from '@/libs/actions/vehicle.actions'
import { getAllRoutes } from '@/libs/actions/route.actions'
import { getUserList } from '@/libs/actions/customer.action'
import { getAllRateCards } from '@/libs/actions/ratecard.actions'

interface DriverUser {
  $id: string
  name: string
  email: string
}

const StepTripDetails = ({
  handleNext,
  wizardData,
  updateWizardData,
  nextLabel = 'Next: Add Manifests'
}: WizardStepProps & { nextLabel?: string }) => {
  // States
  const [drivers, setDrivers] = useState<DriverUser[]>([])
  const [vehicles, setVehicles] = useState<VehicleType[]>([])
  const [routes, setRoutes] = useState<RouteType[]>([])
  const [rateCards, setRateCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Form states
  const [driverId, setDriverId] = useState(wizardData.tripDetails.driverId)
  const [vehicleId, setVehicleId] = useState(wizardData.tripDetails.vehicleId)
  const [routeId, setRouteId] = useState(wizardData.tripDetails.routeId)
  const [startTime, setStartTime] = useState(wizardData.tripDetails.startTime)
  const [tonnage, setTonnage] = useState(wizardData.tripDetails.tonnage || '')
  const [tripCost, setTripCost] = useState<number | undefined>(wizardData.tripDetails.tripCost)
  const [costError, setCostError] = useState<string | null>(null)
  const [notes, setNotes] = useState(wizardData.tripDetails.notes || '')

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersResponse, vehiclesData, routesData, rateCardsData] = await Promise.all([
          getUserList(),
          getAllVehicles({ status: 'active' }),
          getAllRoutes({ isActive: true }),
          getAllRateCards({ isActive: true })
        ])

        // Filter users with driver role
        const driverUsers = usersResponse?.rows.filter((user: any) => 
          user.role?.name === 'driver'
        )
        setDrivers(driverUsers as unknown as DriverUser[])
        setVehicles(vehiclesData)
        setRoutes(routesData)
        setRateCards(rateCardsData)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Auto-calculate trip cost when route and tonnage change
  useEffect(() => {
    if (!routeId || !tonnage) {
      setTripCost(undefined)
      setCostError(null)
      return
    }

    const selectedRoute = routes.find(r => r.$id === routeId)
    if (!selectedRoute) return

    // Find the volume tier that matches the selected tonnage
    const selectedTonnage = parseFloat(tonnage)
    const matchedTier = VOLUME_TIERS.find(t => t.tonnage === selectedTonnage)
    if (!matchedTier) {
      setCostError('No volume tier found for selected tonnage')
      setTripCost(undefined)
      return
    }

    // Find a rate card that matches this route
    const matchingRateCard = rateCards.find((rc: any) => {
      // Match by route relationship ID or route code
      const rcRouteId = rc.route?.$id || rc.route
      return rcRouteId === routeId || rc.routeCode === selectedRoute.routeCode
    })

    if (!matchingRateCard) {
      setCostError(`No rate card found for route "${selectedRoute.routeName}"`)
      setTripCost(undefined)
      return
    }

    // Parse volume prices and find the rate for the matched volume
    const volumePrices = typeof matchingRateCard.volumePrices === 'string'
      ? JSON.parse(matchingRateCard.volumePrices)
      : matchingRateCard.volumePrices

    const volumePrice = volumePrices.find((vp: any) => vp.volume === matchedTier.volume)

    if (!volumePrice || !volumePrice.rate || volumePrice.rate === 0) {
      setCostError(`No rate set for ${matchedTier.volume} CBM (${selectedTonnage} tons) on this route`)
      setTripCost(undefined)
      return
    }

    setCostError(null)
    setTripCost(volumePrice.rate)
  }, [routeId, tonnage, routes, rateCards])

  const handleSubmit = () => {
    if (!driverId || !vehicleId || !routeId || !startTime || !tonnage) {
      alert('Please fill in all required fields')
      return
    }

    const driver = drivers.find(d => d.$id === driverId)
    const vehicle = vehicles.find(v => v.$id === vehicleId)
    const route = routes.find(r => r.$id === routeId)

    updateWizardData({
      tripDetails: {
        driverId,
        // Fall back to the name already on the wizard data: when editing a trip
        // whose vehicle/route has since been deactivated it won't be in the lists
        driverName: driver?.name || wizardData.tripDetails.driverName || '',
        vehicleId,
        vehicleNumber: vehicle?.vehicleNumber || wizardData.tripDetails.vehicleNumber || '',
        routeId,
        routeName: route?.routeName || wizardData.tripDetails.routeName || '',
        startTime,
        tonnage,
        tripCost: tripCost || 0,
        notes
      }
    })

    handleNext()
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center p-8'>
        <CircularProgress />
      </div>
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Grid container spacing={5}>
        <Grid item xs={12}>
          <Typography variant='h5' className='mb-1'>
            Trip Details
          </Typography>
          <Typography variant='body2'>Select driver, vehicle, and route for this delivery trip</Typography>
        </Grid>

        {/* Vehicle */}
        <Grid item xs={12} sm={6}>
          <Autocomplete
            fullWidth
            options={vehicles}
            getOptionLabel={v => v.vehicleNumber || ''}
            value={vehicles.find(v => v.$id === vehicleId) || null}
            onChange={(_, selected) => {
              const selectedVehicleId = selected?.$id || ''
              setVehicleId(selectedVehicleId)
              if (selected?.driver) {
                const driverField = selected.driver as any
                const vehicleDriverId = typeof driverField === 'object' ? driverField.$id : driverField
                if (vehicleDriverId) {
                  const matchingDriver = drivers.find(d => d.$id === vehicleDriverId)
                  if (matchingDriver) setDriverId(vehicleDriverId)
                }
              }
            }}
            renderOption={(props, vehicle) => (
              <li {...props} key={vehicle.$id}>
                <div>
                  <Typography variant='body1'>{vehicle.vehicleNumber}</Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {vehicle.type} - {vehicle.brand} {vehicle.model}
                  </Typography>
                </div>
              </li>
            )}
            renderInput={params => (
              <TextField {...params} label='Select Vehicle' required placeholder='Search vehicle...' />
            )}
            noOptionsText='No active vehicles available'
            isOptionEqualToValue={(option, value) => option.$id === value.$id}
          />
        </Grid>

        {/* Driver */}
        <Grid item xs={12} sm={6}>
          <Autocomplete
            fullWidth
            options={drivers}
            getOptionLabel={d => d.name || ''}
            value={drivers.find(d => d.$id === driverId) || null}
            onChange={(_, selected) => {
              const selectedDriverId = selected?.$id || ''
              setDriverId(selectedDriverId)
              const matchingVehicle = vehicles.find(v => {
                const driverField = v.driver as any
                const vehicleDriverId = typeof driverField === 'object' ? driverField?.$id : driverField
                return vehicleDriverId === selectedDriverId
              })
              if (matchingVehicle) setVehicleId(matchingVehicle.$id)
            }}
            renderOption={(props, driver) => (
              <li {...props} key={driver.$id}>
                <div>
                  <Typography variant='body1'>{driver.name}</Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {driver.email}
                  </Typography>
                </div>
              </li>
            )}
            renderInput={params => (
              <TextField {...params} label='Select Driver' required placeholder='Search driver...' />
            )}
            noOptionsText='No drivers available'
            isOptionEqualToValue={(option, value) => option.$id === value.$id}
          />
        </Grid>

        {/* Route */}
        <Grid item xs={12}>
          <Autocomplete
            fullWidth
            options={routes}
            getOptionLabel={r => r.routeName || ''}
            value={routes.find(r => r.$id === routeId) || null}
            onChange={(_, selected) => setRouteId(selected?.$id || '')}
            filterOptions={(options, { inputValue }) => {
              const q = inputValue.toLowerCase()
              return options.filter(r =>
                r.routeName?.toLowerCase().includes(q) ||
                r.routeCode?.toLowerCase().includes(q) ||
                (typeof r.startLocation === 'object'
                  ? (r.startLocation as any)?.locationName?.toLowerCase().includes(q)
                  : String(r.startLocation).toLowerCase().includes(q)) ||
                (typeof r.endLocation === 'object'
                  ? (r.endLocation as any)?.locationName?.toLowerCase().includes(q)
                  : String(r.endLocation).toLowerCase().includes(q))
              )
            }}
            renderOption={(props, route) => {
              const startName = typeof route.startLocation === 'object'
                ? (route.startLocation as any)?.locationName || (route.startLocation as any)?.$id
                : route.startLocation
              const endName = typeof route.endLocation === 'object'
                ? (route.endLocation as any)?.locationName || (route.endLocation as any)?.$id
                : route.endLocation
              return (
                <li {...props} key={route.$id}>
                  <div>
                    <Typography variant='body1'>{route.routeName}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {route.routeCode} · {startName} → {endName}
                      {route.intermediateStops.length > 0 && ` (${route.intermediateStops.length} stops)`}
                    </Typography>
                  </div>
                </li>
              )
            }}
            renderInput={params => (
              <TextField {...params} label='Select Route' required placeholder='Search by name, code, or location...' />
            )}
            noOptionsText='No active routes available'
            isOptionEqualToValue={(option, value) => option.$id === value.$id}
          />
        </Grid>

        {/* Tonnage */}
        <Grid item xs={12} sm={6}>
          <Autocomplete
            fullWidth
            options={VOLUME_TIERS}
            getOptionLabel={tier => `${tier.tonnage} tons`}
            value={VOLUME_TIERS.find(t => t.tonnage.toString() === tonnage) || null}
            onChange={(_, selected) => setTonnage(selected ? selected.tonnage.toString() : '')}
            renderOption={(props, tier) => (
              <li {...props} key={tier.tonnage}>
                <div>
                  <Typography variant='body1'>{tier.tonnage} tons</Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {tier.volume} CBM - {tier.truckCategory === 'small' ? 'Small' : 'Big'} Truck
                  </Typography>
                </div>
              </li>
            )}
            renderInput={params => (
              <TextField {...params} label='Select Tonnage' required placeholder='Search tonnage...' />
            )}
            noOptionsText='No tonnage options available'
            isOptionEqualToValue={(option, value) => option.tonnage === value.tonnage}
          />
        </Grid>

        {/* Trip Cost Display */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label='Trip Cost (GH₵)'
            value={tripCost !== undefined ? tripCost.toFixed(2) : ''}
            InputProps={{ readOnly: true }}
            helperText={costError || 'Auto-calculated from rate card'}
            error={!!costError}
          />
        </Grid>

        {costError && (
          <Grid item xs={12}>
            <Alert severity='warning'>{costError}</Alert>
          </Grid>
        )}

        <Grid item xs={12} sm={6}>
          <DateTimePicker
            label='Trip Start Time'
            value={startTime ? dayjs(startTime) : null}
            onChange={(date) => {
              const isoDate = date ? date.toISOString() : ''
              setStartTime(isoDate)
            }}
            slotProps={{
              textField: {
                fullWidth: true,
                required: true
              }
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label='Notes (Optional)'
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder='Add any special instructions or notes for this trip...'
          />
        </Grid>

        <Grid item xs={12}>
          <div className='flex items-center justify-between'>
            <Button variant='outlined' disabled>
              Previous
            </Button>
            <Button variant='contained' onClick={handleSubmit}>
              {nextLabel}
            </Button>
          </div>
        </Grid>
      </Grid>
    </LocalizationProvider>
  )
}

export default StepTripDetails
