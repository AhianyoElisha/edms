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
  Assignment,
  Schedule,
  LocalShipping
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
import OptionMenu from '@core/components/option-menu'

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

  const getManifestActionOptions = (manifest: ManifestType) => {
    const options = [
      {
        text: 'View Details',
        icon: 'ri-eye-line',
        linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' },
        menuItemProps: { onClick: () => handleViewManifest(manifest) }
      },
      {
        text: 'Edit',
        icon: 'ri-edit-box-line',
        linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' },
        menuItemProps: { onClick: () => handleEditManifest(manifest) }
      }
    ]

    // Add status-specific actions
    switch (manifest.status) {
      case 'pending':
        options.push({
          text: 'Mark as Loaded',
          icon: 'ri-play-circle-line',
          linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' },
          menuItemProps: { onClick: () => handleStatusUpdate(manifest, 'loaded') }
        })
        break
      case 'loaded':
        options.push({
          text: 'Start Transit',
          icon: 'ri-truck-line',
          linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' },
          menuItemProps: { onClick: () => handleStatusUpdate(manifest, 'in_transit') }
        })
        break
      case 'in_transit':
        options.push({
          text: 'Mark as Delivered',
          icon: 'ri-checkbox-circle-line',
          linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' },
          menuItemProps: { onClick: () => handleStatusUpdate(manifest, 'delivered') }
        })
        break
      case 'delivered':
        options.push({
          text: 'Mark as Completed',
          icon: 'ri-check-double-line',
          linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' },
          menuItemProps: { onClick: () => handleStatusUpdate(manifest, 'completed') }
        })
        break
    }

    // Add delete option at the end
    options.push({
      text: 'Delete',
      icon: 'ri-delete-bin-line',
      linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4 text-error' },
      menuItemProps: { 
        onClick: () => handleDeleteClick(manifest)
      }
    })

    return options
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
        subheader={`${filteredManifests.length} manifests found. Manifests are created via trip wizard.`}
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
                  <OptionMenu
                    iconButtonProps={{ size: 'medium' }}
                    iconClassName='text-textSecondary text-[22px]'
                    options={getManifestActionOptions(manifest)}
                  />
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