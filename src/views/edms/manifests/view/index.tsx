'use client'

// React Imports
import { useState } from 'react'

// Next Imports
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// MUI Imports
import Grid from '@mui/material/Grid'
import { Breadcrumbs } from '@mui/material'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import Avatar from '@mui/material/Avatar'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Tooltip from '@mui/material/Tooltip'
import TextField from '@mui/material/TextField'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'

// Component Imports
import StyledBreadcrumb from '@/components/layout/shared/Breadcrumbs'

// Toast Imports
import { toast } from 'react-toastify'

// Helper function to get status color
const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'delivered':
      return 'success'
    case 'in-progress':
    case 'in_progress':
    case 'in-transit':
    case 'in_transit':
      return 'primary'
    case 'pending':
    case 'loaded':
      return 'warning'
    case 'cancelled':
    case 'canceled':
    case 'failed':
      return 'error'
    default:
      return 'default'
  }
}

// Helper function to get package size label
const getPackageSizeLabel = (size: string): string => {
  const labels: Record<string, string> = {
    'small': 'Small Packages',
    'medium': 'Medium Packages',
    'big': 'Big Packages'
  }
  return labels[size] || size || 'Unknown'
}

// Helper function to get package size icon
const getPackageSizeIcon = (size: string): string => {
  const icons: Record<string, string> = {
    'small': 'ri-inbox-line',
    'medium': 'ri-inbox-2-line',
    'big': 'ri-archive-line'
  }
  return icons[size] || 'ri-inbox-line'
}

