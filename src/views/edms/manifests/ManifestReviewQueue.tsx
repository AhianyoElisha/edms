'use client'

// React Imports
import { useCallback, useEffect, useMemo, useState } from 'react'

// Next Imports
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'

// Third-party Imports
import { toast } from 'react-toastify'

// Component Imports
import CompanyField from '@/components/edms/CompanyField'

// Hook Imports
import { usePermissions } from '@/hooks/usePermissions'

// Action Imports
import {
  getManifestClientOptions,
  getManifestsAwaitingVerification,
  verifyManifestDetails
} from '@/libs/actions/manifest.actions'

const PACKAGE_SIZES = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'big', label: 'Big' }
]

interface DraftDetails {
  manifestNumber: string
  clientName: string
  packageSize: string
  packageCount: string
  shortageCount: string
}

// Start each form from whatever is already known: figures the driver typed at
// the stop, and the company the trip was priced for.
const initialDraft = (manifest: any): DraftDetails => {
  const trip = typeof manifest.trip === 'object' ? manifest.trip : null

  return {
    manifestNumber: '',
    clientName: manifest.clientName || trip?.rateCard?.clientName || '',
    packageSize: manifest.packageSize || '',
    packageCount: manifest.packageCount > 0 ? String(manifest.packageCount) : '',
    shortageCount: manifest.shortageCount > 0 ? String(manifest.shortageCount) : ''
  }
}

