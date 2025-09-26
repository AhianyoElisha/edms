'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Box,
  Card,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material'
import { GPSCoordinates } from '@/types/apps/deliveryTypes'

// Define Google Maps types to avoid TypeScript errors
declare global {
  interface Window {
    google: any
    initMap: () => void
  }
}

interface GoogleMapLocationPickerProps {
  onLocationSelect: (coordinates: GPSCoordinates, address?: string, placeDetails?: any) => void
  initialCoordinates?: GPSCoordinates
  height?: number | string
  zoom?: number
  showSearchBox?: boolean
  showCurrentLocationButton?: boolean
  disabled?: boolean
}

const GoogleMapLocationPicker: React.FC<GoogleMapLocationPickerProps> = ({
  onLocationSelect,
  initialCoordinates,
  height = 400,
  zoom = 15,
  showSearchBox = true,
  showCurrentLocationButton = true,
  disabled = false
}) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const searchBoxRef = useRef<any>(null)
  const autocompleteRef = useRef<any>(null)

  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<{
    coordinates: GPSCoordinates
    address?: string
    placeDetails?: any
  } | null>(null)

  // Default coordinates (you can change this to your preferred default location)
  const defaultCoordinates: GPSCoordinates = {
    latitude: -1.2921, // Nairobi, Kenya coordinates
    longitude: 36.8219
  }

  const coordinates = initialCoordinates || selectedLocation?.coordinates || defaultCoordinates

  // Load Google Maps API
  const loadGoogleMaps = useCallback(() => {
    if (window.google) {
      setIsLoaded(true)
      setIsLoading(false)
      return
    }

    // Check API key availability
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      setError('Google Maps API key is not configured. Please check your environment variables.')
      setIsLoading(false)
      return
    }

    // Check if script is already loading
    const existingScript = document.getElementById('google-maps-script')
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        setIsLoaded(true)
        setIsLoading(false)
      })
      return
    }

    // Create script element
    const script = document.createElement('script')
    script.id = 'google-maps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`
    script.async = true
    script.defer = true

    script.onload = () => {
      setIsLoaded(true)
      setIsLoading(false)
    }

    script.onerror = () => {
      setError('Failed to load Google Maps. Please check your API key and network connection.')
      setIsLoading(false)
    }

    document.head.appendChild(script)
  }, [])

  // Initialize map
  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google || !isLoaded) return

    try {
      const mapOptions = {
        center: { lat: coordinates.latitude, lng: coordinates.longitude },
        zoom: zoom,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        clickableIcons: false,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: true
      }

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, mapOptions)

      // Create marker
      markerRef.current = new window.google.maps.Marker({
        position: { lat: coordinates.latitude, lng: coordinates.longitude },
        map: mapInstanceRef.current,
        draggable: !disabled,
        title: 'Selected Location'
      })

      // Add click listener to map
      if (!disabled) {
        mapInstanceRef.current.addListener('click', (event: any) => {
          const newCoordinates: GPSCoordinates = {
            latitude: event.latLng.lat(),
            longitude: event.latLng.lng()
          }
          updateLocationWithPlaceDetails(newCoordinates)
        })

        // Add drag listener to marker
        markerRef.current.addListener('dragend', (event: any) => {
          const newCoordinates: GPSCoordinates = {
            latitude: event.latLng.lat(),
            longitude: event.latLng.lng()
          }
          updateLocationWithPlaceDetails(newCoordinates)
        })
      }

      // Initialize autocomplete for search
      if (showSearchBox) {
        const searchInput = document.getElementById('location-search-input') as HTMLInputElement
        if (searchInput) {
          autocompleteRef.current = new window.google.maps.places.Autocomplete(searchInput)
          autocompleteRef.current.bindTo('bounds', mapInstanceRef.current)

          autocompleteRef.current.addListener('place_changed', () => {
            const place = autocompleteRef.current.getPlace()
            if (place?.geometry?.location) {
              const newCoordinates: GPSCoordinates = {
                latitude: place.geometry.location.lat(),
                longitude: place.geometry.location.lng()
              }
              updateLocation(newCoordinates, place.formatted_address, place)
              setSearchValue(place.formatted_address || '')
            }
          })
        }
      }
    } catch (err) {
      setError('Failed to initialize map')
      console.error('Map initialization error:', err)
    }
  }, [coordinates, zoom, disabled, showSearchBox])

  // Update location with place details from Places API
  const updateLocationWithPlaceDetails = useCallback((newCoordinates: GPSCoordinates) => {
    if (markerRef.current) {
      const position = { lat: newCoordinates.latitude, lng: newCoordinates.longitude }
      markerRef.current.setPosition(position)
      mapInstanceRef.current?.setCenter(position)
    }

    // Use Places Service to get detailed information about the location
    if (window.google && mapInstanceRef.current) {
      const service = new window.google.maps.places.PlacesService(mapInstanceRef.current)
      const request = {
        location: { lat: newCoordinates.latitude, lng: newCoordinates.longitude },
        radius: 50, // 50 meter radius
        type: ['establishment', 'point_of_interest']
      }

      service.nearbySearch(request, (results: any[], status: any) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results?.length > 0) {
          const place = results[0]
          setSelectedLocation({ coordinates: newCoordinates, address: place.vicinity, placeDetails: place })
          onLocationSelect(newCoordinates, place.vicinity, place)
        } else {
          // Fallback to geocoding if no places found
          updateLocation(newCoordinates)
        }
      })
    } else {
      updateLocation(newCoordinates)
    }
  }, [onLocationSelect])

  // Update location
  const updateLocation = useCallback((newCoordinates: GPSCoordinates, address?: string, placeDetails?: any) => {
    if (markerRef.current) {
      const position = { lat: newCoordinates.latitude, lng: newCoordinates.longitude }
      markerRef.current.setPosition(position)
      mapInstanceRef.current?.setCenter(position)
    }

    setSelectedLocation({ coordinates: newCoordinates, address, placeDetails })
    onLocationSelect(newCoordinates, address, placeDetails)

    // Reverse geocode to get address if not provided
    if (!address && window.google) {
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode(
        { location: { lat: newCoordinates.latitude, lng: newCoordinates.longitude } },
        (results: any[], status: any) => {
          if (status === 'OK' && results[0]) {
            setSelectedLocation({ coordinates: newCoordinates, address: results[0].formatted_address, placeDetails })
            onLocationSelect(newCoordinates, results[0].formatted_address, placeDetails)
          }
        }
      )
    }
  }, [onLocationSelect])

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      return
    }

    setIsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newCoordinates: GPSCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }
        updateLocation(newCoordinates)
        setIsLoading(false)
      },
      (error) => {
        setError('Unable to get your current location')
        setIsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 600000 }
    )
  }, [updateLocation])

  // Search for location
  const handleSearchSubmit = () => {
    if (!searchValue.trim() || !window.google) return

    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ address: searchValue }, (results: any[], status: any) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location
        const newCoordinates: GPSCoordinates = {
          latitude: location.lat(),
          longitude: location.lng()
        }
        updateLocation(newCoordinates, results[0].formatted_address)
      } else {
        setError('Location not found')
      }
    })
  }

  // Clear search
  const handleClearSearch = () => {
    setSearchValue('')
  }

  // Load Google Maps on component mount
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      setError('Google Maps API key is not configured')
      setIsLoading(false)
      return
    }

    loadGoogleMaps()
  }, [loadGoogleMaps])

  // Initialize map when loaded
  useEffect(() => {
    if (isLoaded) {
      initializeMap()
    }
  }, [isLoaded, initializeMap])

  // Update marker position when coordinates change externally
  useEffect(() => {
    if (markerRef.current && initialCoordinates) {
      const position = { lat: initialCoordinates.latitude, lng: initialCoordinates.longitude }
      markerRef.current.setPosition(position)
      mapInstanceRef.current?.setCenter(position)
    }
  }, [initialCoordinates])

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <Card className='border'>
        <div className='p-4'>
          <Alert severity='warning'>
            Google Maps API key is not configured. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment variables.
          </Alert>
        </div>
      </Card>
    )
  }

  return (
    <div>
      {/* Search Box */}
      {showSearchBox && !disabled && (
        <div className='mb-4'>
          <div className='flex gap-2'>
            <TextField
              id="location-search-input"
              fullWidth
              size='small'
              placeholder="Search for a location..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
              InputProps={{
                startAdornment: <i className='ri-search-line mr-2 text-textSecondary' />,
                endAdornment: searchValue && (
                  <IconButton size='small' onClick={handleClearSearch}>
                    <i className='ri-close-line' />
                  </IconButton>
                )
              }}
            />
            {showCurrentLocationButton && (
              <Tooltip title="Use current location">
                <Button
                  variant='outlined'
                  onClick={getCurrentLocation}
                  disabled={isLoading}
                  className='min-w-auto px-4'
                >
                  {isLoading ? <CircularProgress size={20} /> : <i className='ri-map-pin-user-line' />}
                </Button>
              </Tooltip>
            )}
          </div>
        </div>
      )}

      {/* Map Container */}
      <Card className='border'>
        <div className='relative'>
          <div
            ref={mapRef}
            style={{
              height: typeof height === 'number' ? `${height}px` : height,
              width: '100%',
              borderRadius: '4px'
            }}
          />
          
          {/* Loading Overlay */}
          {isLoading && (
            <div className='absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 rounded'>
              <div className='text-center'>
                <CircularProgress />
                <Typography variant='body2' className='mt-2'>
                  Loading map...
                </Typography>
              </div>
            </div>
          )}

          {/* Error Overlay */}
          {error && (
            <div className='absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded'>
              <Alert 
                severity='error' 
                action={
                  <Button size='small' onClick={() => { setError(null); loadGoogleMaps() }}>
                    Retry
                  </Button>
                }
              >
                {error}
              </Alert>
            </div>
          )}
        </div>
      </Card>

      {/* Selected Location Info */}
      {selectedLocation && (
        <div className='mt-4'>
          <Typography variant='subtitle2' className='mb-2'>
            Selected Location:
          </Typography>
          <div className='space-y-2'>
            <div className='flex gap-2 flex-wrap items-center'>
              <Chip
                icon={<i className='ri-map-pin-line' />}
                label={`${selectedLocation.coordinates.latitude.toFixed(6)}, ${selectedLocation.coordinates.longitude.toFixed(6)}`}
                variant='outlined'
                size='small'
              />
            </div>
            
            {selectedLocation.placeDetails?.name && (
              <div className='p-3 bg-blue-50 rounded border'>
                <Typography variant='body2' className='font-semibold text-blue-900'>
                  {selectedLocation.placeDetails.name}
                </Typography>
                {selectedLocation.placeDetails.types && (
                  <Typography variant='caption' className='text-blue-700'>
                    {selectedLocation.placeDetails.types.slice(0, 3).join(', ')}
                  </Typography>
                )}
              </div>
            )}
            
            {selectedLocation.address && (
              <Typography variant='body2' color='text.secondary'>
                📍 {selectedLocation.address}
              </Typography>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      {!disabled && (
        <div className='mt-4'>
          <Typography variant='body2' color='text.secondary'>
            Click on the map or drag the marker to select a location. Use the search box to find specific addresses.
          </Typography>
        </div>
      )}
    </div>
  )
}

export default GoogleMapLocationPicker