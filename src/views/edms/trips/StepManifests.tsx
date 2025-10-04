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
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import { TimePicker } from '@mui/x-date-pickers-pro'
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers-pro'
import { LicenseInfo } from '@mui/x-license'
import dayjs from 'dayjs'

LicenseInfo.setLicenseKey('e0d9bb8070ce0054c9d9ecb6e82cb58fTz0wLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxLVj0y')

// Type Imports
import type { WizardStepProps, ManifestData } from './types'
import type { RouteStopType } from '@/types/apps/deliveryTypes'

// Actions
import { getRouteDropoffLocations } from '@/libs/actions/route.actions'

const StepManifests = ({ handleNext, handlePrev, wizardData, updateWizardData }: WizardStepProps) => {
  // States
  const [dropoffLocations, setDropoffLocations] = useState<RouteStopType[]>([])
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set())
  const [manifestDetails, setManifestDetails] = useState<Map<string, Partial<ManifestData>>>(new Map())
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
          const selected = new Set(wizardData.manifests.map(m => m.dropoffLocationId))
          setSelectedLocations(selected)

          const details = new Map()
          wizardData.manifests.forEach(manifest => {
            details.set(manifest.dropoffLocationId, manifest)
          })
          setManifestDetails(details)
        }
      } catch (error) {
        console.error('Error loading dropoff locations:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDropoffs()
  }, [wizardData.tripDetails.routeId, wizardData.manifests])

  const handleLocationToggle = (locationId: string, locationName: string, address: string, sequence: number) => {
    const newSelected = new Set(selectedLocations)
    
    if (newSelected.has(locationId)) {
      newSelected.delete(locationId)
      const newDetails = new Map(manifestDetails)
      newDetails.delete(locationId)
      setManifestDetails(newDetails)
    } else {
      newSelected.add(locationId)
      // Initialize manifest details for this location
      const newDetails = new Map(manifestDetails)
      newDetails.set(locationId, {
        manifestNumber: generateManifestNumber(),
        dropoffLocationId: locationId,
        dropoffLocationName: locationName,
        dropoffAddress: address
      })
      setManifestDetails(newDetails)
    }
    
    setSelectedLocations(newSelected)
  }

  const generateManifestNumber = () => {
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
    return `MAN-${year}${month}${day}-${random}`
  }

  const updateManifestDetail = (locationId: string, field: string, value: string) => {
    const newDetails = new Map(manifestDetails)
    const current = newDetails.get(locationId) || {}
    newDetails.set(locationId, { ...current, [field]: value })
    setManifestDetails(newDetails)
  }

  const handleSubmit = () => {
    if (selectedLocations.size === 0) {
      alert('Please select at least one dropoff location for manifest creation')
      return
    }

    // Validate all selected locations have manifest numbers
    for (const locationId of selectedLocations) {
      const details = manifestDetails.get(locationId)
      if (!details?.manifestNumber) {
        alert('Please ensure all selected locations have manifest numbers')
        return
      }
    }

    // Convert to array of ManifestData
    const manifests: ManifestData[] = Array.from(selectedLocations).map((locationId, index) => {
      const details = manifestDetails.get(locationId)!
      const location = dropoffLocations.find(loc => loc.locationId === locationId)!
      
      return {
        tempId: `manifest-${Date.now()}-${index}`,
        dropoffLocationId: locationId,
        dropoffLocationName: location.locationName,
        dropoffAddress: location.address,
        manifestNumber: details.manifestNumber!,
        departureTime: details.departureTime,
        estimatedArrival: details.estimatedArrival || location.estimatedArrival,
        notes: details.notes
      }
    })

    updateWizardData({ manifests })
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
          Select dropoff locations that will have manifests. This includes all intermediate stops and the final destination. Not all locations require manifests.
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Route: <strong>{wizardData.tripDetails.routeName}</strong> 
        </Typography>
        <Typography variant='body2' color='primary'>
          {dropoffLocations.length} dropoff location{dropoffLocations.length !== 1 ? 's' : ''} available (includes intermediate stops + final destination)
        </Typography>
      </Grid>

      <Grid item xs={12}>
        <Alert severity='info' icon={<i className='ri-route-line' />}>
          <Typography variant='body2' className='font-semibold mb-1'>Route Structure</Typography>
          <Typography variant='caption'>
            This route includes: <strong>1 Pickup Location</strong> → <strong>{dropoffLocations.length - 1} Intermediate Stop(s)</strong> → <strong>1 Final Destination</strong>
            <br />
            All intermediate stops and the final destination are dropoff locations where manifests can be created.
          </Typography>
        </Alert>
      </Grid>

      {selectedLocations.size > 0 && (
        <Grid item xs={12}>
          <Chip 
            label={`${selectedLocations.size} manifest(s) selected`} 
            color='primary' 
            variant='tonal'
          />
        </Grid>
      )}

      {dropoffLocations.map((location, index) => {
        const isSelected = selectedLocations.has(location.locationId)
        const details = manifestDetails.get(location.locationId)

        return (
          <Grid item xs={12} key={location.locationId}>
            <Card variant='outlined' className={isSelected ? 'border-primary' : ''}>
              <CardContent>
                <Grid container spacing={3}>
                  {/* Location Header */}
                  <Grid item xs={12}>
                    <div className='flex items-start justify-between'>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleLocationToggle(
                              location.locationId,
                              location.locationName,
                              location.address,
                              location.sequence || index + 1
                            )}
                          />
                        }
                        label={
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
                        }
                      />
                    </div>
                  </Grid>

                  {/* Manifest Details (shown when selected) */}
                  {isSelected && (
                    <>
                      <Grid item xs={12}>
                        <Divider />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label='Manifest Number'
                          value={details?.manifestNumber || ''}
                          onChange={(e) => updateManifestDetail(location.locationId, 'manifestNumber', e.target.value)}
                          required
                          size='small'
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TimePicker
                          label='Estimated Arrival Time'
                          value={(details?.estimatedArrival || location.estimatedArrival) ? dayjs((details?.estimatedArrival || location.estimatedArrival), 'HH:mm') : null}
                          onChange={(time) => {
                            const timeString = time ? time.format('HH:mm') : ''
                            updateManifestDetail(location.locationId, 'estimatedArrival', timeString)
                          }}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              size: 'small'
                            }
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TimePicker
                          label='Departure Time (Optional)'
                          value={details?.departureTime ? dayjs(details?.departureTime, 'HH:mm') : null}
                          onChange={(time) => {
                            const timeString = time ? time.format('HH:mm') : ''
                            updateManifestDetail(location.locationId, 'departureTime', timeString)
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
                          multiline
                          rows={2}
                          label='Notes (Optional)'
                          value={details?.notes || ''}
                          onChange={(e) => updateManifestDetail(location.locationId, 'notes', e.target.value)}
                          size='small'
                          placeholder='Special instructions for this dropoff...'
                        />
                      </Grid>
                    </>
                  )}
                </Grid>
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
            disabled={selectedLocations.size === 0}
          >
            Next: Add Packages
          </Button>
        </div>
        </Grid>
      </Grid>
    </LocalizationProvider>
  )
}

export default StepManifests
