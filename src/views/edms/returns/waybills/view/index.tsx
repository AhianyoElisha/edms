'use client'

// React Imports
import { useState, useEffect } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Alert from '@mui/material/Alert'

// Component Imports
import StyledBreadcrumb from '@/components/layout/shared/Breadcrumbs'

// Toast Imports
import { toast } from 'react-toastify'

// Hook Imports
import { usePermissions } from '@/hooks/usePermissions'

// Action Imports
import { isReturnWaybillAwaitingVerification } from '@/libs/actions/returnwaybill.actions'

// Types
import type { ReturnWaybillType, ReturnWaybillStatusType } from '@/types/apps/deliveryTypes'

// Helper function to get status color
const getStatusColor = (status: ReturnWaybillStatusType): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
  switch (status) {
    case 'delivered':
    case 'processed':
      return 'success'
    case 'in_transit':
      return 'primary'
    case 'pending':
      return 'warning'
    default:
      return 'default'
  }
}

// Helper function to get reason label
const getReasonLabel = (reason: string): string => {
  const labels: Record<string, string> = {
    'rejected': 'Customer Rejected',
    'damaged': 'Damaged Package',
    'wrong_delivery': 'Wrong Delivery',
    'customer_return': 'Customer Return',
    'other': 'Other Reason'
  }
  return labels[reason] || reason || 'Unknown'
}

// Helper function to get reason color
const getReasonColor = (reason: string): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
  switch (reason) {
    case 'rejected':
      return 'error'
    case 'damaged':
      return 'warning'
    case 'wrong_delivery':
      return 'info'
    case 'customer_return':
      return 'primary'
    default:
      return 'default'
  }
}

// Package size labels
const getPackageSizeLabel = (size: string): string => {
  const labels: Record<string, string> = {
    'small': 'Small Packages',
    'medium': 'Medium Packages',
    'big': 'Big Packages'
  }
  return labels[size] || size || 'Unknown'
}

interface ReturnWaybillViewProps {
  waybillData: ReturnWaybillType
  onRefetch?: () => Promise<void>
}

