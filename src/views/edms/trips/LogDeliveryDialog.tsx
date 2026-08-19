'use client'

// React Imports
import { useEffect, useState } from 'react'

// MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { Theme } from '@mui/material/styles'

// Third-party Imports
import { toast } from 'react-toastify'

// Type Imports
import type { RouteStopType } from '@/types/apps/deliveryTypes'

// Action Imports
import { getRouteDropoffLocations } from '@/libs/actions/route.actions'
import { logManifestDelivery } from '@/libs/actions/manifest.actions'

interface LogDeliveryDialogProps {
  open: boolean
  onClose: () => void
  tripData: any
  onLogged?: () => void
}

/**
 * One-touch delivery logging for drivers.
 *
 * The driver picks the stop and takes a photo of the signed manifest - nothing
 * else. That single action creates the manifest and closes it out as delivered.
 * Manifest number, package size and counts are left for an admin to fill in from
 * the review queue, so paperwork never holds up the road.
 */
const LogDeliveryDialog = ({ open, onClose, tripData, onLogged }: LogDeliveryDialogProps) => {
  const fullScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'))

  const [stops, setStops] = useState<RouteStopType[]>([])
  const [loadingStops, setLoadingStops] = useState(true)
  const [selectedStop, setSelectedStop] = useState<RouteStopType | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const routeId = typeof tripData?.route === 'object' ? tripData?.route?.$id : tripData?.route
  const manifests = tripData?.manifests || []

  // Stops the driver has already logged on this trip, so nothing gets shot twice
  // by accident.
  const loggedCountByStop = manifests.reduce((acc: Record<string, number>, m: any) => {
    const id = typeof m.dropofflocation === 'object' && m.dropofflocation !== null ? m.dropofflocation.$id : m.dropofflocation

    if (id) acc[id] = (acc[id] || 0) + 1

    return acc
  }, {})

  useEffect(() => {
    if (!open || !routeId) return

    let cancelled = false

    const loadStops = async () => {
      try {
        setLoadingStops(true)
        const locations = await getRouteDropoffLocations(routeId)

        if (!cancelled) setStops(locations)
      } catch (error) {
        console.error('Error loading route stops:', error)
        if (!cancelled) toast.error('Could not load the stops for this route')
      } finally {
        if (!cancelled) setLoadingStops(false)
      }
    }

    loadStops()

    return () => {
      cancelled = true
    }
  }, [open, routeId])

  // Clear the form whenever the dialog is reopened for the next stop.
  useEffect(() => {
    if (open) return

    setSelectedStop(null)
    setPhotoFile(null)
    setPhotoPreview(prev => {
      if (prev) URL.revokeObjectURL(prev)

      return null
    })
  }, [open])

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a photo')

      return
    }

    if (photoPreview) URL.revokeObjectURL(photoPreview)

    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))

    // Let the driver retake the same file if they are not happy with the shot.
    event.target.value = ''
  }

  const handleSubmit = async () => {
    if (!selectedStop || !photoFile) return

    try {
      setSubmitting(true)

      const { storage, appwriteConfig } = await import('@/libs/appwrite.config')
      const { ID } = await import('appwrite')
      const imageCompression = (await import('browser-image-compression')).default

      const bucketId = appwriteConfig.bucket || process.env.NEXT_PUBLIC_BUCKET_ID

      if (!bucketId) throw new Error('Storage bucket ID is not configured')

      const compressed = await imageCompression(photoFile, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/jpeg' as const,
        initialQuality: 0.8
      })

      const uploaded = await storage.createFile(
        bucketId,
        ID.unique(),
        new File([compressed], `manifest_${Date.now()}.jpg`, { type: 'image/jpeg' })
      )

      const photoUrl = `${appwriteConfig.endpoint}/storage/buckets/${bucketId}/files/${uploaded.$id}/view?project=${appwriteConfig.project}`

      await logManifestDelivery({
        tripId: tripData.$id,
        dropoffLocationId: selectedStop.locationId,
        dropoffLocationName: selectedStop.locationName,
        dropoffSequence: selectedStop.sequence,
        photoUrl
      })

      toast.success(`Delivery logged for ${selectedStop.locationName || 'this stop'}`)
      onLogged?.()
      onClose()
    } catch (error: any) {
      console.error('Error logging delivery:', error)
      toast.error(error?.message || 'Could not log the delivery. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullScreen={fullScreen} fullWidth maxWidth='sm'>
      <DialogTitle className='flex items-center justify-between gap-2'>
        <span>Log Delivery</span>
        <IconButton size='small' onClick={onClose} disabled={submitting}>
          <i className='ri-close-line' />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Alert severity='info' icon={<i className='ri-information-line' />} className='mb-5'>
          <Typography variant='body2'>
            Pick the stop and take a photo of the manifest. That&apos;s all &mdash; the office fills in the manifest
            number and package figures later.
          </Typography>
        </Alert>

        {/* Step 1 - which stop */}
        <Typography variant='subtitle2' className='mb-2 font-medium'>
          1. Which stop?
        </Typography>

        {loadingStops ? (
          <Box className='flex justify-center py-6'>
            <CircularProgress size={28} />
          </Box>
        ) : stops.length === 0 ? (
          <Alert severity='warning' className='mb-5'>
            This trip&apos;s route has no dropoff stops set up. Contact the office before logging deliveries.
          </Alert>
        ) : (
          <Box className='flex flex-col gap-2 mb-6'>
            {stops.map((stop, index) => {
              const isSelected = selectedStop?.locationId === stop.locationId
              const loggedCount = loggedCountByStop[stop.locationId] || 0
              const isFinal = index === stops.length - 1

              return (
                <Box
                  key={`${stop.locationId}-${index}`}
                  role='button'
                  tabIndex={0}
                  onClick={() => setSelectedStop(stop)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') setSelectedStop(stop)
                  }}
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    isSelected ? 'border-primary bg-primaryLight' : 'border hover:bg-actionHover'
                  }`}
                >
                  <i
                    className={`${isSelected ? 'ri-checkbox-circle-fill text-primary' : 'ri-checkbox-blank-circle-line text-textDisabled'} text-2xl`}
                  />
                  <div className='flex-1 min-is-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <Typography className='font-medium'>
                        {stop.sequence || index + 1}. {stop.locationName || 'Unnamed stop'}
                      </Typography>
                      {isFinal && <Chip label='Final' size='small' color='success' variant='tonal' />}
                      {loggedCount > 0 && (
                        <Chip
                          label={loggedCount === 1 ? 'Logged' : `${loggedCount} logged`}
                          size='small'
                          color='info'
                          variant='tonal'
                          icon={<i className='ri-check-line' />}
                        />
                      )}
                    </div>
                    {stop.address && (
                      <Typography variant='body2' color='text.secondary' className='truncate'>
                        {stop.address}
                      </Typography>
                    )}
                  </div>
                </Box>
              )
            })}
          </Box>
        )}

        {/* Step 2 - the photo */}
        <Typography variant='subtitle2' className='mb-2 font-medium'>
          2. Photo of the manifest
        </Typography>

        {photoPreview ? (
          <Box className='mb-3'>
            <img
              src={photoPreview}
              alt='Manifest'
              className='w-full rounded-lg border'
              style={{ maxHeight: 280, objectFit: 'contain' }}
            />
          </Box>
        ) : (
          <Box className='flex flex-col items-center justify-center gap-2 p-8 mb-3 rounded-lg border border-dashed'>
            <i className='ri-camera-line text-4xl text-textDisabled' />
            <Typography variant='body2' color='text.secondary'>
              No photo taken yet
            </Typography>
          </Box>
        )}

        <Box className='flex flex-wrap gap-2'>
          <Button
            variant={photoPreview ? 'outlined' : 'contained'}
            component='label'
            size='large'
            startIcon={<i className='ri-camera-line' />}
            disabled={submitting}
          >
            {photoPreview ? 'Retake Photo' : 'Take Photo'}
            <input type='file' hidden accept='image/*' capture='environment' onChange={handlePhotoSelect} />
          </Button>
          <Button
            variant='outlined'
            component='label'
            size='large'
            startIcon={<i className='ri-image-add-line' />}
            disabled={submitting}
          >
            Choose Photo
            <input
              type='file'
              hidden
              accept='image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif'
              onChange={handlePhotoSelect}
            />
          </Button>
        </Box>
      </DialogContent>

      <DialogActions className='gap-2'>
        <Button variant='outlined' onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant='contained'
          color='success'
          size='large'
          onClick={handleSubmit}
          disabled={!selectedStop || !photoFile || submitting}
          startIcon={submitting ? <CircularProgress size={18} color='inherit' /> : <i className='ri-check-double-line' />}
        >
          {submitting ? 'Submitting…' : 'Submit Delivery'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default LogDeliveryDialog
