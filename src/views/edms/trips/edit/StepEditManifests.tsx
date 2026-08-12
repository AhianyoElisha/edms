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
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'
import { TimePicker } from '@mui/x-date-pickers-pro'
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers-pro'
import { LicenseInfo } from '@mui/x-license'
import dayjs from 'dayjs'

LicenseInfo.setLicenseKey('e0d9bb8070ce0054c9d9ecb6e82cb58fTz0wLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxLVj0y')

// Third-party Imports
import { toast } from 'react-toastify'

// Package size options
const PACKAGE_SIZES = [
  { value: 'small', label: 'Small Packages' },
  { value: 'medium', label: 'Medium Packages' },
  { value: 'big', label: 'Big Packages' }
] as const

// Type Imports
import type { WizardStepProps, ManifestData } from '../types'
import type { RouteStopType } from '@/types/apps/deliveryTypes'

// Actions
import { getRouteDropoffLocations } from '@/libs/actions/route.actions'

interface ManifestEntry {
  id: string
  existingId?: string
  locked: boolean
  status?: string
  deliveredCount?: number
  locationId: string
  locationName: string
  address: string
  manifestNumber: string
  packageSize: 'small' | 'medium' | 'big'
  packageCount: number
  estimatedArrival?: string
  notes?: string
}

// A manifest that has been delivered (or partially delivered) is history: it can
// no longer be edited or removed, only viewed.
const isLocked = (manifest: ManifestData) =>
  manifest.status === 'delivered' || manifest.status === 'completed' || (manifest.deliveredCount || 0) > 0

const toEntries = (manifests: ManifestData[]): ManifestEntry[] =>
  manifests.map(manifest => ({
    id: manifest.tempId,
    existingId: manifest.$id,
    locked: isLocked(manifest),
    status: manifest.status,
    deliveredCount: manifest.deliveredCount,
    locationId: manifest.dropoffLocationId,
    locationName: manifest.dropoffLocationName,
    address: manifest.dropoffAddress,
    manifestNumber: manifest.manifestNumber,
    packageSize: manifest.packageSize,
    packageCount: manifest.packageCount,
    estimatedArrival: manifest.estimatedArrival,
    notes: manifest.notes
  }))

