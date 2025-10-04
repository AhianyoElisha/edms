'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import { DateTimePicker } from '@mui/x-date-pickers-pro'
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers-pro'
import { LicenseInfo } from '@mui/x-license'
import dayjs from 'dayjs'

LicenseInfo.setLicenseKey('e0d9bb8070ce0054c9d9ecb6e82cb58fTz0wLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxLVj0y')

// Type Imports
import type { WizardStepProps } from './types'
import type { VehicleType, RouteType } from '@/types/apps/deliveryTypes'

// Actions
import { getAllVehicles } from '@/libs/actions/vehicle.actions'
import { getAllRoutes } from '@/libs/actions/route.actions'
import { getUserList } from '@/libs/actions/customer.action'

interface DriverUser {
  $id: string
  name: string
  email: string
}

const StepTripDetails = ({ handleNext, wizardData, updateWizardData }: WizardStepProps) => {
  // States
  const [drivers, setDrivers] = useState<DriverUser[]>([])
  const [vehicles, setVehicles] = useState<VehicleType[]>([])
  const [routes, setRoutes] = useState<RouteType[]>([])
  const [loading, setLoading] = useState(true)

  // Form states
  const [driverId, setDriverId] = useState(wizardData.tripDetails.driverId)
  const [vehicleId, setVehicleId] = useState(wizardData.tripDetails.vehicleId)
  const [routeId, setRouteId] = useState(wizardData.tripDetails.routeId)
  const [startTime, setStartTime] = useState(wizardData.tripDetails.startTime)
  const [notes, setNotes] = useState(wizardData.tripDetails.notes || '')

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersResponse, vehiclesData, routesData] = await Promise.all([
          getUserList(),
          getAllVehicles({ status: 'active' }),
          getAllRoutes({ isActive: true })
        ])

        // Filter users with driver role
        const driverUsers = usersResponse?.rows.filter((user: any) => 
          user.role?.name === 'driver'
        )
        setDrivers(driverUsers as unknown as DriverUser[])
        setVehicles(vehiclesData)
        setRoutes(routesData)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleSubmit = () => {
    if (!driverId || !vehicleId || !routeId || !startTime) {
      alert('Please fill in all required fields')
      return
    }

    const driver = drivers.find(d => d.$id === driverId)
    const vehicle = vehicles.find(v => v.$id === vehicleId)
    const route = routes.find(r => r.$id === routeId)

    updateWizardData({
      tripDetails: {
        driverId,
        driverName: driver?.name || '',
        vehicleId,
        vehicleNumber: vehicle?.vehicleNumber || '',
        routeId,
        routeName: route?.routeName || '',
        startTime,
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

      <Grid item xs={12} sm={6}>
        <TextField
          select
          fullWidth
          label='Select Driver'
          value={driverId}
          onChange={e => setDriverId(e.target.value)}
          required
        >
          {drivers.length === 0 ? (
            <MenuItem disabled>No drivers available</MenuItem>
          ) : (
            drivers.map(driver => (
              <MenuItem key={driver.$id} value={driver.$id}>
                <div>
                  <Typography variant='body1'>{driver.name}</Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {driver.email}
                  </Typography>
                </div>
              </MenuItem>
            ))
          )}
        </TextField>
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          select
          fullWidth
          label='Select Vehicle'
          value={vehicleId}
          onChange={e => setVehicleId(e.target.value)}
          required
        >
          {vehicles.length === 0 ? (
            <MenuItem disabled>No active vehicles available</MenuItem>
          ) : (
            vehicles.map(vehicle => (
              <MenuItem key={vehicle.$id} value={vehicle.$id}>
                <div>
                  <Typography variant='body1'>{vehicle.vehicleNumber}</Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {vehicle.type} - {vehicle.brand} {vehicle.model}
                  </Typography>
                </div>
              </MenuItem>
            ))
          )}
        </TextField>
      </Grid>

      <Grid item xs={12}>
        <TextField
          select
          fullWidth
          label='Select Route'
          value={routeId}
          onChange={e => setRouteId(e.target.value)}
          required
        >
          {routes.length === 0 ? (
            <MenuItem disabled>No active routes available</MenuItem>
          ) : (
            routes.map(route => (
              <MenuItem key={route.$id} value={route.$id}>
                <div>
                  <Typography variant='body1'>{route.routeName}</Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {route.routeCode} - {route.startLocationName} → {route.endLocationName}
                    {route.intermediateStops.length > 0 && ` (${route.intermediateStops.length} stops)`}
                  </Typography>
                </div>
              </MenuItem>
            ))
          )}
        </TextField>
      </Grid>

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
            Next: Add Manifests
          </Button>
        </div>
      </Grid>
      </Grid>
    </LocalizationProvider>
  )
}

export default StepTripDetails