const ReturnWaybillView = ({ waybillData, onRefetch }: ReturnWaybillViewProps) => {
  const [uploadingWaybill, setUploadingWaybill] = useState(false)
  const [uploadingProof, setUploadingProof] = useState(false)
  const [uploadingSignature, setUploadingSignature] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ 
    open: boolean
    action: 'in_transit' | 'delivered' | 'processed' | null
  }>({ open: false, action: null })
  const [receivedBy, setReceivedBy] = useState<string>('')
  const [handoverFile, setHandoverFile] = useState<File | null>(null)
  const [handoverPreview, setHandoverPreview] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  
  const router = useRouter()
  const { isDriver, hasAnyPermission } = usePermissions()

  // Entering the package figures is the office's job, never the driver's.
  const canVerify = !isDriver && hasAnyPermission(['deliveries.edit', 'deliveries.manage'])

  // A return the driver logged in the field with only a photo - no count yet.
  const needsReview = isReturnWaybillAwaitingVerification(waybillData)

  // Get related data
  const trip = waybillData.trip
  const dropoffLocation = waybillData?.dropofflocation
  const pickupLocation = waybillData?.pickuplocation

  // Parse packageDetails if it's a string
  const packageDetails = waybillData.packageDetails 
    ? (typeof waybillData.packageDetails === 'string' 
        ? JSON.parse(waybillData.packageDetails) 
        : waybillData.packageDetails)
    : null

  // Check if waybill can be updated
  const isPending = waybillData.status === 'pending'
  const isInTransit = waybillData.status === 'in_transit'
  const isDelivered = waybillData.status === 'delivered'
  const isProcessed = waybillData.status === 'processed'
  const hasWaybillDocument = Boolean(waybillData.waybillImage)
  const hasProofImage = Boolean(waybillData.proofOfDelivery)
  
  // A photo of the waybill is what puts a return in transit. Handing it back at
  // the depot needs nothing up front - the driver can snap the signed copy in the
  // confirmation step, and the receiver's name is optional.
  const canMarkInTransit = isPending && hasWaybillDocument

  // Compress and upload a photo, returning its public view URL.
  const uploadPhoto = async (file: File, prefix: string): Promise<string> => {
    const { storage, appwriteConfig } = await import('@/libs/appwrite.config')
    const { ID } = await import('appwrite')
    const imageCompression = (await import('browser-image-compression')).default

    const bucketId = appwriteConfig.bucket || process.env.NEXT_PUBLIC_BUCKET_ID
    if (!bucketId) {
      throw new Error('Storage bucket not configured')
    }

    const compressedFile = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/jpeg' as const,
      initialQuality: 0.8
    })

    const uploadedFile = await storage.createFile(
      bucketId,
      ID.unique(),
      new File([compressedFile], `${prefix}_${Date.now()}.jpg`, { type: 'image/jpeg' })
    )

    return `${appwriteConfig.endpoint}/storage/buckets/${bucketId}/files/${uploadedFile.$id}/view?project=${appwriteConfig.project}`
  }

  const handleHandoverPhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a photo')
      return
    }

    if (handoverPreview) URL.revokeObjectURL(handoverPreview)
    setHandoverFile(file)
    setHandoverPreview(URL.createObjectURL(file))
    event.target.value = ''
  }

  const closeConfirmDialog = () => {
    setConfirmDialog({ open: false, action: null })
    setReceivedBy('')
    setHandoverFile(null)
    setHandoverPreview(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, imageType: 'waybill' | 'proof' | 'signature') => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    
    // Set the correct loading state based on image type
    const setLoadingState = (loading: boolean) => {
      if (imageType === 'waybill') setUploadingWaybill(loading)
      else if (imageType === 'proof') setUploadingProof(loading)
      else if (imageType === 'signature') setUploadingSignature(loading)
    }
    
    try {
      setLoadingState(true)
      toast.info('Compressing and uploading image...')
      
      const { updateReturnWaybill } = await import('@/libs/actions/returnwaybill.actions')
      const fileUrl = await uploadPhoto(file, imageType)
      
      // Update the waybill with the image URL (not the ID)
      const updateData: any = {}
      if (imageType === 'waybill') {
        updateData.waybillImage = fileUrl
      } else if (imageType === 'proof') {
        updateData.proofOfDelivery = fileUrl
      } else if (imageType === 'signature') {
        updateData.receiverSignature = fileUrl
      }
      
      await updateReturnWaybill(waybillData.$id, updateData)
      
      toast.success(`${imageType.charAt(0).toUpperCase() + imageType.slice(1)} image uploaded successfully!`)
      
      // Update local state directly (like manifest does)
      Object.assign(waybillData, updateData)
      
      setRefreshKey(prev => prev + 1)
      
    } catch (error: any) {
      console.error('Error uploading image:', error)
      toast.error(error.message || 'Failed to upload image')
      // Reset loading state on error
      if (imageType === 'waybill') setUploadingWaybill(false)
      else if (imageType === 'proof') setUploadingProof(false)
      else if (imageType === 'signature') setUploadingSignature(false)
    } finally {
      // Reset loading state
      if (imageType === 'waybill') setUploadingWaybill(false)
      else if (imageType === 'proof') setUploadingProof(false)
      else if (imageType === 'signature') setUploadingSignature(false)
    }
  }
  
  // Handle status change
  const handleStatusChange = async (newStatus: 'in_transit' | 'delivered' | 'processed') => {
    try {
      setStatusUpdating(true)
      const { 
        markReturnWaybillInTransit, 
        markReturnWaybillDelivered, 
        markReturnWaybillProcessed 
      } = await import('@/libs/actions/returnwaybill.actions')
      
      if (newStatus === 'in_transit') {
        await markReturnWaybillInTransit(waybillData.$id)
        toast.success('Return waybill marked as in transit!')
      } else if (newStatus === 'delivered') {
        let proofUrl: string | undefined

        if (handoverFile) {
          toast.info('Uploading handover photo...')
          proofUrl = await uploadPhoto(handoverFile, 'proof')
        }

        await markReturnWaybillDelivered(waybillData.$id, receivedBy.trim() || undefined, proofUrl)
        toast.success(isDriver ? 'Handover confirmed - thanks!' : 'Return waybill marked as delivered!')
      } else if (newStatus === 'processed') {
        await markReturnWaybillProcessed(waybillData.$id)
        toast.success('Return waybill marked as processed!')
      }
      
      closeConfirmDialog()
      
      // Refetch data to update the UI
      if (onRefetch) {
        await onRefetch()
      } else {
        router.refresh()
      }
      
    } catch (error: any) {
      console.error('Error updating status:', error)
      toast.error(error.message || 'Failed to update status')
    } finally {
      setStatusUpdating(false)
    }
  }

  // Get location name helper
  const getLocationName = (location: any): string => {
    if (!location) return 'N/A'
    if (typeof location === 'object') {
      return location.locationName
    }
    return location
  }

  return (
    <>
      <Typography className='mt-4' variant='h4'>Return Waybill - {waybillData.waybillNumber}</Typography>
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
                label={waybillData.status?.replace('_', ' ').charAt(0).toUpperCase() + waybillData.status?.replace('_', ' ').slice(1)}
                variant='tonal'
                color={getStatusColor(waybillData.status)}
                size='small'
              />
              <Chip
                label={getReasonLabel(waybillData.returnReason)}
                variant='tonal'
                color={getReasonColor(waybillData.returnReason)}
                size='small'
              />
            </div>
            <div className='flex flex-wrap gap-2'>
              {isPending && (
                <Button
                  variant='contained'
                  size='small'
                  color='primary'
                  startIcon={<i className='ri-truck-line' />}
                  onClick={() => setConfirmDialog({ open: true, action: 'in_transit' })}
                  disabled={!hasWaybillDocument}
                  title={!hasWaybillDocument ? 'Upload waybill document first' : ''}
                >
                  Mark In Transit
                </Button>
              )}

              {isInTransit && (
                <Button
                  variant='contained'
                  size='small'
                  color='success'
                  startIcon={<i className='ri-checkbox-circle-line' />}
                  onClick={() => setConfirmDialog({ open: true, action: 'delivered' })}
                >
                  {isDriver ? 'Confirm Handover' : 'Mark Delivered'}
                </Button>
              )}

              {isDelivered && !isDriver && (
                <Button
                  variant='contained'
                  size='small'
                  color='info'
                  startIcon={<i className='ri-check-double-line' />}
                  onClick={() => setConfirmDialog({ open: true, action: 'processed' })}
                >
                  Mark Processed
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

      <Grid container spacing={6}>
        {/* Return Details */}
        <Grid item xs={12} lg={8}>
          <Card className='mb-6'>
            <CardHeader title='Return Details' />
            <CardContent>
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <div className='flex items-center gap-4 mb-4'>
                    <Avatar variant='rounded' className='bg-error'>
                      <i className='ri-arrow-go-back-line' />
                    </Avatar>
                    <div className='overflow-hidden'>
                      <Typography variant='h6' className='truncate'>
                        {getLocationName(dropoffLocation)}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>Origin (From)</Typography>
                    </div>
                  </div>
                </Grid>
                <Grid item xs={12} md={6}>
                  <div className='flex items-center gap-4 mb-4'>
                    <Avatar variant='rounded' className='bg-success'>
                      <i className='ri-map-pin-line' />
                    </Avatar>
                    <div className='overflow-hidden'>
                      <Typography variant='h6' className='truncate'>
                        {getLocationName(pickupLocation)}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>Destination (To)</Typography>
                    </div>
                  </div>
                </Grid>

                <Grid item xs={12}>
                  <Divider />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography color='text.secondary'>Return Date</Typography>
                  <Typography className='font-medium'>
                    {waybillData.returnDate ? new Date(waybillData.returnDate).toLocaleDateString() : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography color='text.secondary'>Package Count</Typography>
                  {needsReview ? (
                    <Chip
                      label={isDriver ? 'Pending office entry' : 'Needs review'}
                      size='small'
                      color='warning'
                      variant='tonal'
                      icon={<i className='ri-error-warning-line' />}
                    />
                  ) : (
                    <Typography className='font-medium'>{waybillData.packageCount || 0} packages</Typography>
                  )}
                </Grid>

                {/* Field capture: the figures are not in yet, so say so instead of showing zeros. */}
                {needsReview && (
                  <Grid item xs={12}>
                    <Alert
                      severity='warning'
                      icon={<i className='ri-file-search-line' />}
                      action={
                        canVerify ? (
                          <Button
                            color='warning'
                            size='small'
                            variant='contained'
                            onClick={() => router.push('/edms/returns/waybills/review')}
                          >
                            Enter Details
                          </Button>
                        ) : undefined
                      }
                    >
                      <Typography variant='subtitle2'>Package details pending</Typography>
                      <Typography variant='body2'>
                        This return was logged in the field with a photo of the waybill. The office will enter the
                        package count and confirm the reason from the photo.
                      </Typography>
                    </Alert>
                  </Grid>
                )}
                
                {/* Package Details Breakdown */}
                {packageDetails && !needsReview && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant='subtitle2' className='mb-2'>Package Breakdown:</Typography>
                      <Box display='flex' gap={2} flexWrap='wrap'>
                        {packageDetails.small > 0 && (
                          <Chip 
                            icon={<i className='ri-inbox-line' />}
                            label={`Small: ${packageDetails.small}`} 
                            variant='outlined' 
                            color='info'
                          />
                        )}
                        {packageDetails.medium > 0 && (
                          <Chip 
                            icon={<i className='ri-inbox-2-line' />}
                            label={`Medium: ${packageDetails.medium}`} 
                            variant='outlined' 
                            color='primary'
                          />
                        )}
                        {packageDetails.big > 0 && (
                          <Chip 
                            icon={<i className='ri-archive-line' />}
                            label={`Big: ${packageDetails.big}`} 
                            variant='outlined' 
                            color='warning'
                          />
                        )}
                      </Box>
                    </Grid>
                  </>
                )}

                {waybillData.reasonNotes && (
                  <>
                    <Grid item xs={12}>
                      <Divider />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography color='text.secondary'>Reason Notes</Typography>
                      <Typography className='font-medium'>{waybillData.reasonNotes}</Typography>
                    </Grid>
                  </>
                )}

                {waybillData.notes && (
                  <Grid item xs={12}>
                    <Typography color='text.secondary'>Additional Notes</Typography>
                    <Typography className='font-medium'>{waybillData.notes}</Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Trip Information */}
          {trip && (
            <Card className='mb-6'>
              <CardHeader title='Associated Trip' />
              <CardContent>
                <Grid container spacing={4}>
                  <Grid item xs={12} md={6}>
                    <Typography color='text.secondary'>Trip Number</Typography>
                    <Typography className='font-medium'>
                      {typeof trip === 'object' ? trip.tripNumber : trip}
                    </Typography>
                  </Grid>
                  {typeof trip === 'object' && (
                    <>
                      <Grid item xs={12} md={6}>
                        <Typography color='text.secondary'>Trip Date</Typography>
                        <Typography className='font-medium'>
                          {trip.tripDate ? new Date(trip.tripDate).toLocaleDateString() : 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography color='text.secondary'>Trip Status</Typography>
                        <Chip
                          label={trip.status?.replace('_', ' ')}
                          variant='tonal'
                          color={getStatusColor(trip.status)}
                          size='small'
                        />
                      </Grid>
                    </>
                  )}
                  <Grid item xs={12}>
                    <Button
                      variant='outlined'
                      size='small'
                      onClick={() => router.push(`/edms/trips/${typeof trip === 'object' ? trip.$id : trip}`)}
                    >
                      View Trip Details
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Delivery Information - shown when delivered */}
          {(isDelivered || isProcessed) && (
            <Card className='mb-6'>
              <CardHeader title='Delivery Information' />
              <CardContent>
                <Grid container spacing={4}>
                  <Grid item xs={12} md={6}>
                    <Typography color='text.secondary'>Delivered At</Typography>
                    <Typography className='font-medium'>
                      {waybillData.deliveredAt ? new Date(waybillData.deliveredAt).toLocaleString() : 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography color='text.secondary'>Received By</Typography>
                    <Typography className='font-medium'>{waybillData.receivedBy || 'N/A'}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Side Panel - Images & Actions */}
        <Grid item xs={12} lg={4}>
          {/* Waybill Image */}
          <Card className='mb-6'>
              {isPending && !hasWaybillDocument && (
                <Typography variant='caption' color='warning.main' className='self-center m-3'>
                  Upload waybill document to mark in transit
                </Typography>
              )}
            <CardHeader title='Waybill Document' />
            <CardContent>
              {waybillData.waybillImage ? (
                <Box>
                  <img 
                    src={waybillData.waybillImage}
                    alt='Waybill document'
                    className='w-full h-auto rounded-lg mb-4'
                    style={{ maxHeight: '300px', objectFit: 'contain' }}
                  />
                </Box>
              ) : (
                <Box className='text-center py-8 border-2 border-dashed rounded-lg'>
                  <i className='ri-file-upload-line text-4xl text-textSecondary mb-2' />
                  <Typography color='text.secondary'>No waybill document uploaded</Typography>
                </Box>
              )}
              {!isProcessed && (
                <div className='flex flex-wrap gap-2 mt-4'>
                  {/* Photo-only, camera first: drivers shoot the paper, the office can pick a file. */}
                  <Button
                    component='label'
                    variant='contained'
                    startIcon={uploadingWaybill ? <CircularProgress size={20} color='inherit' /> : <i className='ri-camera-line' />}
                    disabled={uploadingWaybill}
                  >
                    {waybillData.waybillImage ? 'Retake' : 'Take'} Photo
                    <input
                      type='file'
                      hidden
                      accept='image/*'
                      capture='environment'
                      onChange={(e) => handleImageUpload(e, 'waybill')}
                    />
                  </Button>
                  <Button
                    component='label'
                    variant='outlined'
                    startIcon={<i className='ri-image-add-line' />}
                    disabled={uploadingWaybill}
                  >
                    Choose Photo
                    <input
                      type='file'
                      hidden
                      accept='image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif'
                      onChange={(e) => handleImageUpload(e, 'waybill')}
                    />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Proof of Delivery */}
          <Card className='mb-6'>
            <CardHeader title='Proof of Delivery' />
            <CardContent>
              {waybillData.proofOfDelivery ? (
                <Box>
                  <img 
                    src={waybillData.proofOfDelivery}
                    alt='Proof of delivery'
                    className='w-full h-auto rounded-lg mb-4'
                    style={{ maxHeight: '300px', objectFit: 'contain' }}
                  />
                </Box>
              ) : (
                <Box className='text-center py-8 border-2 border-dashed rounded-lg'>
                  <i className='ri-camera-line text-4xl text-textSecondary mb-2' />
                  <Typography color='text.secondary'>No proof of delivery uploaded</Typography>
                </Box>
              )}
              {!isProcessed && (
                <div className='flex flex-wrap gap-2 mt-4'>
                  {/* Photo-only, camera first: drivers shoot the paper, the office can pick a file. */}
                  <Button
                    component='label'
                    variant='contained'
                    startIcon={uploadingProof ? <CircularProgress size={20} color='inherit' /> : <i className='ri-camera-line' />}
                    disabled={uploadingProof}
                  >
                    {waybillData.proofOfDelivery ? 'Retake' : 'Take'} Photo
                    <input
                      type='file'
                      hidden
                      accept='image/*'
                      capture='environment'
                      onChange={(e) => handleImageUpload(e, 'proof')}
                    />
                  </Button>
                  <Button
                    component='label'
                    variant='outlined'
                    startIcon={<i className='ri-image-add-line' />}
                    disabled={uploadingProof}
                  >
                    Choose Photo
                    <input
                      type='file'
                      hidden
                      accept='image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif'
                      onChange={(e) => handleImageUpload(e, 'proof')}
                    />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Receiver Signature */}
          <Card className='mb-6'>
            <CardHeader title='Receiver Signature' />
            <CardContent>
              {waybillData.receiverSignature ? (
                <Box>
                  <img 
                    src={waybillData.receiverSignature}
                    alt='Receiver signature'
                    className='w-full h-auto rounded-lg mb-4 bg-white'
                    style={{ maxHeight: '200px', objectFit: 'contain' }}
                  />
                </Box>
              ) : (
                <Box className='text-center py-8 border-2 border-dashed rounded-lg'>
                  <i className='ri-edit-line text-4xl text-textSecondary mb-2' />
                  <Typography color='text.secondary'>No signature captured</Typography>
                </Box>
              )}
              {!isProcessed && (
                <Button
                  component='label'
                  variant='outlined'
                  fullWidth
                  startIcon={uploadingSignature ? <CircularProgress size={20} /> : <i className='ri-edit-line' />}
                  disabled={uploadingSignature}
                  className='mt-4'
                >
                  {waybillData.receiverSignature ? 'Replace Signature' : 'Upload Signature'}
                  <input
                    type='file'
                    hidden
                    accept='image/*'
                    onChange={(e) => handleImageUpload(e, 'signature')}
                  />
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader title='Timeline' />
            <CardContent>
              <Box className='flex flex-col gap-4'>
                <div>
                  <Typography variant='body2' color='text.secondary'>Created</Typography>
                  <Typography>{new Date(waybillData.$createdAt).toLocaleString()}</Typography>
                </div>
                <Divider />
                <div>
                  <Typography variant='body2' color='text.secondary'>Last Updated</Typography>
                  <Typography>{new Date(waybillData.$updatedAt).toLocaleString()}</Typography>
                </div>
                {waybillData.deliveredAt && (
                  <>
                    <Divider />
                    <div>
                      <Typography variant='body2' color='text.secondary'>Delivered</Typography>
                      <Typography>{new Date(waybillData.deliveredAt).toLocaleString()}</Typography>
                    </div>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Confirmation Dialog */}
      <Dialog 
        open={confirmDialog.open} 
        onClose={statusUpdating ? undefined : closeConfirmDialog}
        fullWidth
        maxWidth='xs'
      >
        <DialogTitle>
          {confirmDialog.action === 'in_transit' && 'Mark as In Transit?'}
          {confirmDialog.action === 'delivered' && (isDriver ? 'Confirm Handover?' : 'Mark as Delivered?')}
          {confirmDialog.action === 'processed' && 'Mark as Processed?'}
        </DialogTitle>
        <DialogContent>
          {confirmDialog.action === 'in_transit' && (
            <DialogContentText>
              This will mark the return waybill as in transit, indicating that the returned packages are on their way to the pickup location.
            </DialogContentText>
          )}
          {confirmDialog.action === 'delivered' && (
            <>
              <DialogContentText className='mb-4'>
                The returned packages have been handed over at {getLocationName(pickupLocation)}.
                {!hasProofImage && ' Snap the signed waybill if you have it - optional.'}
              </DialogContentText>

              {!hasProofImage && (
                <div className='mb-4'>
                  {handoverPreview ? (
                    <img
                      src={handoverPreview}
                      alt='Handover'
                      className='w-full rounded-lg border mb-2'
                      style={{ maxHeight: 220, objectFit: 'contain' }}
                    />
                  ) : null}
                  <div className='flex flex-wrap gap-2'>
                    <Button
                      component='label'
                      variant={handoverPreview ? 'outlined' : 'contained'}
                      startIcon={<i className='ri-camera-line' />}
                      disabled={statusUpdating}
                    >
                      {handoverPreview ? 'Retake Photo' : 'Take Photo'}
                      <input type='file' hidden accept='image/*' capture='environment' onChange={handleHandoverPhotoSelect} />
                    </Button>
                    <Button
                      component='label'
                      variant='outlined'
                      startIcon={<i className='ri-image-add-line' />}
                      disabled={statusUpdating}
                    >
                      Choose Photo
                      <input
                        type='file'
                        hidden
                        accept='image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif'
                        onChange={handleHandoverPhotoSelect}
                      />
                    </Button>
                  </div>
                </div>
              )}

              <TextField
                margin='dense'
                label='Received By (optional)'
                type='text'
                fullWidth
                variant='outlined'
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                placeholder='Name of the person who received it'
                disabled={statusUpdating}
              />
            </>
          )}
          {confirmDialog.action === 'processed' && (
            <DialogContentText>
              This will mark the return waybill as fully processed. This action indicates that all return procedures have been completed.
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={closeConfirmDialog}
            disabled={statusUpdating}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => confirmDialog.action && handleStatusChange(confirmDialog.action)}
            variant='contained'
            color={confirmDialog.action === 'in_transit' ? 'primary' : confirmDialog.action === 'delivered' ? 'success' : 'info'}
            disabled={statusUpdating}
            startIcon={statusUpdating ? <CircularProgress size={20} color='inherit' /> : undefined}
          >
            {statusUpdating ? 'Updating...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default ReturnWaybillView