// Blank is fine (the field is optional); anything typed must be a whole number >= 0.
const parseOptionalCount = (raw: string): number | null | 'invalid' => {
  const value = raw.trim()

  if (value === '') return null
  if (!/^\d+$/.test(value)) return 'invalid'

  return parseInt(value, 10)
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '—'

  return new Date(value).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const locationName = (manifest: any) => {
  const location = manifest.dropofflocation

  if (location && typeof location === 'object') {
    return location.locationName || location.address || location.city || 'Unknown stop'
  }

  return 'Unknown stop'
}

/**
 * The back office's catch-up screen.
 *
 * Drivers close out deliveries in the field with nothing but a photo, which
 * leaves the manifest number and package figures blank. This queue puts every
 * one of those manifests in a single list, photo beside the fields, so an admin
 * can work through a morning's deliveries without opening a trip at a time.
 */
const ManifestReviewQueue = () => {
  const searchParams = useSearchParams()
  const tripFilter = searchParams.get('tripId')

  const { user, hasPermission, isDriver, isLoading: permissionsLoading } = usePermissions()

  // Drivers hold manifests.edit in the live role data, but entering the figures is
  // the office's job - matching how ManifestView gates its verification affordances.
  const canVerify = !isDriver && hasPermission('manifests.edit')

  const [manifests, setManifests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState<Record<string, DraftDetails>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [clientOptions, setClientOptions] = useState<string[]>([])

  useEffect(() => {
    getManifestClientOptions().then(setClientOptions)
  }, [])

  const loadQueue = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getManifestsAwaitingVerification()

      setManifests(data)
    } catch (error: any) {
      console.error('Error loading review queue:', error)
      toast.error(error?.message || 'Could not load the review queue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  const visibleManifests = useMemo(() => {
    let rows = manifests

    if (tripFilter) {
      rows = rows.filter(m => (typeof m.trip === 'object' ? m.trip?.$id : m.trip) === tripFilter)
    }

    if (search.trim()) {
      const term = search.trim().toLowerCase()

      rows = rows.filter(m => {
        const trip = typeof m.trip === 'object' ? m.trip : null

        return [
          m.manifestNumber,
          trip?.tripNumber,
          trip?.driver?.name,
          trip?.vehicle?.vehicleNumber,
          trip?.route?.routeName,
          m.clientName,
          locationName(m)
        ]
          .filter(Boolean)
          .some((value: string) => value.toLowerCase().includes(term))
      })
    }

    return rows
  }, [manifests, tripFilter, search])

  const draftFor = (manifest: any) => drafts[manifest.$id] || initialDraft(manifest)

  const updateDraft = (manifest: any, field: keyof DraftDetails, value: string) => {
    setDrafts(prev => ({ ...prev, [manifest.$id]: { ...(prev[manifest.$id] || initialDraft(manifest)), [field]: value } }))
  }

  const handleVerify = async (manifest: any) => {
    const draft = draftFor(manifest)

    // Every figure is optional - not all clients' manifests carry a package
    // count - so only what was actually typed gets checked.
    const packageCount = parseOptionalCount(draft.packageCount)
    const shortageCount = parseOptionalCount(draft.shortageCount)

    if (packageCount === 'invalid') {
      toast.error('Total packages must be a whole number, or left blank')

      return
    }

    if (shortageCount === 'invalid') {
      toast.error('Shortages must be a whole number, or left blank')

      return
    }

    if (packageCount !== null && packageCount > 0 && shortageCount !== null && shortageCount > packageCount) {
      toast.error('Shortages cannot be more than the total packages')

      return
    }

    try {
      setSavingId(manifest.$id)

      await verifyManifestDetails(
        manifest.$id,
        {
          manifestNumber: draft.manifestNumber.trim() || undefined,
          clientName: draft.clientName.trim(),
          packageSize: draft.packageSize || null,
          packageCount,
          shortageCount
        },
        user?.name || user?.email
      )

      toast.success('Manifest details saved')
      setManifests(prev => prev.filter(m => m.$id !== manifest.$id))
      setDrafts(prev => {
        const next = { ...prev }

        delete next[manifest.$id]

        return next
      })
    } catch (error: any) {
      console.error('Error verifying manifest:', error)
      toast.error(error?.message || 'Could not save the manifest details')
    } finally {
      setSavingId(null)
    }
  }

  if (permissionsLoading || loading) {
    return (
      <Card>
        <CardContent className='flex flex-col items-center justify-center py-16 gap-3'>
          <CircularProgress />
          <Typography color='text.secondary'>Loading manifests awaiting review…</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className='mb-6'>
        <CardContent className='flex flex-col sm:flex-row sm:items-center gap-4'>
          <div className='flex-1'>
            <Typography variant='h5'>Manifests Awaiting Review</Typography>
            <Typography variant='body2' color='text.secondary'>
              Deliveries drivers logged in the field. Read the figures off each photo and complete the record.
            </Typography>
          </div>
          <Chip
            label={`${visibleManifests.length} pending`}
            color={visibleManifests.length > 0 ? 'warning' : 'success'}
            variant='tonal'
          />
          <Button variant='outlined' startIcon={<i className='ri-refresh-line' />} onClick={loadQueue}>
            Refresh
          </Button>
        </CardContent>
      </Card>

      {tripFilter && (
        <Alert
          severity='info'
          className='mb-6'
          action={
            <Button size='small' href='/edms/manifests/review'>
              Show all
            </Button>
          }
        >
          Showing manifests for one trip only.
        </Alert>
      )}

      <TextField
        fullWidth
        size='small'
        className='mb-6'
        placeholder='Search by trip, driver, vehicle, route, company or stop…'
        value={search}
        onChange={e => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position='start'>
              <i className='ri-search-line' />
            </InputAdornment>
          )
        }}
      />

      {visibleManifests.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-16 gap-2'>
            <i className='ri-checkbox-circle-line text-6xl text-success' />
            <Typography variant='h6'>Nothing waiting on you</Typography>
            <Typography variant='body2' color='text.secondary'>
              Every logged delivery has its package details recorded.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <div className='flex flex-col gap-6'>
          {visibleManifests.map(manifest => {
            const trip = typeof manifest.trip === 'object' ? manifest.trip : null
            const draft = draftFor(manifest)
            const photo = manifest.manifestImage || manifest.proofOfDeliveryImage
            const isSaving = savingId === manifest.$id

            return (
              <Card key={manifest.$id}>
                <CardContent>
                  <Grid container spacing={5}>
                    {/* The photo is the source of truth - give it real space. */}
                    <Grid item xs={12} md={4}>
                      {photo ? (
                        <Box
                          role='button'
                          tabIndex={0}
                          onClick={() => setLightbox(photo)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') setLightbox(photo)
                          }}
                          className='cursor-pointer'
                        >
                          <img
                            src={photo}
                            alt={`Manifest for ${locationName(manifest)}`}
                            className='w-full rounded-lg border'
                            style={{ maxHeight: 260, objectFit: 'cover' }}
                          />
                          <Typography variant='caption' color='text.secondary' className='block text-center mt-1'>
                            Tap to enlarge
                          </Typography>
                        </Box>
                      ) : (
                        <Box className='flex flex-col items-center justify-center gap-2 py-12 rounded-lg border border-dashed'>
                          <i className='ri-image-off-line text-3xl text-textDisabled' />
                          <Typography variant='body2' color='text.secondary'>
                            No photo attached
                          </Typography>
                        </Box>
                      )}
                    </Grid>

                    <Grid item xs={12} md={8}>
                      <div className='flex flex-wrap items-center gap-2 mb-1'>
                        <Typography variant='h6'>{locationName(manifest)}</Typography>
                        <Chip label={`Stop #${manifest.dropoffSequence || 1}`} size='small' variant='tonal' />
                        <Chip
                          label={manifest.status === 'delivered' ? 'Delivered' : manifest.status}
                          size='small'
                          color='success'
                          variant='tonal'
                        />
                      </div>

                      <Typography variant='body2' color='text.secondary' className='mb-1'>
                        {trip ? (
                          <>
                            Trip{' '}
                            <Link href={`/edms/trips/${trip.$id}`} className='text-primary'>
                              {trip.tripNumber}
                            </Link>
                            {trip.driver?.name ? ` • ${trip.driver.name}` : ''}
                            {trip.vehicle?.vehicleNumber ? ` • ${trip.vehicle.vehicleNumber}` : ''}
                            {trip.route?.routeName ? ` • ${trip.route.routeName}` : ''}
                          </>
                        ) : (
                          'Trip unavailable'
                        )}
                      </Typography>

                      <Typography variant='caption' color='text.secondary' className='block mb-4'>
                        Logged {formatDateTime(manifest.deliveryTime || manifest.$createdAt)} • temporary no.{' '}
                        {manifest.manifestNumber}
                      </Typography>

                      <Divider className='mb-4' />

                      <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size='small'
                            label='Manifest Number'
                            placeholder={manifest.manifestNumber}
                            value={draft.manifestNumber}
                            onChange={e => updateDraft(manifest, 'manifestNumber', e.target.value)}
                            disabled={!canVerify || isSaving}
                            helperText='From the paper'
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <CompanyField
                            options={clientOptions}
                            value={draft.clientName}
                            onChange={value => updateDraft(manifest, 'clientName', value)}
                            disabled={!canVerify || isSaving}
                            helperText='Pick one or type a new name'
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            select
                            fullWidth
                            size='small'
                            label='Package Size'
                            value={draft.packageSize}
                            onChange={e => updateDraft(manifest, 'packageSize', e.target.value)}
                            disabled={!canVerify || isSaving}
                            helperText='Optional'
                          >
                            <MenuItem value=''>
                              <em>Not specified</em>
                            </MenuItem>
                            {PACKAGE_SIZES.map(size => (
                              <MenuItem key={size.value} value={size.value}>
                                {size.label}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid item xs={6} sm={4}>
                          <TextField
                            fullWidth
                            size='small'
                            type='number'
                            label='Total Packages'
                            value={draft.packageCount}
                            onChange={e => updateDraft(manifest, 'packageCount', e.target.value)}
                            inputProps={{ min: 0 }}
                            disabled={!canVerify || isSaving}
                            helperText='Optional'
                          />
                        </Grid>
                        <Grid item xs={6} sm={4}>
                          <TextField
                            fullWidth
                            size='small'
                            type='number'
                            label='Shortages'
                            value={draft.shortageCount}
                            onChange={e => updateDraft(manifest, 'shortageCount', e.target.value)}
                            inputProps={{ min: 0 }}
                            disabled={!canVerify || isSaving}
                            helperText='Optional – packages missing'
                          />
                        </Grid>
                      </Grid>

                      <div className='flex flex-wrap gap-2 mt-4'>
                        <Button
                          variant='contained'
                          onClick={() => handleVerify(manifest)}
                          disabled={!canVerify || isSaving}
                          startIcon={
                            isSaving ? <CircularProgress size={16} color='inherit' /> : <i className='ri-check-line' />
                          }
                        >
                          {isSaving ? 'Saving…' : 'Save & Verify'}
                        </Button>
                        <Button variant='outlined' href={`/edms/manifests/${manifest.$id}`}>
                          Open Manifest
                        </Button>
                      </div>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={Boolean(lightbox)} onClose={() => setLightbox(null)} maxWidth='lg' fullWidth>
        <DialogContent className='relative p-0'>
          <IconButton
            onClick={() => setLightbox(null)}
            className='absolute'
            sx={{ top: 8, insetInlineEnd: 8, bgcolor: 'background.paper' }}
          >
            <i className='ri-close-line' />
          </IconButton>
          {lightbox && <img src={lightbox} alt='Manifest' className='w-full h-auto' />}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ManifestReviewQueue