const ManifestView = ({ manifestData }: { manifestData: any }) => {
  const [uploading, setUploading] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ 
    open: boolean
    action: 'update-count' | 'submit' | null
  }>({ open: false, action: null })
  const [deliveryCountInput, setDeliveryCountInput] = useState<number>(manifestData.deliveredCount || 0)
  
  const router = useRouter()
  const [refreshKey, setRefreshKey] = useState(0)

  // Get related data
  const trip = manifestData.trip
  const dropoffLocation = manifestData?.dropofflocation
  const pickupLocation = trip?.route?.pickuplocation || manifestData?.pickuplocation

  // Package tracking (now count-based on manifest)
  const packageCount = manifestData.packageCount || 0
  const deliveredCount = manifestData.deliveredCount || 0
  const pendingCount = packageCount - deliveredCount
  const deliveryProgress = packageCount > 0 ? (deliveredCount / packageCount) * 100 : 0

  // Check if manifest can be submitted
  const hasProofImage = Boolean(manifestData.proofOfDeliveryImage)
  const isDelivered = manifestData.status === 'delivered' || manifestData.status === 'completed'
  const hasDeliveredPackages = deliveredCount > 0
  
  // Can only submit if: has proof, has at least one delivered package, and not already delivered
  const canSubmit = hasProofImage && hasDeliveredPackages && !isDelivered
  
  // Handle proof of delivery image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    
    try {
      setUploading(true)
      toast.info('Compressing and uploading image...')
      
      // Import necessary functions
      const { storage, appwriteConfig } = await import('@/libs/appwrite.config')
      const { updateManifestWithProofImage } = await import('@/libs/actions/manifest.actions')
      const { ID } = await import('appwrite')
      const imageCompression = (await import('browser-image-compression')).default
      
      // Validate bucket ID
      const bucketId = appwriteConfig.bucket || process.env.NEXT_PUBLIC_BUCKET_ID
      if (!bucketId) {
        throw new Error('Storage bucket ID is not configured')
      }
      
      // Compress image options
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/jpeg' as const,
        initialQuality: 0.8
      }
      
      // Compress the image
      const compressedFile = await imageCompression(file, options)
      
      // Create a new File object with the compressed blob
      const compressedImageFile = new File(
        [compressedFile], 
        `proof_${Date.now()}.jpg`, 
        { type: 'image/jpeg' }
      )
      
      // Upload to Appwrite storage
      const uploadedFile = await storage.createFile(
        bucketId,
        ID.unique(),
        compressedImageFile
      )
      
      // Get file URL
      const fileUrl = `${appwriteConfig.endpoint}/storage/buckets/${bucketId}/files/${uploadedFile.$id}/view?project=${appwriteConfig.project}`
      
      // Update manifest with proof image
      const updatedManifest = await updateManifestWithProofImage(manifestData.$id, fileUrl)
      
      toast.success('Proof of delivery uploaded successfully!')
      
      // Update local state
      Object.assign(manifestData, {
        proofOfDeliveryImage: fileUrl,
        deliveryTime: updatedManifest.deliveryTime
      })
      
      setRefreshKey(prev => prev + 1)
    } catch (error: any) {
      console.error('Error uploading proof image:', error)
      toast.error(error?.message || 'Failed to upload image. Please try again.')
    } finally {
      setUploading(false)
    }
  }
  
  // Handle update delivered count
  const handleUpdateDeliveredCount = async () => {
    try {
      setUploading(true)
      toast.info('Updating delivered count...')
      
      const { updateManifestDeliveredCount } = await import('@/libs/actions/manifest.actions')
      
      // Validate the input
      const newCount = Math.min(Math.max(0, deliveryCountInput), packageCount)
      
      // Update manifest's deliveredCount
      await updateManifestDeliveredCount(manifestData.$id, newCount)
      
      // Update local manifest data
      Object.assign(manifestData, {
        deliveredCount: newCount
      })
      
      toast.success(`Delivered count updated to ${newCount}!`)
      
      setConfirmDialog({ open: false, action: null })
      setUploading(false)
      setRefreshKey(prev => prev + 1)
    } catch (error: any) {
      console.error('Error updating delivered count:', error)
      toast.error(error?.message || 'Failed to update delivered count. Please try again.')
      setUploading(false)
      setConfirmDialog({ open: false, action: null })
    }
  }
  
  // Handle submit manifest
  const handleSubmitManifest = async () => {
    try {
      setUploading(true)
      toast.info('Submitting manifest...')
      
      const { markManifestAsDelivered } = await import('@/libs/actions/manifest.actions')
      const { checkAndCompleteTrip } = await import('@/libs/actions/trip.actions')
      
      // Mark manifest as delivered (uses deliveredCount already on manifest)
      const updatedManifest = await markManifestAsDelivered(manifestData.$id)
      
      // Update local manifest data
      Object.assign(manifestData, {
        status: 'delivered',
        deliveryTime: updatedManifest.deliveryTime,
        arrivalTime: updatedManifest.arrivalTime
      })
      
      // Check if trip should be auto-completed
      if (trip?.$id) {
        const tripCompleted = await checkAndCompleteTrip(trip.$id)
        if (tripCompleted) {
          toast.success('Manifest submitted and trip completed!')
          if (trip) trip.status = 'completed'
        } else {
          toast.success('Manifest submitted successfully!')
        }
      } else {
        toast.success('Manifest submitted successfully!')
      }
      
      setConfirmDialog({ open: false, action: null })
      setUploading(false)
      setRefreshKey(prev => prev + 1)
    } catch (error: any) {
      console.error('Error submitting manifest:', error)
      toast.error(error?.message || 'Failed to submit manifest. Please try again.')
      setUploading(false)
      setConfirmDialog({ open: false, action: null })
    }
  }

  return (
    <>
      <Typography className='mt-4' variant='h4'>Manifest Details - {manifestData.manifestNumber}</Typography>
      <Divider className='my-8' />
      <Breadcrumbs aria-label="breadcrumb" className='mt-10 ml-5 mb-5'>
        <StyledBreadcrumb 
          component="a"
          onClick={() => router.back()}
          icon={<i className='ri-menu-4-line' />}
          className='cursor-pointer'
          label="Back" 
        />
        <StyledBreadcrumb
          label="Details"
          icon={<i className='ri-stack-line' />}
          className='cursor-pointer'
          disabled
        />
      </Breadcrumbs>
      
      {/* Header Info */}
      <Card className='mb-6'>
        <CardContent>
          <div className='flex items-start justify-between flex-wrap gap-4'>
            <div className='flex flex-wrap items-center gap-2'>
              <Typography variant='body2' color='text.secondary'>
                Status:
              </Typography>
              <Chip
                label={manifestData.status?.charAt(0).toUpperCase() + manifestData.status?.slice(1).replace('_', ' ')}
                variant='tonal'
                color={getStatusColor(manifestData.status)}
                size='small'
              />
              <Chip
                label={getPackageSizeLabel(manifestData.packageSize)}
                color='info'
                size='small'
                variant='tonal'
                icon={<i className={getPackageSizeIcon(manifestData.packageSize)} />}
              />
              <Chip
                label={`${packageCount} Total`}
                color='default'
                size='small'
                variant='outlined'
              />
            </div>
            <div className='flex flex-wrap gap-2'>
              {!isDelivered && (
                <>
                  {/* Proof of delivery is photo-only: take one now, or pick one already
                      on the device. Documents/PDFs are deliberately not accepted. */}
                  <Button
                    variant='contained'
                    size='small'
                    component='label'
                    startIcon={uploading ? <CircularProgress size={16} /> : <i className='ri-camera-line' />}
                    disabled={uploading}
                  >
                    {manifestData.proofOfDeliveryImage ? 'Retake' : 'Take'} Photo
                    <input
                      type='file'
                      hidden
                      accept='image/*'
                      capture='environment'
                      onChange={handleImageUpload}
                    />
                  </Button>
                  <Button
                    variant='outlined'
                    size='small'
                    component='label'
                    startIcon={uploading ? <CircularProgress size={16} /> : <i className='ri-image-add-line' />}
                    disabled={uploading}
                  >
                    Choose Photo
                    <input
                      type='file'
                      hidden
                      accept='image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif'
                      onChange={handleImageUpload}
                    />
                  </Button>
                  <Tooltip 
                    title={
                      !hasProofImage 
                        ? "Upload proof of delivery first" 
                        : !hasDeliveredPackages 
                        ? "Update delivered count first" 
                        : "Ready to submit"
                    }
                  >
                    <span>
                      <Button
                        variant='contained'
                        size='small'
                        color='success'
                        startIcon={<i className='ri-check-double-line' />}
                        onClick={() => setConfirmDialog({ open: true, action: 'submit' })}
                        disabled={!canSubmit}
                      >
                        Submit Manifest
                      </Button>
                    </span>
                  </Tooltip>
                </>
              )}
              {manifestData.proofOfDeliveryImage && (
                <Button
                  variant='outlined'
                  size='small'
                  startIcon={<i className='ri-image-line' />}
                  onClick={() => window.open(manifestData.proofOfDeliveryImage, '_blank')}
                >
                  View Proof
                </Button>
              )}
              <Button
                variant='outlined'
                size='small'
                startIcon={<i className='ri-printer-line' />}
              >
                Print
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Package Delivery Progress Card */}
      <Card className='mb-6'>
        <CardContent>
          <Typography variant='h6' className='mb-4'>Package Delivery Progress</Typography>
          
          <Grid container spacing={4}>
            {/* Package Size Type */}
            <Grid item xs={12} md={4}>
              <Box className='flex items-center gap-3 p-4 rounded-lg bg-actionHover'>
                <Avatar variant='circular' sx={{ width: 40, height: 40, border: '1px solid' }}>
                  <i className={`${getPackageSizeIcon(manifestData.packageSize)} text-2xl`} />
                </Avatar>
                <div>
                  <Typography variant='h5' className='font-bold'>
                    {getPackageSizeLabel(manifestData.packageSize)}
                  </Typography>
                  <Typography variant='body2'>
                    Package Size Type
                  </Typography>
                </div>
              </Box>
            </Grid>

            {/* Total Count */}
            <Grid item xs={6} md={2}>
              <Box className='text-center p-4 rounded-lg bg-actionHover'>
                <Typography variant='h5' className='font-bold'>
                  {packageCount}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Total Packages
                </Typography>
              </Box>
            </Grid>

            {/* Delivered Count */}
            <Grid item xs={6} md={2}>
              <Box className='text-center p-4 rounded-lg bg-actionHover'>
                <Typography variant='h5' className='font-bold'>
                  {deliveredCount}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Delivered
                </Typography>
              </Box>
            </Grid>

            {/* Pending Count */}
            <Grid item xs={6} md={2}>
              <Box className='text-center p-4 rounded-lg bg-actionHover'>
                <Typography variant='h5' className='font-bold'>
                  {pendingCount}
                </Typography>
                <Typography variant='body2'>
                  Pending
                </Typography>
              </Box>
            </Grid>

            {/* Update Button */}
            <Grid item xs={6} md={2}>
              <Box className='flex items-center justify-center h-full'>
                { pendingCount > 0 && (
                  <Button
                    variant='contained'
                    color='primary'
                    startIcon={<i className='ri-edit-line' />}
                    onClick={() => {
                      setDeliveryCountInput(deliveredCount)
                      setConfirmDialog({ open: true, action: 'update-count' })
                    }}
                    fullWidth
                  >
                    Update Count
                  </Button>
                )}
                {isDelivered && pendingCount === 0 && (
                  <Chip label='Completed' color='success' variant='tonal' />
                )}
              </Box>
            </Grid>

            {/* Progress Bar */}
            <Grid item xs={12}>
              <Box className='mt-2'>
                <Box className='flex justify-between mb-1'>
                  <Typography variant='body2' color='text.secondary'>
                    Delivery Progress
                  </Typography>
                  <Typography variant='body2' className='font-medium'>
                    {deliveryProgress.toFixed(0)}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant='determinate' 
                  value={deliveryProgress} 
                  color={deliveryProgress === 100 ? 'success' : 'primary'}
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Proof of Delivery Image Preview */}
      {hasProofImage && (
        <Card className='mb-6'>
          <CardContent>
            <div className='flex items-center justify-between mb-4'>
              <div className='flex items-center gap-2'>
                <i className='ri-image-line text-2xl text-success' />
                <Typography variant='h6'>Proof of Delivery</Typography>
              </div>
              <Chip label='Uploaded' color='success' size='small' variant='tonal' />
            </div>
            <div className='relative w-full max-w-2xl mx-auto'>
              <img
                src={manifestData.proofOfDeliveryImage}
                alt='Proof of Delivery'
                className='w-full h-auto rounded border-2 border-gray-200 cursor-pointer hover:border-primary transition-colors'
                onClick={() => window.open(manifestData.proofOfDeliveryImage, '_blank')}
                style={{ maxHeight: '400px', objectFit: 'contain' }}
              />
              <Typography variant='caption' color='text.secondary' className='block text-center mt-2'>
                Click image to view full size
              </Typography>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Details Card */}
      <Card>
        <CardContent>
          <Grid container spacing={6}>
            {/* Manifest Info */}
            <Grid item xs={12}>
              <Typography variant='h6' className='mb-4'>Manifest Information</Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} lg={3}>
              <div className='flex items-center gap-4'>
                <Avatar variant='rounded' className='bg-primary'>
                  <i className='ri-file-list-3-line' />
                </Avatar>
                <div className='overflow-hidden'>
                  <Typography variant='h6' className='truncate'>{manifestData.manifestNumber}</Typography>
                  <Typography variant='body2' color='text.secondary'>Manifest Number</Typography>
                </div>
              </div>
            </Grid>
            
            <Grid item xs={12} sm={6} lg={3}>
              <Typography variant='body2' color='text.secondary'>Dropoff Sequence</Typography>
              <Typography className='font-medium'>Stop #{manifestData.dropoffSequence || 1}</Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} lg={3}>
              <Typography variant='body2' color='text.secondary'>Manifest Date</Typography>
              <Typography className='font-medium'>
                {manifestData.manifestDate ? new Date(manifestData.manifestDate).toLocaleDateString() : 'N/A'}
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} lg={3}>
              <Typography variant='body2' color='text.secondary'>Estimated Arrival</Typography>
              <Typography className='font-medium'>
                {manifestData.estimatedArrival || 'Not set'}
              </Typography>
            </Grid>

            {/* Divider */}
            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Timeline Information */}
            <Grid item xs={12}>
              <Typography variant='h6' className='mb-4'>Timeline</Typography>
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <Typography variant='body2' color='text.secondary'>Arrival Time</Typography>
              <Typography className='font-medium'>
                {manifestData.arrivalTime || 'Not arrived'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <Typography variant='body2' color='text.secondary'>Delivery Time</Typography>
              <Typography className='font-medium'>
                {manifestData.deliveryTime ? new Date(manifestData.deliveryTime).toLocaleString() : 'Not delivered'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <Typography variant='body2' color='text.secondary'>Status</Typography>
              <Chip
                label={manifestData.status?.charAt(0).toUpperCase() + manifestData.status?.slice(1).replace('_', ' ')}
                variant='tonal'
                color={getStatusColor(manifestData.status)}
                size='small'
              />
            </Grid>

            {/* Divider */}
            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Vehicle & Driver Info */}
            {trip && (
              <>
                <Grid item xs={12} md={6}>
                  <Typography variant='h6' className='mb-4'>Vehicle Information</Typography>
                  <Typography color='text.secondary' className='mb-1'>
                    <strong>Vehicle:</strong> {typeof trip.vehicle === 'object' && trip.vehicle !== null
                      ? trip.vehicle.vehicleNumber || trip.vehicle.$id
                      : trip.vehicle || 'N/A'}
                  </Typography>
                  {typeof trip.vehicle === 'object' && trip.vehicle !== null && (
                    <>
                      {trip.vehicle.vehicleType && (
                        <Typography color='text.secondary' className='mb-1'>
                          <strong>Type:</strong> {trip.vehicle.vehicleType}
                        </Typography>
                      )}
                      {trip.vehicle.brand && (
                        <Typography color='text.secondary' className='mb-1'>
                          <strong>Brand & Model:</strong> {trip.vehicle.brand} {trip.vehicle.model}
                        </Typography>
                      )}
                    </>
                  )}
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant='h6' className='mb-4'>Driver Information</Typography>
                  <Typography color='text.secondary' className='mb-1'>
                    <strong>Name:</strong> {typeof trip.driver === 'object' && trip.driver !== null
                      ? trip.driver.name || 'N/A'
                      : 'N/A'}
                  </Typography>
                  {typeof trip.driver === 'object' && trip.driver !== null && (
                    <>
                      {trip.driver.phone && (
                        <Typography color='text.secondary' className='mb-1'>
                          <strong>Phone:</strong> {trip.driver.phone}
                        </Typography>
                      )}
                      {trip.driver.email && (
                        <Typography color='text.secondary' className='mb-1'>
                          <strong>Email:</strong> {trip.driver.email}
                        </Typography>
                      )}
                    </>
                  )}
                </Grid>
              </>
            )}

            {/* Divider */}
            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Location Information */}
            <Grid item xs={12} md={6}>
              <Typography variant='h6' className='mb-4'>Pickup Location</Typography>
              <Typography color='text.secondary' className='mb-2'>
                {pickupLocation && typeof pickupLocation === 'object'
                  ? pickupLocation.locationName || pickupLocation.address || pickupLocation.city || 'N/A'
                  : pickupLocation || 'From Trip Route'}
              </Typography>
              {pickupLocation && typeof pickupLocation === 'object' && (
                <>
                  {pickupLocation.address && (
                    <Typography variant='body2' color='text.secondary'>
                      {pickupLocation.address}
                    </Typography>
                  )}
                  {pickupLocation.city && (
                    <Typography variant='body2' color='text.secondary'>
                      {pickupLocation.city}, {pickupLocation.region}
                    </Typography>
                  )}
                </>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant='h6' className='mb-4'>Dropoff Location</Typography>
              <Typography color='text.secondary' className='mb-2'>
                {dropoffLocation && typeof dropoffLocation === 'object'
                  ? dropoffLocation.locationName || dropoffLocation.address || dropoffLocation.city || 'N/A'
                  : dropoffLocation || 'N/A'}
              </Typography>
              {dropoffLocation && typeof dropoffLocation === 'object' && (
                <>
                  {dropoffLocation.address && (
                    <Typography variant='body2' color='text.secondary'>
                      {dropoffLocation.address}
                    </Typography>
                  )}
                  {dropoffLocation.city && (
                    <Typography variant='body2' color='text.secondary'>
                      {dropoffLocation.city}, {dropoffLocation.region}
                    </Typography>
                  )}
                  {dropoffLocation.contactPerson && (
                    <Typography variant='body2' color='text.secondary'>
                      Contact: {dropoffLocation.contactPerson} {dropoffLocation.contactPhone && `(${dropoffLocation.contactPhone})`}
                    </Typography>
                  )}
                </>
              )}
            </Grid>

            {/* Delivery Recipient Information */}
            {(manifestData.recipientName || manifestData.recipientPhone) && (
              <>
                <Grid item xs={12}>
                  <Divider />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant='h6' className='mb-4'>Delivery Recipient</Typography>
                </Grid>
                {manifestData.recipientName && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant='body2' color='text.secondary'>Recipient Name</Typography>
                    <Typography className='font-medium'>{manifestData.recipientName}</Typography>
                  </Grid>
                )}
                {manifestData.recipientPhone && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant='body2' color='text.secondary'>Recipient Phone</Typography>
                    <Typography className='font-medium'>{manifestData.recipientPhone}</Typography>
                  </Grid>
                )}
              </>
            )}

            {/* GPS & Proof of Delivery */}
            {(manifestData.deliveryGpsVerified || manifestData.deliveryGpsCoordinates) && (
              <>
                <Grid item xs={12}>
                  <Divider />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant='h6' className='mb-4'>Delivery Verification</Typography>
                </Grid>
                {manifestData.deliveryGpsVerified !== undefined && (
                  <Grid item xs={12} sm={6} lg={4}>
                    <Typography variant='body2' color='text.secondary'>GPS Verified</Typography>
                    <Chip
                      label={manifestData.deliveryGpsVerified ? 'Verified' : 'Not Verified'}
                      variant='tonal'
                      color={manifestData.deliveryGpsVerified ? 'success' : 'warning'}
                      size='small'
                    />
                    {manifestData.gpsVerificationDistance !== null && manifestData.gpsVerificationDistance !== undefined && (
                      <Typography variant='caption' color='text.secondary' className='block mt-1'>
                        Distance: {manifestData.gpsVerificationDistance}m
                      </Typography>
                    )}
                  </Grid>
                )}
                {manifestData.deliveryGpsCoordinates && (
                  <Grid item xs={12} sm={6} lg={4}>
                    <Typography variant='body2' color='text.secondary'>GPS Coordinates</Typography>
                    <Typography className='font-medium' variant='body2'>{manifestData.deliveryGpsCoordinates}</Typography>
                  </Grid>
                )}
              </>
            )}

            {/* Trip Information */}
            {trip && (
              <>
                <Grid item xs={12}>
                  <Divider />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant='h6' className='mb-4'>Trip Information</Typography>
                  <Grid container spacing={4}>
                    <Grid item xs={12} md={6} lg={3}>
                      <Typography color='text.secondary'>Trip Number</Typography>
                      <Typography className='font-medium'>{trip.tripNumber}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6} lg={3}>
                      <Typography color='text.secondary'>Trip Status</Typography>
                      <Chip
                        label={trip.status?.charAt(0).toUpperCase() + trip.status?.slice(1).replace('_', ' ')}
                        variant='tonal'
                        color={getStatusColor(trip.status)}
                        size='small'
                      />
                    </Grid>
                    <Grid item xs={12} md={6} lg={3}>
                      <Typography color='text.secondary'>Trip Date</Typography>
                      <Typography className='font-medium'>
                        {trip.tripDate ? new Date(trip.tripDate).toLocaleDateString() : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6} lg={3}>
                      <Link href={`/edms/trips/${trip.$id}`} passHref>
                        <Button size='small' variant='outlined' fullWidth>
                          View Trip Details
                        </Button>
                      </Link>
                    </Grid>
                  </Grid>
                </Grid>
              </>
            )}

            {/* Additional Details */}
            <Grid item xs={12}>
              <Divider />
            </Grid>

            <Grid item xs={12} md={6} lg={3}>
              <Typography color='text.secondary'>Created Date</Typography>
              <Typography className='font-medium'>
                {new Date(manifestData.$createdAt).toLocaleDateString()}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <Typography color='text.secondary'>Last Updated</Typography>
              <Typography className='font-medium'>
                {new Date(manifestData.$updatedAt).toLocaleDateString()}
              </Typography>
            </Grid>

            {manifestData.notes && (
              <>
                <Grid item xs={12}>
                  <Divider />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant='h6' className='mb-2'>Notes</Typography>
                  <Typography color='text.secondary'>{manifestData.notes}</Typography>
                </Grid>
              </>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Update Delivered Count Dialog */}
      <Dialog 
        open={confirmDialog.open && confirmDialog.action === 'update-count'} 
        onClose={() => !uploading && setConfirmDialog({ open: false, action: null })}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Update Delivered Count</DialogTitle>
        <DialogContent>
          <Box className='pt-2'>
            <Typography variant='body2' color='text.secondary' className='mb-4'>
              Enter the number of packages that have been delivered for this manifest.
            </Typography>
            
            <Box className='mb-4 p-4 bg-actionHover rounded-lg'>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant='body2' color='text.secondary'>Package Size</Typography>
                  <Typography className='font-medium'>{getPackageSizeLabel(manifestData.packageSize)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant='body2' color='text.secondary'>Total Packages</Typography>
                  <Typography className='font-medium'>{packageCount}</Typography>
                </Grid>
              </Grid>
            </Box>
            
            <TextField
              fullWidth
              label='Delivered Count'
              type='number'
              value={deliveryCountInput}
              onChange={(e) => setDeliveryCountInput(Math.min(Math.max(0, parseInt(e.target.value) || 0), packageCount))}
              inputProps={{ min: 0, max: packageCount }}
              helperText={`Enter a value between 0 and ${packageCount}`}
            />
            
            {deliveryCountInput > 0 && deliveryCountInput < packageCount && (
              <Typography variant='body2' color='warning.main' className='mt-2'>
                {packageCount - deliveryCountInput} package(s) will remain pending
              </Typography>
            )}
            {deliveryCountInput === packageCount && (
              <Typography variant='body2' color='success.main' className='mt-2'>
                All packages will be marked as delivered
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, action: null })} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdateDeliveredCount}
            variant='contained'
            color='primary'
            disabled={uploading}
            startIcon={uploading ? <CircularProgress size={16} /> : <i className='ri-check-line' />}
          >
            {uploading ? 'Updating...' : 'Update Count'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Submit Manifest Confirmation Dialog */}
      <Dialog 
        open={confirmDialog.open && confirmDialog.action === 'submit'} 
        onClose={() => !uploading && setConfirmDialog({ open: false, action: null })}
      >
        <DialogTitle>Submit Manifest</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to submit this manifest as delivered?
          </Typography>
          <Box className='mt-4 p-3 bg-actionHover rounded'>
            <Typography variant='body2' className='mb-2'>
              <strong>Summary:</strong>
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              • Package Size: {getPackageSizeLabel(manifestData.packageSize)}
            </Typography>
            <Typography variant='body2' color='success.main'>
              • Delivered: {deliveredCount} package(s)
            </Typography>
            {pendingCount > 0 && (
              <Typography variant='body2' color='warning.main'>
                • Pending: {pendingCount} package(s)
              </Typography>
            )}
          </Box>
          <Typography variant='body2' color='text.secondary' className='mt-3'>
            This action will finalize the manifest and update the trip status.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, action: null })} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitManifest}
            variant='contained'
            color='success'
            disabled={uploading}
            startIcon={uploading ? <CircularProgress size={16} /> : <i className='ri-check-double-line' />}
          >
            {uploading ? 'Submitting...' : 'Submit Manifest'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default ManifestView
