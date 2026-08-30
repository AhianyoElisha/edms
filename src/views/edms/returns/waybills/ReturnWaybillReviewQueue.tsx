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

// Hook Imports
import { usePermissions } from '@/hooks/usePermissions'

// Type Imports
import type { ReturnReasonType } from '@/types/apps/deliveryTypes'

// Action Imports
import {
  getReturnWaybillsAwaitingVerification,
  verifyReturnWaybillDetails
} from '@/libs/actions/returnwaybill.actions'

const RETURN_REASONS: { value: ReturnReasonType; label: string }[] = [
  { value: 'customer_return', label: 'Customer Return' },
  { value: 'rejected', label: 'Rejected by Customer' },
  { value: 'damaged', label: 'Damaged Goods' },
  { value: 'wrong_delivery', label: 'Wrong Delivery' },
  { value: 'other', label: 'Other' }
]

interface DraftDetails {
  returnReason: string
  packageCount: string
  small: string
  medium: string
  big: string
  reasonNotes: string
}

const emptyDraft: DraftDetails = { returnReason: '', packageCount: '', small: '', medium: '', big: '', reasonNotes: '' }

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

/**
 * The back office's catch-up screen for returns.
 *
 * Drivers log a return in the field with nothing but a photo of the paper
 * waybill, which leaves the package count and reason blank. This queue lists
 * every one of those waybills, photo beside the fields, so an admin can work
 * through them without opening a trip at a time.
 */
