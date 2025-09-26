'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Drawer from '@mui/material/Drawer'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Badge from '@mui/material/Badge'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { Theme } from '@mui/material/styles'

// Type Imports
import { VehicleType, VehicleStatusType } from '@/types/apps/deliveryTypes'
import { FleetViewState } from './index'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'

interface FleetSidebarProps {
  vehicles: VehicleType[]
  statistics: any
  viewState: FleetViewState
  onViewChange: (view: FleetViewState['view']) => void
  onFilterChange: (filters: FleetViewState['filters']) => void
  onVehicleSelect: (vehicleId: string) => void
  selectedVehicle?: VehicleType
  open: boolean
  onClose: () => void
}

const statusColors = {
  active: 'success',
  available: 'info',
  maintenance: 'warning',
  unavailable: 'error',
  retired: 'secondary'
} as const

const FleetSidebar = ({
  vehicles,
  statistics,
  viewState,
  onViewChange,
  onFilterChange,
  onVehicleSelect,
  selectedVehicle,
  open,
  onClose
}: FleetSidebarProps) => {
  // States
  const [searchQuery, setSearchQuery] = useState('')

  // Hooks
  const isBelowLgScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('lg'))

  // Filter vehicles based on search and filters
  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = !searchQuery || 
      vehicle.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = !viewState.filters.status || 
      vehicle.status === viewState.filters.status
    
    const matchesType = !viewState.filters.type || 
      vehicle.type === viewState.filters.type

    return matchesSearch && matchesStatus && matchesType
  })

  // Handle filter changes
  const handleStatusFilter = (status: string) => {
    onFilterChange({
      ...viewState.filters,
      status: status === 'all' ? undefined : status as VehicleStatusType
    })
  }

  const handleTypeFilter = (type: string) => {
    onFilterChange({
      ...viewState.filters,
      type: type === 'all' ? undefined : type
    })
  }

  // Sidebar content
  const sidebarContent = (
    <div className='p-6 flex flex-col h-full'>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <Typography variant='h6'>Fleet Control</Typography>
        {isBelowLgScreen && (
          <IconButton onClick={onClose}>
            <i className='ri-close-line' />
          </IconButton>
        )}
      </div>

      {/* Quick Stats */}
      {statistics && (
        <div className='mb-6'>
          <Typography variant='subtitle2' className='mb-3'>Quick Stats</Typography>
          <div className='grid grid-cols-2 gap-2'>
            <div className='text-center p-3 bg-primary/10 rounded'>
              <Typography variant='h6' color='primary'>{statistics.active}</Typography>
              <Typography variant='caption'>Active</Typography>
            </div>
            <div className='text-center p-3 bg-info/10 rounded'>
              <Typography variant='h6' color='info.main'>{statistics.available}</Typography>
              <Typography variant='caption'>Available</Typography>
            </div>
            <div className='text-center p-3 bg-warning/10 rounded'>
              <Typography variant='h6' color='warning.main'>{statistics.maintenance}</Typography>
              <Typography variant='caption'>Maintenance</Typography>
            </div>
            <div className='text-center p-3 bg-error/10 rounded'>
              <Typography variant='h6' color='error.main'>{statistics.unavailable}</Typography>
              <Typography variant='caption'>Unavailable</Typography>
            </div>
          </div>
        </div>
      )}

      <Divider className='mb-6' />

      {/* Filters */}
      <div className='mb-6'>
        <Typography variant='subtitle2' className='mb-3'>Filters</Typography>
        
        <div className='space-y-4'>
          {/* Search */}
          <TextField
            fullWidth
            size='small'
            placeholder='Search vehicles...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <i className='ri-search-line text-textSecondary mr-2' />
            }}
          />

          {/* Status Filter */}
          <FormControl fullWidth size='small'>
            <InputLabel>Status</InputLabel>
            <Select
              value={viewState.filters.status || 'all'}
              label='Status'
              onChange={(e) => handleStatusFilter(e.target.value)}
            >
              <MenuItem value='all'>All Status</MenuItem>
              <MenuItem value='active'>Active</MenuItem>
              <MenuItem value='available'>Available</MenuItem>
              <MenuItem value='maintenance'>Maintenance</MenuItem>
              <MenuItem value='unavailable'>Unavailable</MenuItem>
            </Select>
          </FormControl>

          {/* Type Filter */}
          <FormControl fullWidth size='small'>
            <InputLabel>Type</InputLabel>
            <Select
              value={viewState.filters.type || 'all'}
              label='Type'
              onChange={(e) => handleTypeFilter(e.target.value)}
            >
              <MenuItem value='all'>All Types</MenuItem>
              <MenuItem value='truck'>Truck</MenuItem>
              <MenuItem value='van'>Van</MenuItem>
              <MenuItem value='motorcycle'>Motorcycle</MenuItem>
              <MenuItem value='bicycle'>Bicycle</MenuItem>
            </Select>
          </FormControl>
        </div>
      </div>

      <Divider className='mb-4' />

      {/* Vehicle List */}
      <div className='flex-1 overflow-hidden'>
        <div className='flex items-center justify-between mb-3'>
          <Typography variant='subtitle2'>
            Vehicles ({filteredVehicles.length})
          </Typography>
        </div>

        <div className='overflow-y-auto h-full'>
          <List disablePadding>
            {filteredVehicles.map((vehicle) => (
              <ListItem 
                key={vehicle.$id} 
                disablePadding
                className={selectedVehicle?.$id === vehicle.$id ? 'bg-primary/5' : ''}
              >
                <ListItemButton
                  onClick={() => onVehicleSelect(vehicle.$id)}
                  className='rounded'
                >
                  <ListItemAvatar>
                    <Badge
                      badgeContent={
                        <div className={`w-3 h-3 rounded-full bg-${statusColors[vehicle.status]}`} />
                      }
                      overlap='circular'
                      anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right',
                      }}
                    >
                      <CustomAvatar size={40}>
                        {vehicle.type === 'truck' && <i className='ri-truck-line' />}
                        {vehicle.type === 'van' && <i className='ri-car-line' />}
                        {vehicle.type === 'motorcycle' && <i className='ri-motorbike-line' />}
                        {vehicle.type === 'bicycle' && <i className='ri-bike-line' />}
                      </CustomAvatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <div className='flex items-center justify-between'>
                        <Typography variant='body2' className='font-medium'>
                          {vehicle.licensePlate}
                        </Typography>
                        <Chip
                          size='small'
                          variant='tonal'
                          color={statusColors[vehicle.status] as any}
                          label={vehicle.status}
                        />
                      </div>
                    }
                    secondary={
                      <div>
                        <Typography variant='caption' color='text.secondary'>
                          {vehicle.model} • {vehicle.type}
                        </Typography>
                        {vehicle.driverName && (
                          <Typography variant='caption' color='text.secondary' className='block'>
                            Driver: {vehicle.driverName}
                          </Typography>
                        )}
                        {vehicle.location && (
                          <Typography variant='caption' color='text.secondary' className='block'>
                            📍 {vehicle.location}
                          </Typography>
                        )}
                      </div>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
            {filteredVehicles.length === 0 && (
              <ListItem>
                <ListItemText
                  primary={
                    <Typography color='text.secondary' className='text-center'>
                      No vehicles found
                    </Typography>
                  }
                />
              </ListItem>
            )}
          </List>
        </div>
      </div>
    </div>
  )

  if (isBelowLgScreen) {
    return (
      <Drawer
        variant='temporary'
        anchor='left'
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            width: 300,
            maxWidth: '100vw'
          }
        }}
      >
        {sidebarContent}
      </Drawer>
    )
  }

  return (
    <div className='w-80 border-r bg-backgroundPaper h-full'>
      {sidebarContent}
    </div>
  )
}

export default FleetSidebar