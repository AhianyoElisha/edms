'use client'

// React Imports
import { tripLabel } from '@/utils/tripLabel'
import { useCallback, useEffect, useMemo, useState } from 'react'

// Next Imports
import Link from 'next/link'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TablePagination from '@mui/material/TablePagination'

// Third-party Imports
import { toast } from 'react-toastify'

// Hook Imports
import { usePermissions } from '@/hooks/usePermissions'

// Component Imports
import { QueueFilterBar, useQueueFilters } from '@/components/edms/QueueFilters'
import type { QueueFilterDef } from '@/components/edms/QueueFilters'

// Action Imports
import {
  getReturnWaybillsAwaitingVerification,
  verifyReturnWaybillDetails
} from '@/libs/actions/returnwaybill.actions'
import { getCompanies } from '@/libs/actions/company.actions'

const formatDateTime = (value?: string | null) => {
  if (!value) return '—'

  return new Date(value).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const locationName = (location: any) => {
  if (location && typeof location === 'object') {
    return location.locationName || location.address || location.city || 'Unknown location'
  }

  return 'Unknown location'
}

const statusLabel = (status?: string) => {
  switch (status) {
    case 'in_transit':
      return 'On the truck'
    case 'delivered':
      return 'Handed over'
    case 'processed':
      return 'Processed'
    case 'pending':
      return 'Pending'
    default:
      return status || 'Unknown'
  }
}

const tripOf = (waybill: any) => (typeof waybill.trip === 'object' ? waybill.trip : null)

const locationOption = (location: any) =>
  location && typeof location === 'object' && location.$id ? { id: location.$id, label: locationName(location) } : null

// The dropdown filters, same idea as the manifest review queue
const BASE_FILTERS: QueueFilterDef<any>[] = [
  {
    param: 'tripId',
    label: 'Trip',
    pick: w => {
      const trip = tripOf(w)
      const id = trip?.$id || (typeof w.trip === 'string' ? w.trip : '')

      return id ? { id, label: trip ? tripLabel(trip, id) : id } : null
    }
  },
  {
    param: 'driverId',
    label: 'Driver',
    pick: w => {
      const driver = tripOf(w)?.driver

      return driver?.$id ? { id: driver.$id, label: driver.name || 'Unnamed driver' } : null
    }
  },
  {
    param: 'vehicleId',
    label: 'Vehicle',
    kind: 'vehicle',
    pick: w => {
      const vehicle = tripOf(w)?.vehicle

      return vehicle?.$id ? { id: vehicle.$id, label: vehicle.vehicleNumber || 'Unnamed vehicle' } : null
    }
  },
  {
    param: 'routeId',
    label: 'Route',
    pick: w => {
      const route = tripOf(w)?.route

      return route && typeof route === 'object' && route.$id
        ? { id: route.$id, label: route.routeName || 'Unnamed route' }
        : null
    }
  },
  { param: 'fromId', label: 'Returned from', pick: w => locationOption(w.dropofflocation) },
  { param: 'toId', label: 'Returning to', pick: w => locationOption(w.pickuplocation) },
  { param: 'status', label: 'Status', pick: w => (w.status ? { id: w.status, label: statusLabel(w.status) } : null) }
]

/**
 * The back office's catch-up screen for returns.
 *
 * Drivers log a return in the field with nothing but a photo of the paper
 * waybill. This queue lists every one of those waybills so an admin can check
 * the photos without opening a trip at a time.
 */
const ReturnWaybillReviewQueue = () => {
  const { user, hasAnyPermission, isDriver, isLoading: permissionsLoading } = usePermissions()

  // Checking returns is the office's job - drivers never see this queue.
  const canVerify = !isDriver && hasAnyPermission(['deliveries.edit', 'deliveries.manage'])

  const [waybills, setWaybills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [companyNames, setCompanyNames] = useState<Record<string, string>>({})
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const loadQueue = useCallback(async () => {
    try {
      setLoading(true)
      // Company names arrive with the queue so the Company filter can label its options
      const [data, companyList] = await Promise.all([
        getReturnWaybillsAwaitingVerification(),
        getCompanies().catch(() => [])
      ])

      setCompanyNames(Object.fromEntries(companyList.map(company => [company.$id, company.name])))
      setWaybills(data)
    } catch (error: any) {
      console.error('Error loading return review queue:', error)
      toast.error(error?.message || 'Could not load the review queue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  // Dropdown and date filters live in the URL (existing ?tripId= links keep working)
  // A return belongs to the company of the trip it came back on
  const filterDefs = useMemo<QueueFilterDef<any>[]>(
    () => [
      ...BASE_FILTERS,
      {
        param: 'company',
        label: 'Company',
        pick: w => {
          const companyId = tripOf(w)?.companyId

          return companyId ? { id: companyId, label: companyNames[companyId] || 'Unknown company' } : null
        }
      }
    ],
    [companyNames]
  )

  const filters = useQueueFilters(waybills, filterDefs, w => w.returnDate || w.$createdAt)

  const visibleWaybills = useMemo(() => {
    let rows = filters.filtered

    if (search.trim()) {
      const term = search.trim().toLowerCase()

      rows = rows.filter(w => {
        const trip = typeof w.trip === 'object' ? w.trip : null

        return [
          w.waybillNumber,
          trip?.tripNumber,
          trip?.driver?.name,
          trip?.vehicle?.vehicleNumber,
          trip?.route?.routeName,
          companyNames[trip?.companyId],
          locationName(w.dropofflocation),
          locationName(w.pickuplocation)
        ]
          .filter(Boolean)
          .some((value: string) => value.toLowerCase().includes(term))
      })
    }

    return rows
  }, [filters.filtered, search, companyNames])

  // One page at a time: drawing every card (a photo and several inputs each) at once
  // made the page slow to open and to type in
  const lastPage = Math.max(0, Math.ceil(visibleWaybills.length / rowsPerPage) - 1)
  const currentPage = Math.min(page, lastPage)

  const pagedWaybills = useMemo(
    () => visibleWaybills.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage),
    [visibleWaybills, currentPage, rowsPerPage]
  )

  useEffect(() => {
    setPage(0)
  }, [search, filters.key])

  const clearFilters = () => {
    setSearch('')
    filters.clear()
  }

  const handleVerify = async (waybill: any) => {
    try {
      setSavingId(waybill.$id)

      await verifyReturnWaybillDetails(waybill.$id, {}, user?.name || user?.email)

      toast.success('Return marked as checked')
      setWaybills(prev => prev.filter(w => w.$id !== waybill.$id))
    } catch (error: any) {
      console.error('Error verifying return waybill:', error)
      toast.error(error?.message || 'Could not mark the return as checked')
    } finally {
      setSavingId(null)
    }
  }

  if (permissionsLoading || loading) {
    return (
      <Card>
        <CardContent className='flex flex-col items-center justify-center py-16 gap-3'>
          <CircularProgress />
          <Typography color='text.secondary'>Loading returns awaiting review…</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className='mb-6'>
        <CardContent className='flex flex-col sm:flex-row sm:items-center gap-4'>
          <div className='flex-1'>
            <Typography variant='h5'>Returns Awaiting Review</Typography>
            <Typography variant='body2' color='text.secondary'>
              Returns drivers logged in the field. Check each waybill photo and mark it as checked.
            </Typography>
          </div>
          <Chip
            label={`${visibleWaybills.length} pending`}
            color={visibleWaybills.length > 0 ? 'warning' : 'success'}
            variant='tonal'
          />
          <Button variant='outlined' startIcon={<i className='ri-refresh-line' />} onClick={loadQueue}>
            Refresh
          </Button>
        </CardContent>
      </Card>

      <Card className='mb-6'>
        <CardContent>
          <QueueFilterBar
            bar={filters.bar}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder='Search by waybill, trip, driver, vehicle, route, company or location…'
            shown={visibleWaybills.length}
            total={waybills.length}
            noun='returns'
            anyActive={filters.activeCount > 0 || !!search}
            onClear={clearFilters}
          />
        </CardContent>
      </Card>

      {visibleWaybills.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-16 gap-2'>
            {waybills.length > 0 ? (
              <>
                <i className='ri-filter-off-line text-6xl text-textSecondary' />
                <Typography variant='h6'>No returns match these filters</Typography>
                <Button variant='outlined' size='small' onClick={clearFilters}>
                  Clear filters
                </Button>
              </>
            ) : (
              <>
                <i className='ri-checkbox-circle-line text-6xl text-success' />
                <Typography variant='h6'>Nothing waiting on you</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Every logged return has been checked.
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className='flex flex-col gap-6'>
          {pagedWaybills.map(waybill => {
            const trip = typeof waybill.trip === 'object' ? waybill.trip : null
            const photo = waybill.waybillImage || waybill.proofOfDelivery
            const isSaving = savingId === waybill.$id

            return (
              <Card key={waybill.$id}>
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
                            alt={`Return waybill from ${locationName(waybill.dropofflocation)}`}
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
                        <Typography variant='h6'>{locationName(waybill.dropofflocation)}</Typography>
                        <i className='ri-arrow-right-line text-textSecondary' />
                        <Typography variant='h6'>{locationName(waybill.pickuplocation)}</Typography>
                        <Chip
                          label={statusLabel(waybill.status)}
                          size='small'
                          color={waybill.status === 'delivered' || waybill.status === 'processed' ? 'success' : 'primary'}
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
                            {trip.route?.routeName ? ` • ${trip.route.routeName}` : ''}
                            {trip.vehicle?.vehicleNumber ? ` • ${trip.vehicle.vehicleNumber}` : ''}
                            {trip.driver?.name ? ` • ${trip.driver.name}` : ''}
                          </>
                        ) : (
                          'Trip unavailable'
                        )}
                      </Typography>

                      <Typography variant='caption' color='text.secondary' className='block mb-4'>
                        Logged {formatDateTime(waybill.returnDate || waybill.$createdAt)} • {waybill.waybillNumber}
                        {waybill.receivedBy ? ` • received by ${waybill.receivedBy}` : ''}
                      </Typography>

                      <div className='flex flex-wrap gap-2 mt-4'>
                        <Button
                          variant='contained'
                          onClick={() => handleVerify(waybill)}
                          disabled={!canVerify || isSaving}
                          startIcon={
                            isSaving ? <CircularProgress size={16} color='inherit' /> : <i className='ri-check-line' />
                          }
                        >
                          {isSaving ? 'Saving…' : 'Mark as Checked'}
                        </Button>
                        <Button variant='outlined' href={`/edms/returns/waybills/${waybill.$id}`}>
                          Open Waybill
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
              count={visibleWaybills.length}
              page={currentPage}
              onPageChange={(_, next) => {
                setPage(next)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={e => {
                setRowsPerPage(parseInt(e.target.value, 10))
                setPage(0)
              }}
              rowsPerPageOptions={[10, 25, 50]}
              labelRowsPerPage='Returns per page:'
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
          {lightbox && <img src={lightbox} alt='Return waybill' className='w-full h-auto' />}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ReturnWaybillReviewQueue
