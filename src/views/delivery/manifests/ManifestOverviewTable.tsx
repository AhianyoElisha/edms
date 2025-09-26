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
  Grid,
  LinearProgress
} from '@mui/material'
import { 
  Edit, 
  Delete, 
  Visibility,
  LocalShipping,
  Assignment,
  Schedule,
  CheckCircle,
  PlayArrow,
  Stop
} from '@mui/icons-material'
import { ManifestType, ManifestFilters } from '@/types/apps/deliveryTypes'
import { 
  getAllManifests, 
  deleteManifest,
  updateManifestStatus,
  getManifestStatistics 
} from '@/libs/actions/manifest.actions'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'

interface ManifestOverviewTableProps {
  onEditManifest?: (manifest: ManifestType) => void
}

const ManifestOverviewTable = ({ onEditManifest }: ManifestOverviewTableProps) => {
  const [manifests, setManifests] = useState<ManifestType[]>([])
  const [filteredManifests, setFilteredManifests] = useState<ManifestType[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedManifest, setSelectedManifest] = useState<ManifestType | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [manifestToDelete, setManifestToDelete] = useState<ManifestType | null>(null)
  
  // Pagination
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Basic filters for now
  const [filters, setFilters] = useState<ManifestFilters>({
    search: '',
    status: undefined
  })

  // Fetch manifests
  const fetchManifests = async () => {
    try {
      setLoading(true)
      const data = await getAllManifests(filters)
      setManifests(data)
    } catch (error) {
      console.error('Error fetching manifests:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchManifests()
  }, [filters])

  // Apply filters
  const applyFilters = useMemo(() => {
    let filtered = [...manifests]

    // Search filter
    if (filters.search) {
      filtered = filtered.filter(manifest =>
        manifest.manifestNumber.toLowerCase().includes(filters.search.toLowerCase())
      )
    }

    return filtered
  }, [manifests, filters])

  useEffect(() => {
    setFilteredManifests(applyFilters)
    setPage(0) // Reset to first page when filters change
  }, [applyFilters])

  // Pagination
  const paginatedManifests = filteredManifests.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  )

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const handleViewManifest = (manifest: ManifestType) => {
    setSelectedManifest(manifest)
    setViewDialogOpen(true)
  }

  const handleEditManifest = (manifest: ManifestType) => {
    if (onEditManifest) {
      onEditManifest(manifest)
    }
  }

  const handleDeleteClick = (manifest: ManifestType) => {
    setManifestToDelete(manifest)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (manifestToDelete) {
      try {
        await deleteManifest(manifestToDelete.$id)
        setDeleteDialogOpen(false)
        setManifestToDelete(null)
        await fetchManifests() // Refresh data
      } catch (error) {
        console.error('Error deleting manifest:', error)
      }
    }
  }

  const handleStatusUpdate = async (manifest: ManifestType, newStatus: ManifestType['status']) => {
    try {
      await updateManifestStatus(manifest.$id, newStatus)
      await fetchManifests() // Refresh data
    } catch (error) {
      console.error('Error updating manifest status:', error)
    }
  }

  const getStatusChip = (status: ManifestType['status']) => {
    const statusConfig = {
      pending: { color: 'warning' as const, label: 'Pending', icon: 'ri-time-line' },
      loaded: { color: 'info' as const, label: 'Loaded', icon: 'ri-inbox-line' },
      in_transit: { color: 'primary' as const, label: 'In Transit', icon: 'ri-truck-line' },
      delivered: { color: 'success' as const, label: 'Delivered', icon: 'ri-checkbox-circle-line' },
      completed: { color: 'success' as const, label: 'Completed', icon: 'ri-check-double-line' }
    }

    const config = statusConfig[status]
    return (
      <Chip
        label={config.label}
        color={config.color}
        size="small"
        variant="outlined"
        icon={<i className={config.icon} />}
      />
    )
  }

  const getStatusActions = (manifest: ManifestType) => {
    const actions = []

    switch (manifest.status) {
      case 'pending':
        actions.push(
          <Tooltip key="load" title="Mark as Loaded">
            <IconButton
              size="small"
              color="info"
              onClick={() => handleStatusUpdate(manifest, 'loaded')}
            >
              <PlayArrow />
            </IconButton>
          </Tooltip>
        )
        break
      case 'loaded':
        actions.push(
          <Tooltip key="transit" title="Start Transit">
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleStatusUpdate(manifest, 'in_transit')}
            >
              <LocalShipping />
            </IconButton>
          </Tooltip>
        )
        break
      case 'in_transit':
        actions.push(
          <Tooltip key="deliver" title="Mark as Delivered">
            <IconButton
              size="small"
              color="success"
              onClick={() => handleStatusUpdate(manifest, 'delivered')}
            >
              <CheckCircle />
            </IconButton>
          </Tooltip>
        )
        break
      case 'delivered':
        actions.push(
          <Tooltip key="complete" title="Mark as Completed">
            <IconButton
              size="small"
              color="success"
              onClick={() => handleStatusUpdate(manifest, 'completed')}
            >
              <Stop />
            </IconButton>
          </Tooltip>
        )
        break
    }

    return actions
  }

  if (loading) {
    return (
      <Card>
        <CardHeader title="Loading manifests..." />
        <LinearProgress />
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader
        title="Manifest Overview"
        subheader={`${filteredManifests.length} manifests found`}
        action={
          <Button
            variant="contained"
            startIcon={<i className='ri-add-line' />}
            href="/delivery/manifests/create"
          >
            Create Manifest
          </Button>
        }
      />
      
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Manifest Details</TableCell>
              <TableCell>Route</TableCell>
              <TableCell>Packages</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedManifests.map((manifest) => (
              <TableRow key={manifest.$id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {manifest.manifestNumber}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Driver: {manifest.driver}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Vehicle: {manifest.vehicle}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2">
                      From: {manifest.pickupLocation}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      To: {manifest.dropoffLocation}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2">
                      {manifest.totalPackages} packages
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      S:{manifest.packageTypes.small} M:{manifest.packageTypes.medium} L:{manifest.packageTypes.large} B:{manifest.packageTypes.bins}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  {getStatusChip(manifest.status)}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(manifest.manifestDate).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Box display="flex" gap={1}>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => handleViewManifest(manifest)}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Manifest">
                      <IconButton
                        size="small"
                        onClick={() => handleEditManifest(manifest)}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    {getStatusActions(manifest)}
                    <Tooltip title="Delete Manifest">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteClick(manifest)}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {paginatedManifests.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary">
                    No manifests found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filteredManifests.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />

      {/* Manifest Details Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Manifest Details - {selectedManifest?.manifestNumber}
        </DialogTitle>
        <DialogContent dividers>
          {selectedManifest && (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">Manifest Number</Typography>
                  <Typography variant="body1">{selectedManifest.manifestNumber}</Typography>
                </Box>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  {getStatusChip(selectedManifest.status)}
                </Box>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">Date</Typography>
                  <Typography variant="body1">{new Date(selectedManifest.manifestDate).toLocaleDateString()}</Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="h6" gutterBottom>
                  Route Details
                </Typography>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">Pickup Location</Typography>
                  <Typography variant="body1">{selectedManifest.pickupLocation}</Typography>
                </Box>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">Dropoff Location</Typography>
                  <Typography variant="body1">{selectedManifest.dropoffLocation}</Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="h6" gutterBottom>
                  Assignment
                </Typography>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">Driver</Typography>
                  <Typography variant="body1">{selectedManifest.driver}</Typography>
                </Box>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">Vehicle</Typography>
                  <Typography variant="body1">{selectedManifest.vehicle}</Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="h6" gutterBottom>
                  Package Summary
                </Typography>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">Total Packages</Typography>
                  <Typography variant="body1">{selectedManifest.totalPackages}</Typography>
                </Box>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">Package Breakdown</Typography>
                  <Typography variant="body1">
                    Small: {selectedManifest.packageTypes.small}, 
                    Medium: {selectedManifest.packageTypes.medium}, 
                    Large: {selectedManifest.packageTypes.large}, 
                    Bins: {selectedManifest.packageTypes.bins}
                  </Typography>
                </Box>
              </Grid>

              {selectedManifest.notes && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Notes
                  </Typography>
                  <Typography variant="body1">{selectedManifest.notes}</Typography>
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
            Are you sure you want to delete manifest "{manifestToDelete?.manifestNumber}"? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}

export default ManifestOverviewTable