const ReturnWaybillReviewQueue = () => {
  const searchParams = useSearchParams()
  const tripFilter = searchParams.get('tripId')

  const { user, hasAnyPermission, isDriver, isLoading: permissionsLoading } = usePermissions()

  // Entering the figures is the office's job - drivers never see this queue.
  const canVerify = !isDriver && hasAnyPermission(['deliveries.edit', 'deliveries.manage'])

  const [waybills, setWaybills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState<Record<string, DraftDetails>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [lightbox, setLightbox] = useState<string | null>(null)

  const loadQueue = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getReturnWaybillsAwaitingVerification()

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

  const visibleWaybills = useMemo(() => {
    let rows = waybills

    if (tripFilter) {
      rows = rows.filter(w => (typeof w.trip === 'object' ? w.trip?.$id : w.trip) === tripFilter)
    }

    if (search.trim()) {
      const term = search.trim().toLowerCase()

      rows = rows.filter(w => {
        const trip = typeof w.trip === 'object' ? w.trip : null

        return [
          w.waybillNumber,
          trip?.tripNumber,
          trip?.driver?.name,
          trip?.vehicle?.vehicleNumber,
          locationName(w.dropofflocation),
          locationName(w.pickuplocation)
        ]
          .filter(Boolean)
          .some((value: string) => value.toLowerCase().includes(term))
      })
    }

    return rows
  }, [waybills, tripFilter, search])

  const draftFor = (waybill: any): DraftDetails => drafts[waybill.$id] || { ...emptyDraft, returnReason: waybill.returnReason || '' }

  const updateDraft = (waybill: any, field: keyof DraftDetails, value: string) => {
    setDrafts(prev => ({ ...prev, [waybill.$id]: { ...draftFor(waybill), ...(prev[waybill.$id] || {}), [field]: value } }))
  }

  const handleVerify = async (waybill: any) => {
    const draft = draftFor(waybill)
    const small = parseInt(draft.small, 10) || 0
    const medium = parseInt(draft.medium, 10) || 0
    const big = parseInt(draft.big, 10) || 0
    const breakdownTotal = small + medium + big

    // Either a plain total or a size breakdown is fine - whichever the paper gives.
    const packageCount = draft.packageCount.trim() ? parseInt(draft.packageCount, 10) : breakdownTotal

    if (!Number.isFinite(packageCount) || packageCount < 1) {
      toast.error('Enter the number of packages coming back')

      return
    }

    if (breakdownTotal > 0 && breakdownTotal !== packageCount) {
      toast.error(`The size breakdown adds up to ${breakdownTotal}, not ${packageCount}`)

      return
    }

    try {
      setSavingId(waybill.$id)

      await verifyReturnWaybillDetails(
        waybill.$id,
        {
          packageCount,
          packageDetails: breakdownTotal > 0 ? { small, medium, big } : undefined,
          returnReason: (draft.returnReason as ReturnReasonType) || undefined,
          reasonNotes: draft.reasonNotes.trim() || undefined
        },
        user?.name || user?.email
      )

      toast.success('Return waybill details saved')
      setWaybills(prev => prev.filter(w => w.$id !== waybill.$id))
      setDrafts(prev => {
        const next = { ...prev }

        delete next[waybill.$id]

        return next
      })
    } catch (error: any) {
      console.error('Error verifying return waybill:', error)
      toast.error(error?.message || 'Could not save the return waybill details')
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
              Returns drivers logged in the field. Read the figures off each waybill photo and complete the record.
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

      {tripFilter && (
        <Alert
          severity='info'
          className='mb-6'
          action={
            <Button size='small' href='/edms/returns/waybills/review'>
              Show all
            </Button>
          }
        >
          Showing returns for one trip only.
        </Alert>
      )}

      <TextField
        fullWidth
        size='small'
        className='mb-6'
        placeholder='Search by waybill, trip, driver, vehicle or location…'
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

      {visibleWaybills.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-16 gap-2'>
            <i className='ri-checkbox-circle-line text-6xl text-success' />
            <Typography variant='h6'>Nothing waiting on you</Typography>
            <Typography variant='body2' color='text.secondary'>
              Every logged return has its package details recorded.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <div className='flex flex-col gap-6'>
          {visibleWaybills.map(waybill => {
            const trip = typeof waybill.trip === 'object' ? waybill.trip : null
            const draft = draftFor(waybill)
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
                            {trip.driver?.name ? ` • ${trip.driver.name}` : ''}
                            {trip.vehicle?.vehicleNumber ? ` • ${trip.vehicle.vehicleNumber}` : ''}
                          </>
                        ) : (
                          'Trip unavailable'
                        )}
                      </Typography>

                      <Typography variant='caption' color='text.secondary' className='block mb-4'>
                        Logged {formatDateTime(waybill.returnDate || waybill.$createdAt)} • {waybill.waybillNumber}
                        {waybill.receivedBy ? ` • received by ${waybill.receivedBy}` : ''}
                      </Typography>

                      <Divider className='mb-4' />

                      <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            select
                            fullWidth
                            size='small'
                            label='Return Reason'
                            value={draft.returnReason}
                            onChange={e => updateDraft(waybill, 'returnReason', e.target.value)}
                            disabled={!canVerify || isSaving}
                            helperText='The driver picked one on the road; correct it from the paper'
                          >
                            {RETURN_REASONS.map(reason => (
                              <MenuItem key={reason.value} value={reason.value}>
                                {reason.label}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size='small'
                            type='number'
                            label='Total Packages'
                            value={draft.packageCount}
                            onChange={e => updateDraft(waybill, 'packageCount', e.target.value)}
                            inputProps={{ min: 1 }}
                            disabled={!canVerify || isSaving}
                            helperText='Or fill in the size breakdown below'
                          />
                        </Grid>
                        <Grid item xs={4}>
                          <TextField
                            fullWidth
                            size='small'
                            type='number'
                            label='Small'
                            value={draft.small}
                            onChange={e => updateDraft(waybill, 'small', e.target.value)}
                            inputProps={{ min: 0 }}
                            disabled={!canVerify || isSaving}
                          />
                        </Grid>
                        <Grid item xs={4}>
                          <TextField
                            fullWidth
                            size='small'
                            type='number'
                            label='Medium'
                            value={draft.medium}
                            onChange={e => updateDraft(waybill, 'medium', e.target.value)}
                            inputProps={{ min: 0 }}
                            disabled={!canVerify || isSaving}
                          />
                        </Grid>
                        <Grid item xs={4}>
                          <TextField
                            fullWidth
                            size='small'
                            type='number'
                            label='Big'
                            value={draft.big}
                            onChange={e => updateDraft(waybill, 'big', e.target.value)}
                            inputProps={{ min: 0 }}
                            disabled={!canVerify || isSaving}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size='small'
                            label='Reason Notes'
                            placeholder='Anything written on the waybill worth keeping'
                            value={draft.reasonNotes}
                            onChange={e => updateDraft(waybill, 'reasonNotes', e.target.value)}
                            disabled={!canVerify || isSaving}
                          />
                        </Grid>
                      </Grid>

                      <div className='flex flex-wrap gap-2 mt-4'>
                        <Button
                          variant='contained'
                          onClick={() => handleVerify(waybill)}
                          disabled={!canVerify || isSaving}
                          startIcon={
                            isSaving ? <CircularProgress size={16} color='inherit' /> : <i className='ri-check-line' />
                          }
                        >
                          {isSaving ? 'Saving…' : 'Save & Verify'}
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
