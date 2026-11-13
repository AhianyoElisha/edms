'use client'

// React Imports
import { useCallback, useEffect, useMemo, useState } from 'react'

// Next Imports
import Link from 'next/link'

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
import TablePagination from '@mui/material/TablePagination'
import Autocomplete from '@mui/material/Autocomplete'
import { DatePicker } from '@mui/x-date-pickers-pro'
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers-pro'

// Third-party Imports
import { toast } from 'react-toastify'
import dayjs from 'dayjs'

// Component Imports
import CompanyField from '@/components/edms/CompanyField'

// Hook Imports
import { usePermissions } from '@/hooks/usePermissions'
import { useUrlFilters, useUrlDateFilter } from '@/hooks/useUrlFilters'

// Action Imports
import {
  getManifestClientOptions,
  getManifestsAwaitingVerification,
  verifyManifestDetails
} from '@/libs/actions/manifest.actions'
import { getAllRateCards } from '@/libs/actions/ratecard.actions'

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

const tripOf = (manifest: any) => (typeof manifest.trip === 'object' ? manifest.trip : null)

// route id or route code -> the company that route is priced for (from the rate cards)
type RouteCompanies = Record<string, string>

// A manifest in this queue rarely has its company filled in yet (that is part of the
// review), so fall back to the company whose rate card covers the trip's route.
const companyOf = (manifest: any, routeCompanies: RouteCompanies = {}) => {
  const trip = tripOf(manifest)
  const route = trip?.route

  return (
    manifest.clientName ||
    trip?.rateCard?.clientName ||
    (route && typeof route === 'object' ? routeCompanies[route.$id] || routeCompanies[route.routeCode] : '') ||
    ''
  )
}

type FilterOption = { id: string; label: string }

// The dropdown filters. Each one reads its value off a manifest as an id (what the
// URL stores and rows are matched on) and a label (what the user sees).
const FILTERS: Array<{
  param: string
  label: string
  pick: (manifest: any, routeCompanies: RouteCompanies) => FilterOption | null
}> = [
  {
    param: 'tripId',
    label: 'Trip',
    pick: m => {
      const trip = tripOf(m)
      const id = trip?.$id || (typeof m.trip === 'string' ? m.trip : '')

      return id ? { id, label: trip?.tripNumber || id } : null
    }
  },
  {
    param: 'driverId',
    label: 'Driver',
    pick: m => {
      const driver = tripOf(m)?.driver

      return driver?.$id ? { id: driver.$id, label: driver.name || 'Unnamed driver' } : null
    }
  },
  {
    param: 'vehicleId',
    label: 'Vehicle',
    pick: m => {
      const vehicle = tripOf(m)?.vehicle

      return vehicle?.$id ? { id: vehicle.$id, label: vehicle.vehicleNumber || 'Unnamed vehicle' } : null
    }
  },
  {
    param: 'routeId',
    label: 'Route',
    pick: m => {
      const route = tripOf(m)?.route

      return route?.$id ? { id: route.$id, label: route.routeName || 'Unnamed route' } : null
    }
  },
  {
    param: 'company',
    label: 'Company',
    pick: (m, routeCompanies) => {
      const company = companyOf(m, routeCompanies)

      // Matched without regard to case so "Jumia" and "JUMIA" are one option
      return company ? { id: company.trim().toLowerCase(), label: company.trim() } : null
    }
  },
  {
    param: 'stopId',
    label: 'Drop-off location',
    pick: m => {
      const location = m.dropofflocation

      return location && typeof location === 'object' && location.$id
        ? { id: location.$id, label: locationName(m) }
        : null
    }
  }
]

/**
 * The back office's catch-up screen.
 *
 * Drivers close out deliveries in the field with nothing but a photo, which
 * leaves the manifest number and package figures blank. This queue puts every
 * one of those manifests in a single list, photo beside the fields, so an admin
 * can work through a morning's deliveries without opening a trip at a time.
 */
