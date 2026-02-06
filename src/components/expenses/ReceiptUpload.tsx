'use client'

// React Imports
import { useState, useRef } from 'react'

// MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import ImageList from '@mui/material/ImageList'
import ImageListItem from '@mui/material/ImageListItem'
import ImageListItemBar from '@mui/material/ImageListItemBar'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'

// Third-party Imports
import { toast } from 'react-toastify'
import imageCompression from 'browser-image-compression'
import { ID } from 'appwrite'

// Appwrite Imports
import { storage, appwriteConfig } from '@/libs/appwrite.config'

interface ReceiptUploadProps {
  expenseId?: string // If provided, will update the expense directly
  receiptImageId?: string // Current receipt image ID
  additionalImageIds?: string[] // Current additional image IDs
  onReceiptUploaded?: (fileId: string, fileUrl: string) => void
  onAdditionalImageUploaded?: (fileId: string, fileUrl: string) => void
  onImageRemoved?: (fileId: string) => void
  maxAdditionalImages?: number
}

const ReceiptUpload = ({
  expenseId,
  receiptImageId,
  additionalImageIds = [],
  onReceiptUploaded,
  onAdditionalImageUploaded,
  onImageRemoved,
  maxAdditionalImages = 5
}: ReceiptUploadProps) => {
  const [uploading, setUploading] = useState(false)
  const [uploadingAdditional, setUploadingAdditional] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const receiptInputRef = useRef<HTMLInputElement>(null)
  const additionalInputRef = useRef<HTMLInputElement>(null)

  const getImageUrl = (fileId: string) => {
    return `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.bucket}/files/${fileId}/view?project=${appwriteConfig.project}`
  }

  const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)

      // Compress image
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/jpeg' as const,
        initialQuality: 0.8
      }

      const compressedFile = await imageCompression(file, options)
      
      const imageFile = new File(
        [compressedFile],
        `receipt_${Date.now()}.jpg`,
        { type: 'image/jpeg' }
      )

      // Upload to storage
      const uploadedFile = await storage.createFile(
        appwriteConfig.bucket,
        ID.unique(),
        imageFile
      )

      const fileUrl = getImageUrl(uploadedFile.$id)
      
      if (onReceiptUploaded) {
        onReceiptUploaded(uploadedFile.$id, fileUrl)
      }

      toast.success('Receipt uploaded successfully!')
    } catch (error: any) {
      console.error('Error uploading receipt:', error)
      toast.error(error?.message || 'Failed to upload receipt')
    } finally {
      setUploading(false)
      if (receiptInputRef.current) {
        receiptInputRef.current.value = ''
      }
    }
  }

  const handleAdditionalUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    if (additionalImageIds.length + files.length > maxAdditionalImages) {
      toast.error(`Maximum ${maxAdditionalImages} additional images allowed`)
      return
    }

    try {
      setUploadingAdditional(true)

      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/jpeg' as const,
        initialQuality: 0.8
      }

      for (const file of Array.from(files)) {
        const compressedFile = await imageCompression(file, options)
        
        const imageFile = new File(
          [compressedFile],
          `additional_${Date.now()}.jpg`,
          { type: 'image/jpeg' }
        )

        const uploadedFile = await storage.createFile(
          appwriteConfig.bucket,
          ID.unique(),
          imageFile
        )

        const fileUrl = getImageUrl(uploadedFile.$id)

        if (onAdditionalImageUploaded) {
          onAdditionalImageUploaded(uploadedFile.$id, fileUrl)
        }
      }

      toast.success('Images uploaded successfully!')
    } catch (error: any) {
      console.error('Error uploading images:', error)
      toast.error(error?.message || 'Failed to upload images')
    } finally {
      setUploadingAdditional(false)
      if (additionalInputRef.current) {
        additionalInputRef.current.value = ''
      }
    }
  }

  const handleRemoveImage = async (fileId: string) => {
    if (!confirm('Are you sure you want to remove this image?')) return

    try {
      // Try to delete from storage
      try {
        await storage.deleteFile(appwriteConfig.bucket, fileId)
      } catch (e) {
        console.warn('Could not delete file from storage:', e)
      }

      if (onImageRemoved) {
        onImageRemoved(fileId)
      }

      toast.success('Image removed')
    } catch (error: any) {
      console.error('Error removing image:', error)
      toast.error('Failed to remove image')
    }
  }

  return (
    <Card variant='outlined'>
      <CardContent>
        <Typography variant='h6' className='mb-4'>
          Receipt & Supporting Documents
        </Typography>

        {/* Main Receipt */}
        <Box className='mb-4'>
          <Typography variant='subtitle2' className='mb-2'>
            Primary Receipt
          </Typography>
          
          {receiptImageId ? (
            <Box className='relative inline-block'>
              <img
                src={getImageUrl(receiptImageId)}
                alt='Receipt'
                className='max-w-[200px] max-h-[200px] rounded cursor-pointer'
                onClick={() => setPreviewImage(getImageUrl(receiptImageId))}
              />
              <IconButton
                size='small'
                className='absolute top-0 right-0 bg-red-500 text-white hover:bg-red-600'
                onClick={() => handleRemoveImage(receiptImageId)}
              >
                <i className='ri-close-line text-sm' />
              </IconButton>
            </Box>
          ) : (
            <Box>
              <input
                ref={receiptInputRef}
                type='file'
                accept='image/*'
                onChange={handleReceiptUpload}
                className='hidden'
                id='receipt-upload'
              />
              <label htmlFor='receipt-upload'>
                <Button
                  variant='outlined'
                  component='span'
                  disabled={uploading}
                  startIcon={uploading ? <CircularProgress size={20} /> : <i className='ri-upload-2-line' />}
                >
                  {uploading ? 'Uploading...' : 'Upload Receipt'}
                </Button>
              </label>
            </Box>
          )}
        </Box>

        {/* Additional Images */}
        <Box>
          <Typography variant='subtitle2' className='mb-2'>
            Additional Documents ({additionalImageIds.length}/{maxAdditionalImages})
          </Typography>
          
          {additionalImageIds.length > 0 && (
            <ImageList cols={4} gap={8} className='mb-2'>
              {additionalImageIds.map((imageId, index) => (
                <ImageListItem key={imageId}>
                  <img
                    src={getImageUrl(imageId)}
                    alt={`Document ${index + 1}`}
                    className='rounded cursor-pointer'
                    onClick={() => setPreviewImage(getImageUrl(imageId))}
                    loading='lazy'
                    style={{ height: 100, objectFit: 'cover' }}
                  />
                  <ImageListItemBar
                    actionIcon={
                      <IconButton
                        size='small'
                        className='text-white'
                        onClick={() => handleRemoveImage(imageId)}
                      >
                        <i className='ri-close-line' />
                      </IconButton>
                    }
                    sx={{ background: 'rgba(0,0,0,0.3)' }}
                  />
                </ImageListItem>
              ))}
            </ImageList>
          )}

          {additionalImageIds.length < maxAdditionalImages && (
            <Box>
              <input
                ref={additionalInputRef}
                type='file'
                accept='image/*'
                multiple
                onChange={handleAdditionalUpload}
                className='hidden'
                id='additional-upload'
              />
              <label htmlFor='additional-upload'>
                <Button
                  variant='outlined'
                  size='small'
                  component='span'
                  disabled={uploadingAdditional}
                  startIcon={uploadingAdditional ? <CircularProgress size={16} /> : <i className='ri-add-line' />}
                >
                  {uploadingAdditional ? 'Uploading...' : 'Add More'}
                </Button>
              </label>
            </Box>
          )}
        </Box>
      </CardContent>

      {/* Image Preview Dialog */}
      <Dialog 
        open={!!previewImage} 
        onClose={() => setPreviewImage(null)}
        maxWidth='lg'
      >
        <DialogContent>
          {previewImage && (
            <img
              src={previewImage}
              alt='Preview'
              style={{ maxWidth: '100%', maxHeight: '80vh' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default ReceiptUpload
