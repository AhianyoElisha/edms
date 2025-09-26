'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'

// Type Imports
import { VehicleStatusType } from '@/types/apps/deliveryTypes'

interface VehicleTableFiltersProps {
  onFiltersChange: (filters: VehicleFilters) => void
}

interface VehicleFilters {
  status?: VehicleStatusType
  type?: string
  search?: string
  driverAssigned?: boolean
}

const VehicleTableFilters = ({ onFiltersChange }: VehicleTableFiltersProps) => {
  // States
  const [filters, setFilters] = useState<VehicleFilters>({})

  // Handle filter change
  const handleFilterChange = (key: keyof VehicleFilters, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({})
    onFiltersChange({})
  }

  // Check if any filters are active
  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '')

  return (
    <Card>
      <CardHeader 
        title='Filters' 
        action={
          hasActiveFilters && (
            <Button
              size='small'
              variant='outlined'
              onClick={clearFilters}
              startIcon={<i className='ri-close-line' />}
            >
              Clear All
            </Button>
          )
        }
      />
      <CardContent>
        <Grid container spacing={4}>
          {/* Search */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label='Search'
              placeholder='License plate, model...'
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: <i className='ri-search-line text-textSecondary mr-2' />
              }}
            />
          </Grid>

          {/* Status Filter */}
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status || ''}
                label='Status'
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
              >
                <MenuItem value=''>All Status</MenuItem>
                <MenuItem value='active'>Active</MenuItem>
                <MenuItem value='available'>Available</MenuItem>
                <MenuItem value='maintenance'>Maintenance</MenuItem>
                <MenuItem value='unavailable'>Unavailable</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Vehicle Type Filter */}
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Vehicle Type</InputLabel>
              <Select
                value={filters.type || ''}
                label='Vehicle Type'
                onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
              >
                <MenuItem value=''>All Types</MenuItem>
                <MenuItem value='truck'>Truck</MenuItem>
                <MenuItem value='van'>Van</MenuItem>
                <MenuItem value='motorcycle'>Motorcycle</MenuItem>
                <MenuItem value='bicycle'>Bicycle</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Driver Assignment Filter */}
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Driver</InputLabel>
              <Select
                value={filters.driverAssigned !== undefined ? (filters.driverAssigned ? 'assigned' : 'unassigned') : ''}
                label='Driver'
                onChange={(e) => {
                  const value = e.target.value
                  if (value === 'assigned') {
                    handleFilterChange('driverAssigned', true)
                  } else if (value === 'unassigned') {
                    handleFilterChange('driverAssigned', false)
                  } else {
                    handleFilterChange('driverAssigned', undefined)
                  }
                }}
              >
                <MenuItem value=''>All</MenuItem>
                <MenuItem value='assigned'>Assigned</MenuItem>
                <MenuItem value='unassigned'>Unassigned</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className='flex flex-wrap gap-2 mt-4'>
            {filters.status && (
              <Chip
                label={`Status: ${filters.status}`}
                onDelete={() => handleFilterChange('status', undefined)}
                color='primary'
                variant='outlined'
                size='small'
              />
            )}
            {filters.type && (
              <Chip
                label={`Type: ${filters.type}`}
                onDelete={() => handleFilterChange('type', undefined)}
                color='primary'
                variant='outlined'
                size='small'
              />
            )}
            {filters.search && (
              <Chip
                label={`Search: ${filters.search}`}
                onDelete={() => handleFilterChange('search', undefined)}
                color='primary'
                variant='outlined'
                size='small'
              />
            )}
            {filters.driverAssigned !== undefined && (
              <Chip
                label={`Driver: ${filters.driverAssigned ? 'Assigned' : 'Unassigned'}`}
                onDelete={() => handleFilterChange('driverAssigned', undefined)}
                color='primary'
                variant='outlined'
                size='small'
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default VehicleTableFilters
export type { VehicleFilters }