const ManifestReviewQueue = () => {
  // Filters live in the URL, so a filtered queue survives a reload and can be shared
  const { searchParams, setParam, setParams } = useUrlFilters()
  const filterKey = FILTERS.map(f => searchParams.get(f.param) || '').join('|')
  const dateFromParam = searchParams.get('dateFrom') || ''
  const dateToParam = searchParams.get('dateTo') || ''

  const commitDateFrom = useCallback((value: string) => setParam('dateFrom', value), [setParam])
  const commitDateTo = useCallback((value: string) => setParam('dateTo', value), [setParam])
  const fromDate = useUrlDateFilter(dateFromParam, commitDateFrom)
  const toDate = useUrlDateFilter(dateToParam, commitDateTo)

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
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [clientOptions, setClientOptions] = useState<string[]>([])
  const [routeCompanies, setRouteCompanies] = useState<RouteCompanies>({})

  useEffect(() => {
    getManifestClientOptions().then(setClientOptions)

    // Which company each route belongs to, for the Company filter
    getAllRateCards()
      .then(cards => {
        const map: RouteCompanies = {}

        cards.forEach((card: any) => {
          if (!card.clientName) return

          const routeId = typeof card.route === 'object' ? card.route?.$id : card.route

          if (routeId) map[routeId] = card.clientName
          if (card.routeCode) map[card.routeCode] = card.clientName
        })

        setRouteCompanies(map)
      })
      .catch(error => console.error('Error loading rate cards for the company filter:', error))
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

  // What each dropdown offers: the values that occur in the queue, with how many
  // manifests each one has, so nobody picks an option that returns nothing
  const filterOptions = useMemo(
    () =>
      FILTERS.map(filter => {
        const seen = new Map<string, FilterOption & { count: number }>()

        manifests.forEach(m => {
          const option = filter.pick(m, routeCompanies)

          if (!option) return

          const existing = seen.get(option.id)

          if (existing) existing.count++
          else seen.set(option.id, { ...option, count: 1 })
        })

        return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
      }),
    [manifests, routeCompanies]
  )

  const visibleManifests = useMemo(() => {
    let rows = manifests
    const selected = filterKey.split('|')

    FILTERS.forEach((filter, index) => {
      if (selected[index]) rows = rows.filter(m => filter.pick(m, routeCompanies)?.id === selected[index])
    })

    // Dates compare against when the delivery was logged
    if (fromDate.applied || toDate.applied) {
      const from = fromDate.applied?.startOf('day')
      const to = toDate.applied?.endOf('day')

      rows = rows.filter(m => {
        const logged = dayjs(m.deliveryTime || m.$createdAt)

        return (!from || !logged.isBefore(from)) && (!to || !logged.isAfter(to))
      })
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
          companyOf(m, routeCompanies),
          locationName(m)
        ]
          .filter(Boolean)
          .some((value: string) => value.toLowerCase().includes(term))
      })
    }

    return rows
  }, [manifests, routeCompanies, filterKey, fromDate.applied, toDate.applied, search])

  // One page at a time: the queue can hold hundreds of manifests, and drawing every
  // card (a photo and several inputs each) at once made the page slow to open and to type in.
  const lastPage = Math.max(0, Math.ceil(visibleManifests.length / rowsPerPage) - 1)
  const currentPage = Math.min(page, lastPage)

  const pagedManifests = useMemo(
    () => visibleManifests.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage),
    [visibleManifests, currentPage, rowsPerPage]
  )

  useEffect(() => {
    setPage(0)
  }, [search, filterKey, dateFromParam, dateToParam])

  const activeFilterCount = filterKey.split('|').filter(Boolean).length + (dateFromParam ? 1 : 0) + (dateToParam ? 1 : 0)

  const clearFilters = () => {
    setSearch('')
    setParams({ ...Object.fromEntries(FILTERS.map(f => [f.param, null])), dateFrom: null, dateTo: null })
  }

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
    <LocalizationProvider dateAdapter={AdapterDayjs}>
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

      <Card className='mb-6'>
        <CardContent>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size='small'
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
            </Grid>
            <Grid item xs={6} md={3}>
              <DatePicker
                label='Logged from'
                value={fromDate.value}
                onChange={fromDate.onChange}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <DatePicker
                label='Logged to'
                value={toDate.value}
                onChange={toDate.onChange}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
            {FILTERS.map((filter, index) => {
              const options = filterOptions[index]
              const selectedId = searchParams.get(filter.param) || ''

              return (
                <Grid item xs={12} sm={6} md={4} key={filter.param}>
                  <Autocomplete
                    size='small'
                    options={options}
                    // A filter that arrived by link may point at something no longer in the queue
                    value={options.find(o => o.id === selectedId) || (selectedId ? { id: selectedId, label: 'Not in the queue', count: 0 } : null)}
                    onChange={(_, option) => setParam(filter.param, option?.id || '')}
                    getOptionLabel={option => option.label}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderOption={(props, option) => (
                      <li {...props} key={option.id}>
                        <span className='flex-1'>{option.label}</span>
                        <Typography variant='caption' color='text.secondary'>
                          {option.count}
                        </Typography>
                      </li>
                    )}
                    renderInput={params => <TextField {...params} label={filter.label} placeholder={`All ${options.length}`} />}
                    noOptionsText='Nothing in the queue'
                  />
                </Grid>
              )
            })}
            {(activeFilterCount > 0 || search) && (
              <Grid item xs={12} className='flex items-center gap-3'>
                <Typography variant='body2' color='text.secondary'>
                  Showing {visibleManifests.length} of {manifests.length} manifests
                </Typography>
                <Button size='small' variant='text' onClick={clearFilters} startIcon={<i className='ri-filter-off-line' />}>
                  Clear filters
                </Button>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {visibleManifests.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-16 gap-2'>
            {manifests.length > 0 ? (
              <>
                <i className='ri-filter-off-line text-6xl text-textSecondary' />
                <Typography variant='h6'>No manifests match these filters</Typography>
                <Button variant='outlined' size='small' onClick={clearFilters}>
                  Clear filters
                </Button>
              </>
            ) : (
              <>
                <i className='ri-checkbox-circle-line text-6xl text-success' />
                <Typography variant='h6'>Nothing waiting on you</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Every logged delivery has its package details recorded.
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className='flex flex-col gap-6'>
          {pagedManifests.map(manifest => {
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
                            helperText='Whose goods are these?'
                            allowAdd={canVerify}
                            onCompanyAdded={() => getManifestClientOptions().then(setClientOptions)}
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

          <Card>
            <TablePagination
              component='div'
              count={visibleManifests.length}
              page={currentPage}
              onPageChange={(_, nextPage) => {
                setPage(nextPage)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={event => {
                setRowsPerPage(Number(event.target.value))
                setPage(0)
              }}
              rowsPerPageOptions={[10, 25, 50]}
              labelRowsPerPage='Manifests per page:'
            />
          </Card>
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
    </LocalizationProvider>
  )
}

export default ManifestReviewQueue
