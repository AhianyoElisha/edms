'use client'

// React Imports
import { useState, useEffect, useCallback } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { Theme } from '@mui/material/styles'
import Backdrop from '@mui/material/Backdrop'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

// Third-party Imports
import { toast } from 'react-toastify'

// Type Imports
import { VehicleType, VehicleStatusType } from '@/types/apps/deliveryTypes'

// Component Imports
import CustomIconButton from '@core/components/mui/IconButton'

// Action Imports
import { getAllVehicles, getVehicleStatistics, VehicleFilters } from '@/libs/actions/vehicle.actions'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'

export interface FleetViewState {
  selectedVehicleId?: string
  view: 'overview' | 'map' | 'analytics'
  filters: VehicleFilters
}

export interface FleetData {
  vehicles: VehicleType[]
  statistics: any
  loading: boolean
  error: string | null
}

const Fleet = () => {
  // States
  const [fleetData, setFleetData] = useState<FleetData>({
    vehicles: [],
    statistics: null,
    loading: true,
    error: null
  })
  
  const [viewState, setViewState] = useState<FleetViewState>({
    view: 'overview',
    filters: {}
  })
  
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Hooks
  const { settings } = useSettings()
  const isBelowLgScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('lg'))

  // Fetch fleet data
  const fetchFleetData = useCallback(async () => {
    try {
      setFleetData(prev => ({ ...prev, loading: true, error: null }))
      
      const [vehicles, statistics] = await Promise.all([
        getAllVehicles(viewState.filters),
        getVehicleStatistics()
      ])
      
      setFleetData({
        vehicles,
        statistics,
        loading: false,
        error: null
      })
    } catch (error) {
      console.error('Error fetching fleet data:', error)
      const errorMessage = 'Failed to load fleet data'
      setFleetData(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
      toast.error(errorMessage)
    }
  }, [viewState.filters])

  // Load data on component mount and when filters change
  useEffect(() => {
    fetchFleetData()
  }, [fetchFleetData])

  // Handle view changes
  const handleViewChange = (view: FleetViewState['view']) => {
    setViewState(prev => ({ ...prev, view }))
  }

  // Handle filter changes
  const handleFilterChange = (filters: FleetViewState['filters']) => {
    setViewState(prev => ({ ...prev, filters }))
  }

  // Handle vehicle selection
  const handleVehicleSelect = (vehicleId: string) => {
    setViewState(prev => ({ ...prev, selectedVehicleId: vehicleId }))
  }

  // Handle sidebar toggle
  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen)
  }

  // Get selected vehicle
  const selectedVehicle = fleetData.vehicles.find(v => v.$id === viewState.selectedVehicleId)

  // Render main content based on view
  const renderMainContent = () => {
    if (fleetData.loading) {
      return (
        <Card className='h-full flex items-center justify-center'>
          <CardContent>
            <div className='flex flex-col items-center gap-4'>
              <CircularProgress />
              <Typography>Loading fleet data...</Typography>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (fleetData.error) {
      return (
        <Card className='h-full'>
          <CardContent>
            <Alert severity='error' className='mb-4'>
              {fleetData.error}
            </Alert>
            <Button variant='contained' onClick={fetchFleetData}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card>
        <CardContent>
          <Typography variant='h6' className='mb-4'>
            Fleet {viewState.view.charAt(0).toUpperCase() + viewState.view.slice(1)}
          </Typography>
          <Typography>
            {fleetData.vehicles.length} vehicles found
          </Typography>
          {selectedVehicle && (
            <Alert severity='info' className='mt-4'>
              Selected vehicle: {selectedVehicle.licensePlate}
            </Alert>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className='flex flex-col min-h-0'>
      {/* Header */}
      <div className='flex items-center justify-between p-6 border-b'>
        <Typography variant='h4'>
          Fleet Management
        </Typography>
        
        {/* View Toggle Buttons */}
        <div className='flex gap-2'>
          <Button
            variant={viewState.view === 'overview' ? 'contained' : 'outlined'}
            size='small'
            onClick={() => handleViewChange('overview')}
            startIcon={<i className='ri-dashboard-line' />}
          >
            Overview
          </Button>
          <Button
            variant={viewState.view === 'map' ? 'contained' : 'outlined'}
            size='small'
            onClick={() => handleViewChange('map')}
            startIcon={<i className='ri-map-pin-line' />}
          >
            Map
          </Button>
          <Button
            variant={viewState.view === 'analytics' ? 'contained' : 'outlined'}
            size='small'
            onClick={() => handleViewChange('analytics')}
            startIcon={<i className='ri-bar-chart-line' />}
          >
            Analytics
          </Button>
        </div>
      </div>

      {/* Fleet Statistics */}
      {fleetData.statistics && (
        <div className='p-6 border-b'>
          <Grid container spacing={4}>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent className='text-center'>
                  <Typography variant='h5' color='primary'>
                    {fleetData.statistics.total}
                  </Typography>
                  <Typography variant='body2'>Total</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent className='text-center'>
                  <Typography variant='h5' color='success.main'>
                    {fleetData.statistics.active}
                  </Typography>
                  <Typography variant='body2'>Active</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent className='text-center'>
                  <Typography variant='h5' color='info.main'>
                    {fleetData.statistics.available}
                  </Typography>
                  <Typography variant='body2'>Available</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent className='text-center'>
                  <Typography variant='h5' color='warning.main'>
                    {fleetData.statistics.maintenance}
                  </Typography>
                  <Typography variant='body2'>Maintenance</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </div>
      )}

      {/* Main Content Area */}
      <div className='flex-1 p-6'>
        {renderMainContent()}
      </div>
    </div>
  )
}

export default Fleet