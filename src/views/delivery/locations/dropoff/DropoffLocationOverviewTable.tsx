'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Card,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Grid,
  CardContent
} from '@mui/material'
import { 
  Edit, 
  Delete, 
  LocationOn, 
  Phone, 
  Email, 
  Schedule, 
  Visibility,
  Map,
  LocalShipping,
  Business,
  Security,
  Assignment
} from '@mui/icons-material'
import { DropoffLocationType } from '@/types/apps/deliveryTypes'
import { 
  getAllDropoffLocations, 
  deleteDropoffLocation,
  updateDropoffLocation,
  getLocationStatistics 
} from '@/libs/actions/location.actions'
import LocationTableFilters from '../LocationTableFilters'
import AddDropoffLocationDrawer from './AddDropoffLocationDrawer'

// Component Imports  
import CustomAvatar from '@core/components/mui/Avatar'

interface DropoffLocationOverviewTableProps {
  onEditLocation?: (location: DropoffLocationType) => void
  onAddLocation?: () => void
}

const DropoffLocationOverviewTable: React.FC<DropoffLocationOverviewTableProps> = ({
  onEditLocation,
  onAddLocation
}) => {
  // State management
  const [locations, setLocations] = useState<DropoffLocationType[]>([])
  const [filteredLocations, setFilteredLocations] = useState<DropoffLocationType[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [selectedLocation, setSelectedLocation] = useState<DropoffLocationType | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [locationToDelete, setLocationToDelete] = useState<DropoffLocationType | null>(null)
  const [filters, setFilters] = useState({
    search: '',
    isActive: undefined as boolean | undefined,
    city: ''
  })
  const [statistics, setStatistics] = useState({
    total: 0,
    active: 0,
    inactive: 0
  })
  const [addDrawerOpen, setAddDrawerOpen] = useState(false)

  // Fetch locations
  const fetchLocations = async () => {
    try {
      setLoading(true)
      const [locationsData, statsData] = await Promise.all([
        getAllDropoffLocations(),
        getLocationStatistics()
      ])
      setLocations(locationsData)
      setStatistics(statsData.dropoff)
    } catch (error) {
      console.error('Error fetching dropoff locations:', error)
    } finally {
      setLoading(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    fetchLocations()
  }, [])

  // Filter locations based on filters
  const applyFilters = useMemo(() => {
    let filtered = [...locations]

    // Search filter
    if (filters.search) {
      filtered = filtered.filter(location =>
        location.locationName.toLowerCase().includes(filters.search.toLowerCase()) ||
        location.address.toLowerCase().includes(filters.search.toLowerCase()) ||
        location.city.toLowerCase().includes(filters.search.toLowerCase()) ||
        location.locationCode.toLowerCase().includes(filters.search.toLowerCase()) ||
        (location.contactPerson && location.contactPerson.toLowerCase().includes(filters.search.toLowerCase()))
      )
    }

    // Active status filter
    if (filters.isActive !== undefined) {
      filtered = filtered.filter(location => location.isActive === filters.isActive)
    }

    // City filter
    if (filters.city) {
      filtered = filtered.filter(location => location.city === filters.city)
    }

    return filtered
  }, [locations, filters])

  useEffect(() => {
    setFilteredLocations(applyFilters)
    setPage(0) // Reset page when filters change
  }, [applyFilters])

  // Handlers
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const handleViewLocation = (location: DropoffLocationType) => {
    setSelectedLocation(location)
    setViewDialogOpen(true)
  }

  const handleEditLocation = (location: DropoffLocationType) => {
    if (onEditLocation) {
      onEditLocation(location)
    }
  }

  const handleDeleteClick = (location: DropoffLocationType) => {
    setLocationToDelete(location)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (locationToDelete) {
      try {
        await deleteDropoffLocation(locationToDelete.$id)
        setDeleteDialogOpen(false)
        setLocationToDelete(null)
        await fetchLocations() // Refresh data
      } catch (error) {
        console.error('Error deleting dropoff location:', error)
      }
    }
  }

  const handleToggleStatus = async (location: DropoffLocationType) => {
    try {
      await updateDropoffLocation({
        $id: location.$id,
        isActive: !location.isActive
      })
      await fetchLocations() // Refresh data
    } catch (error) {
      console.error('Error updating location status:', error)
    }
  }

  const getStatusChip = (isActive: boolean) => (
    <Chip
      label={isActive ? 'Active' : 'Inactive'}
      color={isActive ? 'success' : 'default'}
      size="small"
      variant="outlined"
    />
  )

  // Pagination
  const paginatedLocations = filteredLocations.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  )

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography>Loading dropoff locations...</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader 
          title='Dropoff Locations Management' 
          action={
            <Button
              variant='contained'
              startIcon={<i className='ri-add-line' />}
              onClick={() => setAddDrawerOpen(true)}
            >
              Add Dropoff Location
            </Button>
          }
        />

        {/* Statistics Cards */}
        {statistics && (
          <Box className='p-4'>
            <Grid container spacing={4}>
              <Grid item xs={12} sm={4}>
                <Card className='border'>
                  <div className='flex items-center p-4'>
                    <CustomAvatar variant='rounded' skin='light' color='primary'>
                      <i className='ri-map-pin-line text-[22px]' />
                    </CustomAvatar>
                    <div className='ml-4'>
                      <Typography variant='h5'>{statistics.total}</Typography>
                      <Typography variant='body2'>Total Locations</Typography>
                    </div>
                  </div>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card className='border'>
                  <div className='flex items-center p-4'>
                    <CustomAvatar variant='rounded' skin='light' color='success'>
                      <i className='ri-checkbox-circle-line text-[22px]' />
                    </CustomAvatar>
                    <div className='ml-4'>
                      <Typography variant='h5'>{statistics.active}</Typography>
                      <Typography variant='body2'>Active</Typography>
                    </div>
                  </div>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card className='border'>
                  <div className='flex items-center p-4'>
                    <CustomAvatar variant='rounded' skin='light' color='warning'>
                      <i className='ri-pause-circle-line text-[22px]' />
                    </CustomAvatar>
                    <div className='ml-4'>
                      <Typography variant='h5'>{statistics.inactive}</Typography>
                      <Typography variant='body2'>Inactive</Typography>
                    </div>
                  </div>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Search and Filters */}
        <div className='flex flex-col gap-4 p-6 border-bs'>
          <LocationTableFilters
            filters={filters}
            onFiltersChange={(newFilters) => setFilters({ ...filters, ...newFilters })}
            locations={locations}
            locationType="dropoff"
          />
        </div>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Location Details</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedLocations.map((location) => (
                  <TableRow key={location.$id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {location.locationName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Code: {location.locationCode}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {location.address}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {location.city}, {location.region}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        {location.contactPerson && (
                          <Typography variant="body2">
                            {location.contactPerson}
                          </Typography>
                        )}
                        {location.contactPhone && (
                          <Typography variant="body2" color="text.secondary">
                            {location.contactPhone}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {getStatusChip(location.isActive)}
                    </TableCell>
                    <TableCell align="right">
                      <Box display="flex" gap={1}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewLocation(location)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Location">
                          <IconButton
                            size="small"
                            onClick={() => handleEditLocation(location)}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View on Map">
                          <IconButton
                            size="small"
                            disabled={!location.gpsCoordinates}
                            onClick={() => {
                              if (location.gpsCoordinates) {
                                window.open(
                                  `https://maps.google.com/?q=${location.gpsCoordinates}`,
                                  '_blank'
                                )
                              }
                            }}
                          >
                            <Map />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={location.isActive ? 'Deactivate' : 'Activate'}>
                          <IconButton
                            size="small"
                            onClick={() => handleToggleStatus(location)}
                          >
                            <Business />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Location">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteClick(location)}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedLocations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="text.secondary">
                        No dropoff locations found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

        <TablePagination
          component="div"
          count={filteredLocations.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Card>

      {/* View Location Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Dropoff Location Details
        </DialogTitle>
        <DialogContent dividers>
          {selectedLocation && (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">Location Name</Typography>
                  <Typography variant="body1">{selectedLocation.locationName}</Typography>
                </Box>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">Location Code</Typography>
                  <Typography variant="body1">{selectedLocation.locationCode}</Typography>
                </Box>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  {getStatusChip(selectedLocation.isActive)}
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="h6" gutterBottom>
                  Address
                </Typography>
                <Box mb={2}>
                  <Typography variant="body1">
                    {selectedLocation.address}
                  </Typography>
                  <Typography variant="body1">
                    {selectedLocation.city}, {selectedLocation.region}
                  </Typography>
                  {selectedLocation.gpsCoordinates && (
                    <Typography variant="body2" color="text.secondary">
                      GPS: {selectedLocation.gpsCoordinates}
                    </Typography>
                  )}
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="h6" gutterBottom>
                  Contact Information
                </Typography>
                {selectedLocation.contactPerson && (
                  <Box mb={1}>
                    <Typography variant="body2" color="text.secondary">Contact Person</Typography>
                    <Typography variant="body1">{selectedLocation.contactPerson}</Typography>
                  </Box>
                )}
                {selectedLocation.contactPhone && (
                  <Box mb={1}>
                    <Typography variant="body2" color="text.secondary">Phone</Typography>
                    <Typography variant="body1">{selectedLocation.contactPhone}</Typography>
                  </Box>
                )}
              </Grid>

              {selectedLocation.gpsCoordinates && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    GPS Coordinates
                  </Typography>
                  <Typography variant="body1">
                    {selectedLocation.gpsCoordinates}
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Map />}
                    onClick={() => window.open(
                      `https://maps.google.com/?q=${selectedLocation.gpsCoordinates}`,
                      '_blank'
                    )}
                    sx={{ mt: 1 }}
                  >
                    View on Google Maps
                  </Button>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the dropoff location "{locationToDelete?.locationName}"? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Dropoff Location Drawer */}
      <AddDropoffLocationDrawer
        open={addDrawerOpen}
        onClose={() => setAddDrawerOpen(false)}
        onSuccess={fetchLocations}
      />
    </>
  )
}

export default DropoffLocationOverviewTable