'use client'

// React Imports
import { useState } from 'react'

// Next Imports
import Link from 'next/link'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import Avatar from '@mui/material/Avatar'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Tooltip from '@mui/material/Tooltip'

// Toast Imports
import { toast } from 'react-toastify'

// Helper function to parse JSON fields safely
const parseJSON = (jsonString: string | null | undefined) => {
  if (!jsonString) return []
  try {
    return JSON.parse(jsonString)
  } catch {
    return []
  }
}

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
    case 'picked-up':
      return 'warning'
    case 'cancelled':
    case 'canceled':
    case 'failed':
      return 'error'
    default:
      return 'default'
  }
}

const ManifestView = ({ manifestData }: { manifestData: any }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'packages'>('overview')
  const [selectedPackages, setSelectedPackages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: 'delivered' | 'submit' | null }>({ open: false, action: null })
  const [refreshKey, setRefreshKey] = useState(0)

  // Parse packages and their related data
  const packages = Array.isArray(manifestData.packages) ? manifestData.packages : []
  const packageTypes = parseJSON(manifestData.packageTypes)
  const packageStatuses = parseJSON(manifestData.packageStatuses)

  const trip = manifestData.trip
  const dropoffLocation = manifestData?.dropofflocation
  const pickupLocation = manifestData?.pickuplocation


  // Check if manifest can be submitted (has proof image and is not already delivered)
  const hasProofImage = Boolean(manifestData.proofOfDeliveryImage)
  const isDelivered = manifestData.status === 'delivered' || manifestData.status === 'completed'
  
  // Check if at least one package has been marked as delivered (to prevent premature submission)
  const hasDeliveredPackages = packages.some((pkg: any) => pkg.status === 'delivered')
  const hasUnprocessedPackages = packages.some((pkg: any) => pkg.status !== 'delivered' && pkg.status !== 'missing')
  
  // Can only submit if: has proof, has at least one delivered package, and not already delivered
  const canSubmit = hasProofImage && hasDeliveredPackages && !isDelivered
  
  // Handle select all packages
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const allPackageIds = packages.filter((pkg: any) => pkg.status !== 'delivered').map((pkg: any) => pkg.$id)
      setSelectedPackages(allPackageIds)
    } else {
      setSelectedPackages([])
    }
  }
  
  // Handle individual package selection
  const handleSelectPackage = (packageId: string) => {
    setSelectedPackages(prev => {
      if (prev.includes(packageId)) {
        return prev.filter(id => id !== packageId)
      } else {
        return [...prev, packageId]
      }
    })
  }
  
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
        maxSizeMB: 1, // Maximum file size in MB
        maxWidthOrHeight: 1920, // Maximum width or height
        useWebWorker: true, // Use web worker for better performance
        fileType: 'image/jpeg', // Convert to JPEG for better compression
        initialQuality: 0.8 // Quality (0-1), 0.8 maintains good quality
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
      
      // Update local state instead of reloading
      Object.assign(manifestData, {
        proofOfDeliveryImage: fileUrl,
        deliveryTime: updatedManifest.deliveryTime
      })
      
      // Trigger re-render by updating refresh key
      setRefreshKey(prev => prev + 1)
    } catch (error: any) {
      console.error('Error uploading proof image:', error)
      toast.error(error?.message || 'Failed to upload image. Please try again.')
    } finally {
      setUploading(false)
    }
  }
  
  // Handle mark packages as delivered
  const handleMarkAsDelivered = async () => {
    try {
      setUploading(true)
      toast.info('Updating package statuses...')
      
      const { bulkUpdatePackageStatus } = await import('@/libs/actions/package.actions')
      const { updateManifestDeliveredCount } = await import('@/libs/actions/manifest.actions')
      
      // Update selected packages to delivered
      await bulkUpdatePackageStatus(selectedPackages, 'delivered', new Date().toISOString())
      
      // Update local package statuses
      packages.forEach((pkg: any) => {
        if (selectedPackages.includes(pkg.$id)) {
          pkg.status = 'delivered'
          pkg.deliveryDate = new Date().toISOString()
        }
      })
      
      // Count total delivered packages in this manifest
      const deliveredCount = packages.filter((pkg: any) => pkg.status === 'delivered').length
      
      // Update manifest's deliveredPackages count
      await updateManifestDeliveredCount(manifestData.$id, deliveredCount)
      
      // Update local manifest data
      Object.assign(manifestData, {
        deliveredPackages: deliveredCount
      })
      
      toast.success(`${selectedPackages.length} package(s) marked as delivered!`)
      
      // Clear selection and close dialog
      setSelectedPackages([])
      setConfirmDialog({ open: false, action: null })
      setUploading(false)
      
      // Trigger re-render
      setRefreshKey(prev => prev + 1)
    } catch (error: any) {
      console.error('Error marking packages as delivered:', error)
      toast.error(error?.message || 'Failed to update packages. Please try again.')
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
      
      // Get delivered and missing package IDs
      const deliveredPackageIds = packages
        .filter((pkg: any) => pkg.status === 'delivered')
        .map((pkg: any) => pkg.$id)
      
      const missingPackageIds = packages
        .filter((pkg: any) => pkg.status !== 'delivered' && pkg.status !== 'pending')
        .map((pkg: any) => pkg.$id)
      
      // Mark manifest as delivered with package tracking
      const updatedManifest = await markManifestAsDelivered(
        manifestData.$id,
        deliveredPackageIds,
        missingPackageIds
      )
      
      // Update local manifest data
      Object.assign(manifestData, {
        status: 'delivered',
        deliveryTime: updatedManifest.deliveryTime,
        actualArrival: updatedManifest.actualArrival,
        arrivalTime: updatedManifest.arrivalTime,
        deliveredPackages: updatedManifest.deliveredPackages,
        missingPackages: updatedManifest.missingPackages
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
      
      // Close dialog and update UI
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
      
      {/* Header Info */}
      <Card className='mb-6'>
        <CardContent>
          <div className='flex items-start justify-between flex-wrap gap-4'>
            <div className='flex flex-wrap items-center gap-2'>
              <Typography variant='body2' color='text.secondary'>
                Status:
              </Typography>
              <Chip
                label={manifestData.status?.charAt(0).toUpperCase() + manifestData.status?.slice(1)}
                variant='tonal'
                color={getStatusColor(manifestData.status)}
                size='small'
              />
              <Chip
                label={`${packages.length} Packages`}
                color='info'
                size='small'
                variant='tonal'
              />
            </div>
            <div className='flex flex-wrap gap-2'>
              {!isDelivered && (
                <>
                  <Button
                    variant='outlined'
                    size='small'
                    component='label'
                    startIcon={uploading ? <CircularProgress size={16} /> : <i className='ri-image-add-line' />}
                    disabled={uploading}
                  >
                    {manifestData.proofOfDeliveryImage ? 'Change' : 'Upload'} Proof
                    <input
                      type='file'
                      hidden
                      accept='image/*'
                      onChange={handleImageUpload}
                    />
                  </Button>
                  {!isDelivered && (
                    <Tooltip 
                      title={
                        !hasProofImage 
                          ? "Upload proof of delivery first" 
                          : !hasDeliveredPackages 
                          ? "Mark at least one package as delivered in the Packages tab" 
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
                  )}
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

      {/* Tabs */}
      <Card>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          aria-label='manifest details tabs'
        >
          <Tab 
            label='Overview' 
            value='overview'
            icon={<i className='ri-dashboard-line' />}
            iconPosition='start'
          />
          <Tab 
            label={`Packages (${packages.length})`}
            value='packages'
            icon={<i className='ri-inbox-line' />}
            iconPosition='start'
          />
        </Tabs>

        <CardContent>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <Grid container spacing={6}>
              {/* Manifest Summary */}
              <Grid item xs={12} sm={6} lg={3}>
                <div className='flex items-center gap-4'>
                  <Avatar variant='rounded' className='bg-primary'>
                    <i className='ri-file-list-3-line' />
                  </Avatar>
                  <div className='overflow-hidden'>
                    <Typography variant='h5' className='truncate'>{manifestData.manifestNumber}</Typography>
                    <Typography variant='body2'>Manifest Number</Typography>
                  </div>
                </div>
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <div className='flex items-center gap-4'>
                  <Avatar variant='rounded' className='bg-info'>
                    <i className='ri-inbox-line' />
                  </Avatar>
                  <div className='overflow-hidden'>
                    <Typography variant='h5'>{packages.length}</Typography>
                    <Typography variant='body2'>Total Packages</Typography>
                  </div>
                </div>
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <div className='flex items-center gap-4'>
                  <Avatar variant='rounded' className='bg-success'>
                    <i className='ri-check-line' />
                  </Avatar>
                  <div className='overflow-hidden'>
                    <Typography variant='h5'>
                      {manifestData.deliveredPackages || 0}
                    </Typography>
                    <Typography variant='body2'>Delivered</Typography>
                  </div>
                </div>
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <div className='flex items-center gap-4'>
                  <Avatar variant='rounded' className='bg-error'>
                    <i className='ri-close-line' />
                  </Avatar>
                  <div className='overflow-hidden'>
                    <Typography variant='h5'>
                      {(() => {
                        try {
                          const missing = JSON.parse(manifestData.missingPackages || '[]')
                          return Array.isArray(missing) ? missing.length : 0
                        } catch {
                          return 0
                        }
                      })()}
                    </Typography>
                    <Typography>Missing</Typography>
                  </div>
                </div>
              </Grid>

              {/* Package Types Breakdown */}
              {manifestData.packageTypes && (
                <>
                  <Grid item xs={12}>
                    <Divider />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant='h6' className='mb-4'>Package Types Breakdown</Typography>
                  </Grid>
                  {(() => {
                    try {
                      const types = JSON.parse(manifestData.packageTypes)
                      return Object.entries(types).map(([type, count]: [string, any]) => (
                        count > 0 && (
                          <Grid item xs={6} md={3} key={type}>
                            <Typography color='text.secondary'>{type.charAt(0).toUpperCase() + type.slice(1)}</Typography>
                            <Typography className='font-medium'>{count} packages</Typography>
                          </Grid>
                        )
                      ))
                    } catch {
                      return null
                    }
                  })()}
                </>
              )}

              {/* Divider */}
              <Grid item xs={12}>
                <Divider />
              </Grid>

              {/* Timeline Information */}
              <Grid item xs={12} sm={6} lg={3}>
                <Typography variant='body2' color='text.secondary'>Manifest Date</Typography>
                <Typography className='font-medium'>
                  {manifestData.manifestDate ? new Date(manifestData.manifestDate).toLocaleDateString() : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <Typography variant='body2' color='text.secondary'>Departure Time</Typography>
                <Typography className='font-medium'>
                  {manifestData.departureTime ? new Date(manifestData.departureTime).toLocaleString() : 'Not departed'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <Typography variant='body2' color='text.secondary'>Arrival Time</Typography>
                <Typography className='font-medium'>
                  {manifestData.arrivalTime ? new Date(manifestData.arrivalTime).toLocaleString() : 'Not arrived'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <Typography variant='body2' color='text.secondary'>Delivery Time</Typography>
                <Typography className='font-medium'>
                  {manifestData.deliveryTime ? new Date(manifestData.deliveryTime).toLocaleString() : 'Not delivered'}
                </Typography>
              </Grid>

              {/* Divider */}
              <Grid item xs={12}>
                <Divider />
              </Grid>

              {/* Vehicle & Driver Info */}
              <Grid item xs={12} md={6}>
                <Typography variant='h6' className='mb-4'>Vehicle Information</Typography>
                <Typography color='text.secondary' className='mb-1'>
                  <strong>Vehicle ID:</strong> {typeof trip.vehicle === 'object' && trip.vehicle !== null
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
                  <strong>Name:</strong> {trip.driver.name || 'N/A'}
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

              {/* Divider */}
              <Grid item xs={12}>
                <Divider />
              </Grid>

              {/* Location Information */}
              <Grid item xs={12} md={6}>
                <Typography variant='h6' className='mb-4'>Pickup Location</Typography>
                <Typography color='text.secondary' className='mb-2'>
                  {pickupLocation && typeof pickupLocation === 'object'
                    ? pickupLocation.address || pickupLocation.city || 'N/A'
                    : pickupLocation || 'N/A'}
                </Typography>
                {pickupLocation && typeof pickupLocation === 'object' && (
                  <>
                    {pickupLocation.city && (
                      <Typography variant='body2' color='text.secondary'>
                        {pickupLocation.city}, {pickupLocation.state} {pickupLocation.postalCode}
                      </Typography>
                    )}
                    {pickupLocation.country && (
                      <Typography variant='body2' color='text.secondary'>
                        {pickupLocation.country}
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
                        {dropoffLocation.city}, {dropoffLocation.region} {dropoffLocation.postalCode}
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
              {(manifestData.deliveryGpsVerified || manifestData.proofOfDeliveryImage || manifestData.deliveryGpsCoordinates) && (
                <>
                  <Grid item xs={12}>
                    <Divider />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant='h6' className='mb-4'>Delivery Verification</Typography>
                  </Grid>
                  {manifestData.deliveryGpsVerified && (
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
                  {manifestData.proofOfDeliveryImage && (
                    <Grid item xs={12} sm={6} lg={4}>
                      <Typography variant='body2' color='text.secondary'>Proof of Delivery</Typography>
                      <Button
                        size='small'
                        variant='outlined'
                        startIcon={<i className='ri-image-line' />}
                        onClick={() => window.open(manifestData.proofOfDeliveryImage, '_blank')}
                      >
                        View Image
                      </Button>
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
                          label={trip.status?.charAt(0).toUpperCase() + trip.status?.slice(1)}
                          variant='tonal'
                          color={getStatusColor(trip.status)}
                          size='small'
                        />
                      </Grid>
                      <Grid item xs={12} md={6} lg={3}>
                        <Typography color='text.secondary'>Driver</Typography>
                        <Typography className='font-medium'>
                          {trip.driver.name || trip.driver.email || 'N/A'}
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
          )}

          {/* Packages Tab */}
          {activeTab === 'packages' && (
            <div className='overflow-x-auto'>
              {packages.length > 0 ? (
                <>
                  {!hasProofImage && (
                    <div className='mb-4 p-4 bg-warning/10 rounded'>
                      <Typography variant='body2' color='warning'>
                        <i className='ri-alert-line' /> Please upload proof of delivery image before marking packages as delivered
                      </Typography>
                    </div>
                  )}
                  {hasProofImage && !hasDeliveredPackages && (
                    <div className='mb-4 p-4 bg-info/10 rounded'>
                      <Typography variant='body2' color='info'>
                        <i className='ri-information-line' /> Select and mark packages as delivered before submitting the manifest
                      </Typography>
                    </div>
                  )}
                  {hasProofImage && selectedPackages.length > 0 && (
                    <div className='mb-4 p-4 bg-primary/10 rounded flex items-center justify-between flex-wrap gap-2'>
                      <Typography variant='body2' color='primary'>
                        {selectedPackages.length} package{selectedPackages.length > 1 ? 's' : ''} selected
                      </Typography>
                      <Button
                        variant='contained'
                        size='small'
                        color='success'
                        onClick={() => setConfirmDialog({ open: true, action: 'delivered' })}
                        startIcon={<i className='ri-check-line' />}
                      >
                        Mark as Delivered
                      </Button>
                    </div>
                  )}
                  <TableContainer component={Paper} variant='outlined'>
                    <Table sx={{ minWidth: 800 }}>
                      <TableHead>
                        <TableRow>
                          {(
                            <TableCell padding='checkbox'>
                              <Checkbox
                                checked={selectedPackages.length > 0 && selectedPackages.length === packages.filter((pkg: any) => pkg.status !== 'delivered').length}
                                indeterminate={selectedPackages.length > 0 && selectedPackages.length < packages.filter((pkg: any) => pkg.status !== 'delivered').length}
                                onChange={handleSelectAll}
                                disabled={!hasProofImage}
                              />
                            </TableCell>
                          )}
                          <TableCell>Tracking Number</TableCell>
                          <TableCell>Recipient</TableCell>
                        <TableCell>Size/Type</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Expected Delivery</TableCell>
                        <TableCell>Actual Delivery</TableCell>
                        <TableCell align='right'>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {packages.map((pkg: any) => (
                        <TableRow key={pkg.$id} hover>
                          {(
                            <TableCell padding='checkbox'>
                              <Checkbox
                                checked={selectedPackages.includes(pkg.$id)}
                                onChange={() => handleSelectPackage(pkg.$id)}
                                disabled={!hasProofImage || pkg.status === 'delivered'}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <Typography className='font-medium'>
                              {pkg.trackingNumber}
                            </Typography>
                            {pkg.isBin && (
                              <Chip
                                label={`Bin (${pkg.itemCount || 0} items)`}
                                variant='tonal'
                                color='secondary'
                                size='small'
                                className='mt-1'
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2'>
                              {pkg.recipient || pkg.recipientName || 'N/A'}
                            </Typography>
                            {pkg.recipientPhone && (
                              <Typography variant='caption' color='text.secondary' className='block'>
                                {pkg.recipientPhone}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2'>
                              {pkg.packageSize ? pkg.packageSize.charAt(0).toUpperCase() + pkg.packageSize.slice(1) : 'N/A'}
                            </Typography>
                            {pkg.packageType && (
                              <Typography variant='caption' color='text.secondary' className='block'>
                                {pkg.packageType}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={pkg.status?.charAt(0).toUpperCase() + pkg.status?.slice(1)}
                              variant='tonal'
                              color={getStatusColor(pkg.status)}
                              size='small'
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2'>
                              {pkg.expectedDeliveryDate ? new Date(pkg.expectedDeliveryDate).toLocaleDateString() : 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2'>
                              {pkg.deliveryDate ? new Date(pkg.deliveryDate).toLocaleDateString() : 
                               pkg.status === 'delivered' ? 'Check history' : 'Not delivered'}
                            </Typography>
                          </TableCell>
                          <TableCell align='right'>
                            <Link href={`/edms/packages/${pkg.$id}`} passHref>
                              <Button size='small' variant='outlined'>
                                View
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                </>
              ) : (
                <div className='text-center py-12'>
                  <i className='ri-inbox-line text-6xl text-textSecondary mb-2' />
                  <Typography variant='h6' color='text.secondary'>
                    No packages found
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    This manifest doesn't have any packages yet
                  </Typography>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => !uploading && setConfirmDialog({ open: false, action: null })}>
        <DialogTitle>
          {confirmDialog.action === 'delivered' ? 'Mark Packages as Delivered' : 'Submit Manifest'}
        </DialogTitle>
        <DialogContent>
          {confirmDialog.action === 'delivered' ? (
            <Typography>
              Are you sure you want to mark {selectedPackages.length} package{selectedPackages.length > 1 ? 's' : ''} as delivered?
            </Typography>
          ) : (
            <div>
              <Typography gutterBottom>
                Are you sure you want to submit this manifest as delivered?
              </Typography>
              <div className='mt-4 p-3 bg-gray-50 rounded'>
                <Typography variant='body2' className='mb-2'>
                  <strong>Summary:</strong>
                </Typography>
                <Typography variant='body2' color='success.main'>
                  • Delivered: {packages.filter((pkg: any) => pkg.status === 'delivered').length} package(s)
                </Typography>
                {hasUnprocessedPackages && (
                  <Typography variant='body2' color='warning.main'>
                    • Remaining: {packages.filter((pkg: any) => pkg.status !== 'delivered' && pkg.status !== 'missing').length} package(s) (will be marked as missing)
                  </Typography>
                )}
              </div>
              <Typography variant='body2' color='text.secondary' className='mt-3'>
                This action will finalize the manifest and update the trip checkpoint.
              </Typography>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, action: null })} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={confirmDialog.action === 'delivered' ? handleMarkAsDelivered : handleSubmitManifest}
            variant='contained'
            color={confirmDialog.action === 'delivered' ? 'success' : 'primary'}
            disabled={uploading}
            startIcon={uploading ? <CircularProgress size={16} /> : <i className='ri-check-line' />}
          >
            {uploading ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default ManifestView
