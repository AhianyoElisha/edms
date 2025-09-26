'use client'

import { useState, useMemo } from 'react'
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  Grid,
  Button,
  Typography
} from '@mui/material'
import { PickupLocationType, DropoffLocationType } from '@/types/apps/deliveryTypes'

export interface LocationFilters {
  search: string
  isActive?: boolean
  city?: string
}

export interface LocationTableFiltersProps {
  filters: LocationFilters
  onFiltersChange: (filters: LocationFilters) => void
  locations: (PickupLocationType | DropoffLocationType)[]
  locationType: 'pickup' | 'dropoff'
}

const LocationTableFilters: React.FC<LocationTableFiltersProps> = ({
  filters,
  onFiltersChange,
  locations,
  locationType
}) => {
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  // Get unique values for dropdowns
  const uniqueCities = useMemo(() => {
    const cities = locations.map(location => location.city)
    return [...new Set(cities)].filter(Boolean).sort()
  }, [locations])

  // Delivery zones are no longer in the simplified schema
  const uniqueDeliveryZones = useMemo(() => {
    return [] // Removed since deliveryZone is not in the simplified schema
  }, [locations, locationType])

  // Handle filter changes
  const handleFilterChange = (key: string, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value === '' ? undefined : value
    })
  }

  // Clear all filters
  const resetFilters = () => {
    onFiltersChange({
      search: '',
      isActive: undefined,
      city: ''
    })
  }

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.search) count++
    if (filters.isActive !== undefined) count++
    if (filters.city) count++
    return count
  }, [filters])

  const isPickupLocation = locationType === 'pickup'
  const isDropoffLocation = locationType === 'dropoff'

  return (
    <>
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <div className='flex items-center gap-2'>
          <Typography variant='h5'>Search</Typography>
          <TextField
            placeholder={`Search ${locationType} locations...`}
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className='max-sm:is-full'
            InputProps={{
              startAdornment: <i className='ri-search-line' />
            }}
          />
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outlined'
            startIcon={<i className='ri-filter-line' />}
            endIcon={filtersExpanded ? <i className='ri-arrow-up-s-line' /> : <i className='ri-arrow-down-s-line' />}
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            color={activeFilterCount > 0 ? 'primary' : 'inherit'}
          >
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Button>
          {activeFilterCount > 0 && (
            <Button
              size='small'
              startIcon={<i className='ri-close-line' />}
              onClick={resetFilters}
              color='secondary'
            >
              Clear All
            </Button>
          )}
          <Button
            variant='outlined'
            startIcon={<i className='ri-upload-2-line' />}
            className='max-sm:is-full'
          >
            Export
          </Button>
        </div>
      </div>

      {filtersExpanded && (
        <div className='mt-4 p-4 border rounded'>
          <Typography variant='subtitle2' className='mb-4'>
            Filter Options
          </Typography>
          
          <Grid container spacing={2}>
            {/* Status Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.isActive ?? ''}
                  onChange={(e) => handleFilterChange('isActive', e.target.value)}
                  input={<OutlinedInput label="Status" />}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value={"true"}>Active</MenuItem>
                  <MenuItem value={"false"}>Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* City Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>City</InputLabel>
                <Select
                  value={filters.city}
                  onChange={(e) => handleFilterChange('city', e.target.value)}
                  input={<OutlinedInput label="City" />}
                >
                  <MenuItem value="">All Cities</MenuItem>
                  {uniqueCities.map((city) => (
                    <MenuItem key={city} value={city}>
                      {city}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Additional filters can be added here for future schema updates */}
          </Grid>

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <div className='mt-4'>
            <Typography variant='body2' color='text.secondary' className='mb-2'>
              Active Filters:
            </Typography>
            <div className='flex gap-2 flex-wrap'>
              {filters.search && (
                <Chip
                  label={`Search: "${filters.search}"`}
                  onDelete={() => handleFilterChange('search', '')}
                  size="small"
                  variant="outlined"
                />
              )}
              {filters.isActive !== undefined && (
                <Chip
                  label={`Status: ${filters.isActive ? 'Active' : 'Inactive'}`}
                  onDelete={() => handleFilterChange('isActive', undefined)}
                  size="small"
                  variant="outlined"
                />
              )}
              {filters.city && (
                <Chip
                  label={`City: ${filters.city}`}
                  onDelete={() => handleFilterChange('city', '')}
                  size="small"
                  variant="outlined"
                />
              )}
              {/* Additional filter chips can be added here */}
            </div>
          </div>
        )}
      </div>
      )}
    </>
  )
}

export default LocationTableFilters