'use client'

import { useState, useEffect } from 'react'
import {
  Drawer,
  Typography,
  IconButton,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Grid,
  CircularProgress,
  Autocomplete
} from '@mui/material'
import { toast } from 'react-toastify'

// Component Imports  
import GoogleMapLocationPicker from '@/components/GoogleMapLocationPicker'

// Types
import { PickupLocationType, GPSCoordinates } from '@/types/apps/deliveryTypes'
import { updatePickupLocation } from '@/libs/actions/location.actions'
import { WEST_AFRICAN_COUNTRIES } from '@/data/countries'

interface EditPickupLocationDrawerProps {
  open: boolean
  location: PickupLocationType | null
  onClose: () => void
  onSuccess: () => void
}

const EditPickupLocationDrawer: React.FC<EditPickupLocationDrawerProps> = ({
  open,
  location,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false)
  const [selectedCoordinates, setSelectedCoordinates] = useState<GPSCoordinates | null>(null)
  const [formData, setFormData] = useState({
    locationName: '',
    locationCode: '',
    address: '',
    city: '',
    region: '',
    country: 'Ghana',
    gpsCoordinates: '',
    contactPerson: '',
    contactPhone: '',
    isActive: true
  })
  const [suggestedName, setSuggestedName] = useState('')

  // Populate form when location changes
  useEffect(() => {
    if (open && location) {
      setFormData({
        locationName: location.locationName || '',
        locationCode: location.locationCode || '',
        address: location.address || '',
        city: location.city || '',
        region: location.region || '',
        country: location.country || 'Ghana',
        gpsCoordinates: location.gpsCoordinates || '',
        contactPerson: location.contactPerson || '',
        contactPhone: location.contactPhone || '',
        isActive: location.isActive !== undefined ? location.isActive : true
      })

      // Set initial coordinates if available
      if (location.gpsCoordinates) {
        const [lat, lng] = location.gpsCoordinates.split(',').map(coord => parseFloat(coord.trim()))
        if (!isNaN(lat) && !isNaN(lng)) {
          setSelectedCoordinates({ latitude: lat, longitude: lng })
        }
      }
    }
  }, [open, location])

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev] as any,
          [child]: value
        }
      }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const handleLocationSelect = (coordinates: GPSCoordinates, address?: string, placeDetails?: any) => {
    setSelectedCoordinates(coordinates)
    
    // Auto-generate location code from coordinates
    const locationCode = `PU-${coordinates.latitude.toFixed(4)}-${coordinates.longitude.toFixed(4)}`
    
    // Extract city, region, and country from place details or address components
    let city = ''
    let region = ''
    let country = 'Ghana' // Default to Ghana
    
    if (placeDetails?.address_components) {
      for (const component of placeDetails.address_components) {
        if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
          city = component.long_name
        }
        if (component.types.includes('administrative_area_level_1')) {
          region = component.long_name
        }
        if (component.types.includes('country')) {
          country = component.long_name
        }
      }
    }
    
    setFormData(prev => ({
      ...prev,
      locationCode,
      address: address || prev.address,
      city: city || prev.city,
      region: region || prev.region,
      country: country || prev.country,
      gpsCoordinates: `${coordinates.latitude},${coordinates.longitude}`
    }))
    
    // Set suggested name from place details
    if (placeDetails?.name) {
      setSuggestedName(placeDetails.name)
    }
  }

  const validateForm = (): string | null => {
    if (!formData.locationName?.trim()) return 'Location name is required'
    if (!formData.locationCode?.trim()) return 'Location code is required'
    if (!formData.address?.trim()) return 'Address is required'
    if (!formData.city?.trim()) return 'City is required'
    if (!formData.gpsCoordinates?.trim()) return 'GPS coordinates are required'
    return null
  }

  const handleSubmit = async () => {
    if (!location) return

    const validationError = validateForm()
    if (validationError) {
      toast.error(validationError)
      return
    }

    setLoading(true)
    try {
      await updatePickupLocation({
        $id: location.$id,
        ...formData
      })
      toast.success('Pickup location updated successfully!')
      onSuccess()
      onClose()
    } catch (error) {
      toast.error('Failed to update pickup location. Please try again.')
      console.error('Error updating pickup location:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 600, lg: 800 } }
      }}
    >
      <div className='flex items-center justify-between p-6 border-b'>
        <Typography variant='h5'>Edit Pickup Location</Typography>
        <IconButton onClick={onClose}>
          <i className='ri-close-line text-textSecondary' />
        </IconButton>
      </div>

      <div className='p-6 flex-1 overflow-y-auto'>
        {/* Basic Information */}
        <div className='mb-6'>
          <Typography variant='h6' className='mb-4'>Basic Information</Typography>
          <Grid container spacing={4}>
            <Grid item xs={12}>
              <div className='space-y-2'>
                <TextField
                  fullWidth
                  label='Location Name'
                  value={formData.locationName}
                  onChange={(e) => handleInputChange('locationName', e.target.value)}
                  required
                />
                {suggestedName && (
                  <div className='flex items-center gap-2 p-2 bg-blue-50 rounded border'>
                    <Typography variant='body2' className='text-blue-700'>
                      Suggested from Google Maps: <strong>{suggestedName}</strong>
                    </Typography>
                    <Button 
                      size='small' 
                      onClick={() => handleInputChange('locationName', suggestedName)}
                    >
                      Use This
                    </Button>
                  </div>
                )}
              </div>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label='Location Code'
                value={formData.locationCode}
                onChange={(e) => handleInputChange('locationCode', e.target.value)}
                required
                placeholder='Auto-generated from coordinates'
              />
            </Grid>
          </Grid>
        </div>

        {/* Location & Address */}
        <div className='mb-6'>
          <Typography variant='h6' className='mb-4'>Location & Address</Typography>
          
          {/* Google Maps */}
          <div className='mb-4'>
            <GoogleMapLocationPicker
              onLocationSelect={handleLocationSelect}
              initialCoordinates={selectedCoordinates || undefined}
              height={300}
              showSearchBox={true}
              showCurrentLocationButton={true}
            />
          </div>

          <Grid container spacing={4}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label='Address'
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                required
                multiline
                rows={2}
                placeholder='Full address will be auto-filled from map selection'
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='City'
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Region/State'
                value={formData.region}
                onChange={(e) => handleInputChange('region', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                freeSolo
                options={WEST_AFRICAN_COUNTRIES}
                value={formData.country}
                onChange={(event, newValue) => {
                  handleInputChange('country', newValue || 'Ghana')
                }}
                onInputChange={(event, newInputValue) => {
                  handleInputChange('country', newInputValue || 'Ghana')
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    label='Country'
                    required
                    placeholder='Select or type country name'
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label='GPS Coordinates'
                value={formData.gpsCoordinates}
                disabled
                placeholder='Coordinates will be set when you select location on map'
                helperText='This field is automatically populated from map selection'
              />
            </Grid>
          </Grid>
        </div>

        {/* Contact Information */}
        <div className='mb-6'>
          <Typography variant='h6' className='mb-4'>Contact Information</Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Contact Person'
                value={formData.contactPerson}
                onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                placeholder='Person responsible for this pickup location'
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Phone Number'
                value={formData.contactPhone}
                onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                placeholder='Contact phone number'
              />
            </Grid>
          </Grid>
        </div>

        {/* Status */}
        <div className='mb-6'>
          <Typography variant='h6' className='mb-4'>Status</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
              />
            }
            label='Active Location'
          />
        </div>
      </div>

      {/* Actions */}
      <div className='flex items-center justify-end gap-4 p-6 border-t'>
        <Button variant='outlined' onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant='contained'
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <i className='ri-save-line' />}
        >
          {loading ? 'Updating...' : 'Update Location'}
        </Button>
      </div>
    </Drawer>
  )
}

export default EditPickupLocationDrawer
