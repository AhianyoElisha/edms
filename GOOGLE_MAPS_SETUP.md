# Google Maps Integration Setup

## Environment Variables Required

Add the following to your `.env.local` file:

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

## Getting Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Create credentials (API Key)
5. Restrict the API key to your domain for security

## Features Enabled

- Interactive map with click-to-select location
- Search locations using Google Places API
- Current location detection
- Drag-and-drop marker positioning
- Reverse geocoding for address lookup
- GPS coordinate display and validation

## Usage in Location Management

The GoogleMapLocationPicker component is integrated into:
- Pickup location forms
- Dropoff location forms
- Location editing interfaces

## Proximity Features

The system includes:
- 100-meter radius validation for drivers
- Distance calculations using Haversine formula
- Nearby location discovery
- GPS-based location verification