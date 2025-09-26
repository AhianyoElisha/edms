'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Button from '@mui/material/Button'

// Type Imports
import { VehicleType } from '@/types/apps/deliveryTypes'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'

interface FleetOverviewProps {
  vehicles: VehicleType[]
  statistics: any
  onVehicleSelect: (vehicleId: string) => void
  selectedVehicle?: VehicleType
}

const statusColors = {
  active: 'success',
  available: 'info', 
  maintenance: 'warning',
  unavailable: 'error',
  retired: 'secondary'
} as const

const FleetOverview = ({ 
  vehicles, 
  statistics, 
  onVehicleSelect, 
  selectedVehicle 
}: FleetOverviewProps) => {
  // Group vehicles by status for quick overview
  const vehiclesByStatus = vehicles.reduce((acc, vehicle) => {
    if (!acc[vehicle.status]) {
      acc[vehicle.status] = []
    }
    acc[vehicle.status].push(vehicle)
    return acc
  }, {} as Record<string, VehicleType[]>)

  // Get fuel/battery levels for monitoring
  const lowLevelVehicles = vehicles.filter(vehicle => {
    const level = vehicle.type === 'bicycle' || vehicle.type === 'motorcycle' 
      ? vehicle.batteryLevel 
      : vehicle.fuelLevel
    return level && level < 30
  })

  // Vehicles needing maintenance
  const maintenanceNeeded = vehicles.filter(vehicle => {
    if (!vehicle.nextMaintenance) return false
    const nextDate = new Date(vehicle.nextMaintenance)
    const today = new Date()
    const daysUntil = Math.floor((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntil <= 7
  })

  return (
    <Grid container spacing={4}>
      {/* Vehicle Status Overview */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardHeader title='Vehicle Status Overview' />
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Vehicle</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Driver</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Fuel/Battery</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vehicles.slice(0, 10).map((vehicle) => {
                    const level = vehicle.type === 'bicycle' || vehicle.type === 'motorcycle' 
                      ? vehicle.batteryLevel 
                      : vehicle.fuelLevel
                    
                    return (
                      <TableRow 
                        key={vehicle.$id}
                        className={selectedVehicle?.$id === vehicle.$id ? 'bg-primary/5' : ''}
                      >
                        <TableCell>
                          <div className='flex items-center gap-3'>
                            <CustomAvatar size={32}>
                              {vehicle.type === 'truck' && <i className='ri-truck-line' />}
                              {vehicle.type === 'van' && <i className='ri-car-line' />}
                              {vehicle.type === 'motorcycle' && <i className='ri-motorbike-line' />}
                              {vehicle.type === 'bicycle' && <i className='ri-bike-line' />}
                            </CustomAvatar>
                            <div>
                              <Typography variant='body2' className='font-medium'>
                                {vehicle.licensePlate}
                              </Typography>
                              <Typography variant='caption' color='text.secondary'>
                                {vehicle.model}
                              </Typography>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size='small'
                            variant='tonal'
                            color={statusColors[vehicle.status] as any}
                            label={vehicle.status}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2'>
                            {vehicle.driverName || 'Unassigned'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2'>
                            {vehicle.location || 'Unknown'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box className='flex items-center gap-2'>
                            <LinearProgress
                              variant='determinate'
                              value={level || 0}
                              className='flex-1'
                              color={
                                level && level > 70 ? 'success' : 
                                level && level > 30 ? 'warning' : 'error'
                              }
                            />
                            <Typography variant='caption'>
                              {level || 0}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <IconButton 
                            size='small'
                            onClick={() => onVehicleSelect(vehicle.$id)}
                          >
                            <i className='ri-eye-line' />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            {vehicles.length > 10 && (
              <div className='flex justify-center mt-4'>
                <Button variant='outlined' size='small'>
                  View All Vehicles ({vehicles.length})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Alerts and Notifications */}
      <Grid item xs={12} md={4}>
        <div className='space-y-4'>
          {/* Low Fuel/Battery Alert */}
          {lowLevelVehicles.length > 0 && (
            <Card>
              <CardHeader 
                title='Low Fuel/Battery Alert' 
                titleTypographyProps={{ variant: 'h6' }}
                avatar={<i className='ri-alert-line text-warning' />}
              />
              <CardContent>
                {lowLevelVehicles.map((vehicle) => {
                  const level = vehicle.type === 'bicycle' || vehicle.type === 'motorcycle' 
                    ? vehicle.batteryLevel 
                    : vehicle.fuelLevel
                  
                  return (
                    <div key={vehicle.$id} className='flex items-center justify-between mb-2'>
                      <Typography variant='body2'>{vehicle.licensePlate}</Typography>
                      <Chip
                        size='small'
                        color='error'
                        label={`${level}%`}
                      />
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Maintenance Due */}
          {maintenanceNeeded.length > 0 && (
            <Card>
              <CardHeader 
                title='Maintenance Due' 
                titleTypographyProps={{ variant: 'h6' }}
                avatar={<i className='ri-tools-line text-warning' />}
              />
              <CardContent>
                {maintenanceNeeded.map((vehicle) => (
                  <div key={vehicle.$id} className='flex items-center justify-between mb-2'>
                    <div>
                      <Typography variant='body2'>{vehicle.licensePlate}</Typography>
                      <Typography variant='caption' color='text.secondary'>
                        Due: {vehicle.nextMaintenance}
                      </Typography>
                    </div>
                    <Chip
                      size='small'
                      color='warning'
                      label='Due'
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Fleet Efficiency */}
          <Card>
            <CardHeader title='Fleet Efficiency' titleTypographyProps={{ variant: 'h6' }} />
            <CardContent>
              {statistics && (
                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <Typography variant='body2'>Utilization Rate</Typography>
                    <Typography variant='h6' color='primary'>
                      {Math.round((statistics.active / statistics.total) * 100)}%
                    </Typography>
                  </div>
                  <LinearProgress
                    variant='determinate'
                    value={(statistics.active / statistics.total) * 100}
                    className='h-2'
                  />
                  
                  <div className='grid grid-cols-2 gap-4 mt-4'>
                    <div className='text-center p-2 bg-success/10 rounded'>
                      <Typography variant='h6' color='success.main'>
                        {statistics.active}
                      </Typography>
                      <Typography variant='caption'>Active</Typography>
                    </div>
                    <div className='text-center p-2 bg-info/10 rounded'>
                      <Typography variant='h6' color='info.main'>
                        {statistics.available}
                      </Typography>
                      <Typography variant='caption'>Available</Typography>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Grid>
    </Grid>
  )
}

export default FleetOverview