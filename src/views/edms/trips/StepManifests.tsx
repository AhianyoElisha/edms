'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'
import { TimePicker } from '@mui/x-date-pickers-pro'
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers-pro'
import { LicenseInfo } from '@mui/x-license'
import dayjs from 'dayjs'

LicenseInfo.setLicenseKey('e0d9bb8070ce0054c9d9ecb6e82cb58fTz0wLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxLVj0y')

// Package size options
const PACKAGE_SIZES = [
  { value: 'small', label: 'Small Packages' },
  { value: 'medium', label: 'Medium Packages' },
  { value: 'big', label: 'Big Packages' }
] as const

// Type Imports
import type { WizardStepProps, ManifestData } from './types'
import type { RouteStopType } from '@/types/apps/deliveryTypes'

// Actions
import { getRouteDropoffLocations } from '@/libs/actions/route.actions'

// Interface for manifest entry with unique ID
interface ManifestEntry extends Partial<ManifestData> {
  id: string
  locationId: string
  locationName: string
  address: string
  sequence: number
}

const StepManifests = ({ handleNext, handlePrev, wizardData, updateWizardData }: WizardStepProps) => {
  // States
  const [dropoffLocations, setDropoffLocations] = useState<RouteStopType[]>([])
  const [manifests, setManifests] = useState<ManifestEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Load dropoff locations from route
  useEffect(() => {
    const loadDropoffs = async () => {
      if (!wizardData.tripDetails.routeId) {
        return
      }

      try {
        const locations = await getRouteDropoffLocations(wizardData.tripDetails.routeId)
        setDropoffLocations(locations)

        // Pre-populate if returning to this step
        if (wizardData.manifests.length > 0) {
          const existingManifests: ManifestEntry[] = wizardData.manifests.map((m, index) => ({
            id: `manifest-${Date.now()}-${index}`,
            locationId: m.dropoffLocationId,
            locationName: m.dropoffLocationName,
            address: m.dropoffAddress,
            sequence: index + 1,
            manifestNumber: m.manifestNumber,
            packageSize: m.packageSize,
            packageCount: m.packageCount,
            departureTime: m.departureTime,
            estimatedArrival: m.estimatedArrival,
            notes: m.notes
          }))
          setManifests(existingManifests)
        }
      } catch (error) {
        console.error('Error loading dropoff locations:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDropoffs()
  }, [wizardData.tripDetails.routeId, wizardData.manifests])

  const generateManifestNumber = () => {
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
    return `MAN-${year}${month}${day}-${random}`
  }

  const addManifestForLocation = (location: RouteStopType, sequence: number) => {
    const newManifest: ManifestEntry = {
      id: `manifest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      locationId: location.locationId,
      locationName: location.locationName,
      address: location.address,
      sequence,
      manifestNumber: generateManifestNumber(),
      packageSize: 'small',
      packageCount: 0,
      estimatedArrival: location.estimatedArrival
    }
    setManifests([...manifests, newManifest])
  }

  const removeManifest = (manifestId: string) => {
    setManifests(manifests.filter(m => m.id !== manifestId))
  }

  const updateManifest = (manifestId: string, field: string, value: string | number) => {
    setManifests(manifests.map(m => 
      m.id === manifestId ? { ...m, [field]: value } : m
    ))
  }

  const getManifestsForLocation = (locationId: string) => {
    return manifests.filter(m => m.locationId === locationId)
  }

  const handleSubmit = () => {
    if (manifests.length === 0) {
      alert('Please add at least one manifest')
      return
    }

    // Validate all manifests
    for (const manifest of manifests) {
      if (!manifest.manifestNumber) {
        alert('Please ensure all manifests have manifest numbers')
        return
      }
      if (!manifest.packageSize) {
        alert('Please select a package size for all manifests')
        return
      }
      if (manifest.packageCount === undefined || manifest.packageCount < 1) {
        alert('Please enter a valid package count (at least 1) for all manifests')
        return
      }
    }

    // Convert to array of ManifestData
    const manifestData: ManifestData[] = manifests.map((m, index) => ({
      tempId: m.id,
      dropoffLocationId: m.locationId,
      dropoffLocationName: m.locationName,
      dropoffAddress: m.address,
      manifestNumber: m.manifestNumber!,
      packageSize: m.packageSize as 'small' | 'medium' | 'big',
      packageCount: m.packageCount!,
      departureTime: m.departureTime,
      estimatedArrival: m.estimatedArrival,
      notes: m.notes
    }))

    updateWizardData({ manifests: manifestData })
    handleNext()
  }

  if (loading) {
    return (
      <Grid container spacing={5}>
        <Grid item xs={12}>
          <Typography>Loading dropoff locations...</Typography>
        </Grid>
      </Grid>
    )
  }

  if (dropoffLocations.length === 0) {
    return (
      <Grid container spacing={5}>
        <Grid item xs={12}>
          <Alert severity="warning">
            No dropoff locations found for the selected route. Please go back and select a different route.
          </Alert>
        </Grid>
        <Grid item xs={12}>
          <Button variant='outlined' onClick={handlePrev}>
            Previous: Trip Details
          </Button>
        </Grid>
      </Grid>
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Grid container spacing={5}>
        <Grid item xs={12}>
          <Typography variant='h5' className='mb-1'>
            Create Manifests for Dropoff Locations
          </Typography>
          <Typography variant='body2' className='mb-2'>
            Add manifests to each dropoff location. You can add <strong>multiple manifests</strong> per location 
            (e.g., one for small packages and one for medium packages).
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Route: <strong>{wizardData.tripDetails.routeName}</strong> 
          </Typography>
          <Typography variant='body2' color='primary'>
            {dropoffLocations.length} dropoff location{dropoffLocations.length !== 1 ? 's' : ''} available
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Alert severity='info' icon={<i className='ri-information-line' />}>
            <Typography variant='body2' className='font-semibold mb-1'>How to use</Typography>
            <Typography variant='caption'>
              Click <strong>"Add Manifest"</strong> for each package size type you need to deliver to a location.
              For example, if a location receives both small and big packages, add two manifests - one for each size.
            </Typography>
          </Alert>
        </Grid>

        {manifests.length > 0 && (
          <Grid item xs={12}>
            <Chip 
              label={`${manifests.length} manifest(s) created`} 
              color='primary' 
              variant='tonal'
            />
          </Grid>
        )}

        {/* Dropoff Locations */}
        {dropoffLocations.map((location, index) => {
          const locationManifests = getManifestsForLocation(location.locationId)

          return (
            <Grid item xs={12} key={location.locationId}>
              <Card variant='outlined' className={locationManifests.length > 0 ? 'border-primary' : ''}>
                <CardContent>
                  {/* Location Header */}
                  <Box className='flex items-start justify-between mb-4'>
                    <div>
                      <div className='flex items-center gap-2 mb-1'>
                        <Typography variant='h6' className='font-semibold'>
                          Stop {location.sequence || index + 1}: {location.locationName}
                        </Typography>
                        {index === dropoffLocations.length - 1 ? (
                          <Chip label='Final Destination' color='success' size='small' variant='tonal' />
                        ) : (
                          <Chip label='Intermediate Stop' color='info' size='small' variant='tonal' />
                        )}
                        {locationManifests.length > 0 && (
                          <Chip 
                            label={`${locationManifests.length} manifest(s)`} 
                            color='primary' 
                            size='small' 
                          />
                        )}
                      </div>
                      <Typography variant='body2' color='text.secondary'>
                        {location.address || 'No address provided'}
                      </Typography>
                      {location.estimatedArrival && (
                        <Typography variant='caption' color='text.secondary'>
                          Est. Arrival: {location.estimatedArrival}
                        </Typography>
                      )}
                    </div>
                    <Button
                      variant='contained'
                      size='small'
                      startIcon={<i className='ri-add-line' />}
                      onClick={() => addManifestForLocation(location, location.sequence || index + 1)}
                    >
                      Add Manifest
                    </Button>
                  </Box>

                  {/* Manifests for this location */}
                  {locationManifests.length > 0 && (
                    <Box className='space-y-4'>
                      {locationManifests.map((manifest, mIndex) => (
                        <Box key={manifest.id} className='border rounded-lg p-4 bg-actionHover'>
                          <Box className='flex items-center justify-between mb-3'>
                            <Typography variant='subtitle2' className='font-medium'>
                              Manifest #{mIndex + 1}
                            </Typography>
                            <IconButton 
                              size='small' 
                              color='error'
                              onClick={() => removeManifest(manifest.id)}
                            >
                              <i className='ri-delete-bin-line' />
                            </IconButton>
                          </Box>
                          
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={3}>
                              <TextField
                                fullWidth
                                label='Manifest Number'
                                value={manifest.manifestNumber || ''}
                                onChange={(e) => updateManifest(manifest.id, 'manifestNumber', e.target.value)}
                                required
                                size='small'
                              />
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                              <FormControl fullWidth size='small' required>
                                <InputLabel>Package Size</InputLabel>
                                <Select
                                  value={manifest.packageSize || 'small'}
                                  label='Package Size'
                                  onChange={(e) => updateManifest(manifest.id, 'packageSize', e.target.value)}
                                >
                                  {PACKAGE_SIZES.map(size => (
                                    <MenuItem key={size.value} value={size.value}>
                                      {size.label}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                              <TextField
                                fullWidth
                                label='Package Count'
                                type='number'
                                value={manifest.packageCount || ''}
                                onChange={(e) => updateManifest(manifest.id, 'packageCount', parseInt(e.target.value) || 0)}
                                required
                                size='small'
                                inputProps={{ min: 1 }}
                                helperText='Total packages'
                              />
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                              <TimePicker
                                label='Est. Arrival'
                                value={manifest.estimatedArrival ? dayjs(manifest.estimatedArrival, 'HH:mm') : null}
                                onChange={(time) => {
                                  const timeString = time ? time.format('HH:mm') : ''
                                  updateManifest(manifest.id, 'estimatedArrival', timeString)
                                }}
                                slotProps={{
                                  textField: {
                                    fullWidth: true,
                                    size: 'small'
                                  }
                                }}
                              />
                            </Grid>

                            <Grid item xs={12}>
                              <TextField
                                fullWidth
                                label='Notes (Optional)'
                                value={manifest.notes || ''}
                                onChange={(e) => updateManifest(manifest.id, 'notes', e.target.value)}
                                size='small'
                                placeholder='Special instructions...'
                              />
                            </Grid>
                          </Grid>
                        </Box>
                      ))}
                    </Box>
                  )}

                  {locationManifests.length === 0 && (
                    <Typography variant='body2' color='text.secondary' className='text-center py-4'>
                      No manifests added for this location. Click "Add Manifest" to create one.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )
        })}

        <Grid item xs={12}>
          <div className='flex items-center justify-between'>
            <Button variant='outlined' onClick={handlePrev}>
              Previous: Trip Details
            </Button>
            <Button 
              variant='contained' 
              onClick={handleSubmit}
              disabled={manifests.length === 0}
            >
              Next: Review &amp; Create
            </Button>
          </div>
        </Grid>
      </Grid>
    </LocalizationProvider>
  )
}

export default StepManifests
