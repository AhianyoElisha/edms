'use client'

// React Imports
import { useState, useCallback } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Box from '@mui/material/Box'
import { Breadcrumbs } from '@mui/material'

// Component Imports
import VehicleInfoCard from './VehicleInfoCard'
import DriverInfoCard from './DriverInfoCard'
import VehicleTripHistory from './VehicleTripHistory'
import StyledBreadcrumb from '@/components/layout/shared/Breadcrumbs'
import EditLogisticsDrawer from '../EditTruckorTricycleDrawer'

// Actions
import { deleteVehicleFromDB, getVehicleDetailById } from '@/libs/actions/customer.action'

// Context
import { useAuth } from '@/contexts/AppwriteProvider'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import { Logistics } from '@/types/apps/ecommerceTypes'

const VehicleDetails = ({ vehicleData: initialVehicleData, vehicleId }: { vehicleData?: any; vehicleId: string }) => {
  const router = useRouter()
  const { user } = useAuth()
  const isAdmin = user?.role?.name === 'admin'

  const [vehicleData, setVehicleData] = useState(initialVehicleData)
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'truck': return 'ri-truck-line'
      case 'van': return 'ri-car-line'
      case 'bike': return 'ri-e-bike-2-line'
      case 'car': return 'ri-car-fill'
      default: return 'ri-truck-line'
    }
  }

  const handleRefresh = useCallback(async () => {
    try {
      const refreshedData = await getVehicleDetailById(vehicleId)
      if (refreshedData) {
        setVehicleData(refreshedData)
      }
    } catch (error) {
      console.error('Error refreshing vehicle data:', error)
    }
  }, [vehicleId])

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      setDeleteError(null)
      await deleteVehicleFromDB(vehicleId)
      toast.success(`Vehicle "${vehicleData?.vehicleNumber}" deleted successfully`)
      router.push('/vehicles')
    } catch (error: any) {
      console.error('Error deleting vehicle:', error)
      setDeleteError(error?.message || 'Failed to delete vehicle')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid item xs={12}>
        <div className='flex flex-wrap justify-between sm:items-center max-sm:flex-col gap-y-4'>
          <div className='flex flex-col items-start gap-1'>
            <div className='flex items-center gap-2'>
              <i className={`${getVehicleIcon(vehicleData?.vehicleType)} text-2xl`} />
              <Typography variant='h5'>{vehicleData?.vehicleNumber || vehicleId}</Typography>
              <Chip
                variant='tonal'
                label={vehicleData?.status?.charAt(0).toUpperCase() + vehicleData?.status?.slice(1) || 'Unknown'}
                color={
                  vehicleData?.status === 'active' ? 'success' :
                  vehicleData?.status === 'maintenance' ? 'warning' :
                  'error'
                }
                size='small'
              />
              <Chip
                variant='tonal'
                label={vehicleData?.vehicleType?.charAt(0).toUpperCase() + vehicleData?.vehicleType?.slice(1) || 'Unknown'}
                color='primary'
                size='small'
              />
            </div>
            <Typography variant='body2' color='text.secondary'>
              {vehicleData?.brand} {vehicleData?.model} {vehicleData?.year ? `(${vehicleData.year})` : ''}
            </Typography>
          </div>
          <div className='flex gap-2'>
            <Button
              variant='outlined'
              color='primary'
              startIcon={<i className='ri-edit-box-line' />}
              onClick={() => setEditDrawerOpen(true)}
            >
              Edit Vehicle
            </Button>
            {isAdmin && (
              <Button
                variant='outlined'
                color='error'
                startIcon={<i className='ri-delete-bin-line' />}
                onClick={() => { setDeleteDialogOpen(true); setDeleteError(null) }}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </Grid>

      {/* Breadcrumbs */}
      <Grid item xs={12}>
        <div role="presentation">
          <Breadcrumbs aria-label="breadcrumb">
            <StyledBreadcrumb 
              component="a"
              onClick={() => router.push('/vehicles')}
              icon={<i className='ri-truck-line' />}
              className='cursor-pointer'
              label="Vehicles" 
            />
            <StyledBreadcrumb
              label={vehicleData?.vehicleNumber || 'Details'}
              icon={<i className='ri-stack-line' />}
              disabled
            />
          </Breadcrumbs>
        </div>
      </Grid>

      {/* Main Content */}
      <Grid item xs={12} md={8}>
        <Grid container spacing={6}>
          <Grid item xs={12}>
            <VehicleTripHistory vehicleId={vehicleId} />
          </Grid>
        </Grid>
      </Grid>

      {/* Sidebar */}
      <Grid item xs={12} md={4}>
        <Grid container spacing={6}>
          <Grid item xs={12}>
            <VehicleInfoCard vehicleData={vehicleData} />
          </Grid>
          <Grid item xs={12}>
            <DriverInfoCard vehicleData={vehicleData} />
          </Grid>
        </Grid>
      </Grid>

      {/* Edit Drawer */}
      <EditLogisticsDrawer
        open={editDrawerOpen}
        handleClose={() => setEditDrawerOpen(false)}
        vehicleData={vehicleData as Logistics}
        onSuccess={async () => {
          await handleRefresh()
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setDeleteError(null) }}
        maxWidth='xs'
        fullWidth
      >
        <DialogTitle>
          <div className='flex items-center gap-2'>
            <i className='ri-error-warning-line text-error text-2xl' />
            Delete Vehicle
          </div>
        </DialogTitle>
        <DialogContent>
          <Typography className='mb-2'>
            Are you sure you want to delete vehicle <strong>"{vehicleData?.vehicleNumber}"</strong>?
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            This action cannot be undone. All data associated with this vehicle will be permanently removed.
          </Typography>
          {deleteError && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'error.lighter', borderRadius: 1, border: '1px solid', borderColor: 'error.main' }}>
              <Typography color="error.main" variant="body2">
                {deleteError}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => { setDeleteDialogOpen(false); setDeleteError(null) }}
            variant='outlined'
            color='secondary'
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Vehicle'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default VehicleDetails