const StepEditManifests = ({
  handleNext,
  handlePrev,
  wizardData,
  updateWizardData
}: WizardStepProps & { tripData: any }) => {
  // States
  const [dropoffLocations, setDropoffLocations] = useState<RouteStopType[]>([])
  const [manifests, setManifests] = useState<ManifestEntry[]>(() => toEntries(wizardData.manifests))
  const [loading, setLoading] = useState(true)

  const routeId = wizardData.tripDetails.routeId

  // Load dropoff locations for the currently selected route
  useEffect(() => {
    const loadDropoffs = async () => {
      if (!routeId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const locations = await getRouteDropoffLocations(routeId)
        setDropoffLocations(locations)
      } catch (error) {
        console.error('Error loading dropoff locations:', error)
        toast.error('Failed to load dropoff locations for this route')
      } finally {
        setLoading(false)
      }
    }

    loadDropoffs()
  }, [routeId])

  const generateManifestNumber = () => {
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
    return `MAN-${year}${month}${day}-${random}`
  }

  const addManifestForLocation = (location: RouteStopType) => {
    setManifests(prev => [
      ...prev,
      {
        id: `manifest-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        locked: false,
        locationId: location.locationId,
        locationName: location.locationName,
        address: location.address,
        manifestNumber: generateManifestNumber(),
        packageSize: 'small',
        packageCount: 0,
        estimatedArrival: location.estimatedArrival
      }
    ])
  }

  const removeManifest = (manifestId: string) => {
    setManifests(prev => prev.filter(m => m.id !== manifestId))
  }

  const updateManifest = (manifestId: string, field: keyof ManifestEntry, value: string | number) => {
    setManifests(prev => prev.map(m => (m.id === manifestId ? { ...m, [field]: value } : m)))
  }

  const getManifestsForLocation = (locationId: string) => manifests.filter(m => m.locationId === locationId)

  // Manifests pinned to a location that is no longer part of the selected route
  const orphanedManifests = manifests.filter(m => !dropoffLocations.some(l => l.locationId === m.locationId))

  const handleSubmit = () => {
    for (const manifest of manifests) {
      if (manifest.locked) continue

      if (!manifest.manifestNumber) {
        toast.error('Please ensure all manifests have manifest numbers')
        return
      }
      if (!manifest.packageSize) {
        toast.error('Please select a package size for all manifests')
        return
      }
      if (manifest.packageCount === undefined || manifest.packageCount < 1) {
        toast.error('Please enter a valid package count (at least 1) for all manifests')
        return
      }
    }

    const manifestData: ManifestData[] = manifests.map(m => ({
      tempId: m.id,
      $id: m.existingId,
      status: m.status,
      deliveredCount: m.deliveredCount,
      dropoffLocationId: m.locationId,
      dropoffLocationName: m.locationName,
      dropoffAddress: m.address,
      manifestNumber: m.manifestNumber,
      packageSize: m.packageSize,
      packageCount: m.packageCount,
      estimatedArrival: m.estimatedArrival,
      notes: m.notes
    }))

    updateWizardData({ manifests: manifestData })
    handleNext()
  }

  const renderManifestCard = (manifest: ManifestEntry, index: number) => (
    <Box key={manifest.id} className='border rounded-lg p-4 bg-actionHover'>
      <Box className='flex items-center justify-between mb-3'>
        <div className='flex items-center gap-2'>
          <Typography variant='subtitle2' className='font-medium'>
            Manifest #{index + 1}
          </Typography>
          {manifest.existingId ? (
            <Chip label='Existing' size='small' variant='tonal' color='info' />
          ) : (
            <Chip label='New' size='small' variant='tonal' color='success' />
          )}
          {manifest.locked && (
            <Chip
              label={`Delivered${manifest.deliveredCount ? ` (${manifest.deliveredCount})` : ''}`}
              size='small'
              variant='tonal'
              color='success'
              icon={<i className='ri-lock-line' />}
            />
          )}
        </div>
        {manifest.locked ? (
          <Tooltip title='Delivered manifests cannot be edited or removed'>
            <span>
              <IconButton size='small' disabled>
                <i className='ri-lock-line' />
              </IconButton>
            </span>
          </Tooltip>
        ) : (
          <IconButton size='small' color='error' onClick={() => removeManifest(manifest.id)}>
            <i className='ri-delete-bin-line' />
          </IconButton>
        )}
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            label='Manifest Number'
            value={manifest.manifestNumber || ''}
            onChange={e => updateManifest(manifest.id, 'manifestNumber', e.target.value)}
            required
            size='small'
            disabled={manifest.locked}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size='small' required disabled={manifest.locked}>
            <InputLabel>Package Size</InputLabel>
            <Select
              value={manifest.packageSize || 'small'}
              label='Package Size'
              onChange={e => updateManifest(manifest.id, 'packageSize', e.target.value)}
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
            onChange={e => updateManifest(manifest.id, 'packageCount', parseInt(e.target.value) || 0)}
            required
            size='small'
            inputProps={{ min: 1 }}
            helperText='Total packages'
            disabled={manifest.locked}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <TimePicker
            label='Est. Arrival'
            value={manifest.estimatedArrival ? dayjs(manifest.estimatedArrival, 'HH:mm') : null}
            onChange={time => updateManifest(manifest.id, 'estimatedArrival', time ? time.format('HH:mm') : '')}
            disabled={manifest.locked}
            slotProps={{ textField: { fullWidth: true, size: 'small' } }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label='Notes (Optional)'
            value={manifest.notes || ''}
            onChange={e => updateManifest(manifest.id, 'notes', e.target.value)}
            size='small'
            placeholder='Special instructions...'
            disabled={manifest.locked}
          />
        </Grid>
      </Grid>
    </Box>
  )

  if (loading) {
    return (
      <Grid container spacing={5}>
        <Grid item xs={12}>
          <Typography>Loading dropoff locations...</Typography>
        </Grid>
      </Grid>
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Grid container spacing={5}>
        <Grid item xs={12}>
          <Typography variant='h5' className='mb-1'>
            Edit Manifests
          </Typography>
          <Typography variant='body2' className='mb-2'>
            Update existing manifests, add new ones, or remove manifests that are no longer needed.
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
            <Typography variant='body2' className='font-semibold mb-1'>
              Changes are saved on the review step
            </Typography>
            <Typography variant='caption'>
              Removing a manifest deletes it from the trip once you save. Manifests that have already been delivered are
              locked and cannot be changed or removed.
            </Typography>
          </Alert>
        </Grid>

        {manifests.length > 0 && (
          <Grid item xs={12}>
            <Chip label={`${manifests.length} manifest(s) on this trip`} color='primary' variant='tonal' />
          </Grid>
        )}

        {dropoffLocations.length === 0 && (
          <Grid item xs={12}>
            <Alert severity='warning'>
              No dropoff locations found for the selected route. Go back and choose a different route to add manifests.
            </Alert>
          </Grid>
        )}

        {/* Orphaned manifests - their location is not on the current route */}
        {orphanedManifests.length > 0 && (
          <Grid item xs={12}>
            <Card variant='outlined' className='border-warning'>
              <CardContent>
                <Alert severity='warning' className='mb-4'>
                  These manifests belong to dropoff locations that are not part of the selected route. Remove them or
                  switch back to the original route before saving.
                </Alert>
                <Box className='space-y-4'>
                  {orphanedManifests.map((manifest, index) => renderManifestCard(manifest, index))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Dropoff Locations */}
        {dropoffLocations.map((location, index) => {
          const locationManifests = getManifestsForLocation(location.locationId)

          return (
            <Grid item xs={12} key={location.locationId}>
              <Card variant='outlined' className={locationManifests.length > 0 ? 'border-primary' : ''}>
                <CardContent>
                  <Box className='flex items-start justify-between mb-4 flex-wrap gap-2'>
                    <div>
                      <div className='flex items-center gap-2 mb-1 flex-wrap'>
                        <Typography variant='h6' className='font-semibold'>
                          Stop {location.sequence || index + 1}: {location.locationName}
                        </Typography>
                        {index === dropoffLocations.length - 1 ? (
                          <Chip label='Final Destination' color='success' size='small' variant='tonal' />
                        ) : (
                          <Chip label='Intermediate Stop' color='info' size='small' variant='tonal' />
                        )}
                        {locationManifests.length > 0 && (
                          <Chip label={`${locationManifests.length} manifest(s)`} color='primary' size='small' />
                        )}
                      </div>
                      <Typography variant='body2' color='text.secondary'>
                        {location.address || 'No address provided'}
                      </Typography>
                    </div>
                    <Button
                      variant='contained'
                      size='small'
                      startIcon={<i className='ri-add-line' />}
                      onClick={() => addManifestForLocation(location)}
                    >
                      Add Manifest
                    </Button>
                  </Box>

                  {locationManifests.length > 0 ? (
                    <Box className='space-y-4'>
                      {locationManifests.map((manifest, mIndex) => renderManifestCard(manifest, mIndex))}
                    </Box>
                  ) : (
                    <Typography variant='body2' color='text.secondary' className='text-center py-4'>
                      No manifests for this location. Click "Add Manifest" to create one.
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
            <Button variant='contained' onClick={handleSubmit}>
              Next: Review Changes
            </Button>
          </div>
        </Grid>
      </Grid>
    </LocalizationProvider>
  )
}

export default StepEditManifests
