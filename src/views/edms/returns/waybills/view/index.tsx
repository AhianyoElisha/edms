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

// Component Imports
import StyledBreadcrumb from '@/components/layout/shared/Breadcrumbs'

// Toast Imports
import { toast } from 'react-toastify'

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
  const [uploading, setUploading] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ 
    open: boolean
    action: 'in_transit' | 'delivered' | 'processed' | null
  }>({ open: false, action: null })
  const [receivedBy, setReceivedBy] = useState<string>('')
  const [refreshKey, setRefreshKey] = useState(0)
  
  const router = useRouter()

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
  
  // Validation flags for status changes
  const canMarkInTransit = isPending && hasWaybillDocument
  const canMarkDelivered = isInTransit && hasProofImage

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, imageType: 'waybill' | 'proof' | 'signature') => {
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
      const { updateReturnWaybill } = await import('@/libs/actions/returnwaybill.actions')
      const { ID } = await import('appwrite')
      const imageCompression = (await import('browser-image-compression')).default
      
      // Validate bucket ID
      const bucketId = appwriteConfig.bucket || process.env.NEXT_PUBLIC_BUCKET_ID
      if (!bucketId) {
        throw new Error('Storage bucket not configured')
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
        `${imageType}_${Date.now()}.jpg`, 
        { type: 'image/jpeg' }
      )
      
      // Upload to Appwrite storage
      const uploadedFile = await storage.createFile(
        bucketId,
        ID.unique(),
        compressedImageFile
      )
      
      // Build the file view URL
      const fileUrl = `${appwriteConfig.endpoint}/storage/buckets/${bucketId}/files/${uploadedFile.$id}/view?project=${appwriteConfig.project}`
      
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
    } finally {
      setUploading(false)
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
        if (!receivedBy.trim()) {
          toast.error('Please enter who received the return')
          setStatusUpdating(false)
          return
        }
        await markReturnWaybillDelivered(waybillData.$id, receivedBy.trim())
        toast.success('Return waybill marked as delivered!')
      } else if (newStatus === 'processed') {
        await markReturnWaybillProcessed(waybillData.$id)
        toast.success('Return waybill marked as processed!')
      }
      
      setConfirmDialog({ open: false, action: null })
      setReceivedBy('')
      
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
              {isPending && !hasWaybillDocument && (
                <Typography variant='caption' color='warning.main' className='self-center'>
                  Upload waybill document to mark in transit
                </Typography>
              )}
              {isInTransit && (
                <Button
                  variant='contained'
                  size='small'
                  color='success'
                  startIcon={<i className='ri-checkbox-circle-line' />}
                  onClick={() => setConfirmDialog({ open: true, action: 'delivered' })}
                  disabled={!hasProofImage}
                  title={!hasProofImage ? 'Upload proof of delivery first' : ''}
                >
                  Mark Delivered
                </Button>
              )}

              {isDelivered && (
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
                  <Typography className='font-medium'>{waybillData.packageCount} packages</Typography>
                </Grid>
                
                {/* Package Details Breakdown */}
                {packageDetails && (
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
                <Button
                  component='label'
                  variant='outlined'
                  fullWidth
                  startIcon={uploading ? <CircularProgress size={20} /> : <i className='ri-upload-2-line' />}
                  disabled={uploading}
                  className='mt-4'
                >
                  {waybillData.waybillImage ? 'Replace Document' : 'Upload Document'}
                  <input
                    type='file'
                    hidden
                    accept='image/*'
                    onChange={(e) => handleImageUpload(e, 'waybill')}
                  />
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Proof of Delivery */}
          <Card className='mb-6'>
              {isInTransit && !hasProofImage && (
                <Typography variant='caption' color='warning.main' className='self-center m-4'>
                  Upload proof of delivery to mark delivered
                </Typography>
              )}
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
                <Button
                  component='label'
                  variant='outlined'
                  fullWidth
                  startIcon={uploading ? <CircularProgress size={20} /> : <i className='ri-camera-line' />}
                  disabled={uploading}
                  className='mt-4'
                >
                  {waybillData.proofOfDelivery ? 'Replace Proof Image' : 'Upload Proof Image'}
                  <input
                    type='file'
                    hidden
                    accept='image/*'
                    onChange={(e) => handleImageUpload(e, 'proof')}
                  />
                </Button>
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
                  startIcon={uploading ? <CircularProgress size={20} /> : <i className='ri-edit-line' />}
                  disabled={uploading}
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
        onClose={() => setConfirmDialog({ open: false, action: null })}
      >
        <DialogTitle>
          {confirmDialog.action === 'in_transit' && 'Mark as In Transit?'}
          {confirmDialog.action === 'delivered' && 'Mark as Delivered?'}
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
                Please enter the name of the person who received the returned packages.
              </DialogContentText>
              <TextField
                autoFocus
                margin='dense'
                label='Received By'
                type='text'
                fullWidth
                variant='outlined'
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                placeholder='Enter name of receiver'
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
            onClick={() => setConfirmDialog({ open: false, action: null })}
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
