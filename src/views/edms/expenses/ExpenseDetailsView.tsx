'use client'

// React Imports
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'

// Action Imports
import { getExpenseById, deleteExpense } from '@/libs/actions/expense.actions'
import { getVehicleById } from '@/libs/actions/vehicle.actions'
import { getTripById } from '@/libs/actions/trip.actions'

// Hook Imports
import { usePermissions } from '@/hooks/usePermissions'
import { storage, appwriteConfig } from '@/libs/appwrite.config'

// Type Imports
import type { 
  ExpenseType, 
  ExpenseTypeCategory, 
  PaymentStatusType,
  VehicleType,
  TripType
} from '@/types/apps/deliveryTypes'

// Utility Imports
import dayjs from 'dayjs'

// Expense Type Categories with labels
const EXPENSE_CATEGORIES: Record<ExpenseTypeCategory, { label: string; icon: string }> = {
  fuel: { label: 'Fuel', icon: 'ri-gas-station-line' },
  maintenance: { label: 'Maintenance & Repairs', icon: 'ri-tools-line' },
  tools: { label: 'Tools', icon: 'ri-hammer-line' },
  equipment: { label: 'Equipment', icon: 'ri-settings-3-line' },
  vehicle_purchase: { label: 'Vehicle Purchase', icon: 'ri-car-line' },
  office: { label: 'Office Supplies', icon: 'ri-building-2-line' },
  salary: { label: 'Salary & Wages', icon: 'ri-money-dollar-circle-line' },
  communication: { label: 'Communication', icon: 'ri-phone-line' },
  utilities: { label: 'Utilities', icon: 'ri-lightbulb-line' },
  trip_related: { label: 'Trip Related', icon: 'ri-truck-line' },
  allowance: { label: 'Allowance', icon: 'ri-hand-coin-line' },
  truck_rental: { label: 'Truck Rentals', icon: 'ri-truck-line' },
  other: { label: 'Other', icon: 'ri-more-line' }
}

// Payment Method labels
const PAYMENT_METHODS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  mobile_money: 'Mobile Money',
  cheque: 'Cheque',
  credit: 'Credit'
}

// Payment Status labels and colors
const PAYMENT_STATUS_CONFIG: Record<PaymentStatusType, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  paid: { label: 'Paid', color: 'success' },
  pending: { label: 'Pending', color: 'warning' },
  partial: { label: 'Partially Paid', color: 'error' }
}

interface ExpenseDetailsViewProps {
  expenseId: string
}

const ExpenseDetailsView = ({ expenseId }: ExpenseDetailsViewProps) => {
  const { hasPermission } = usePermissions()
  const router = useRouter()

  // Data State
  const [expense, setExpense] = useState<ExpenseType | null>(null)
  const [vehicle, setVehicle] = useState<VehicleType | null>(null)
  const [trip, setTrip] = useState<TripType | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<boolean>(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false)

  // Image preview dialog
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [imageError, setImageError] = useState<boolean>(false)

  // Load expense data
  useEffect(() => {
    const loadExpense = async () => {
      try {
        setLoading(true)
        setError(null)

        const expenseData = await getExpenseById(expenseId)
        setExpense(expenseData)

        // Load related vehicle if exists
        if (expenseData.vehicleId) {
          try {
            const vehicleData = await getVehicleById(expenseData.vehicleId)
            setVehicle(vehicleData)
          } catch (err) {
            console.warn('Could not load vehicle:', err)
          }
        }

        // Load related trip if exists
        if (expenseData.tripId) {
          try {
            const tripData = await getTripById(expenseData.tripId)
            setTrip(tripData)
          } catch (err) {
            console.warn('Could not load trip:', err)
          }
        }
      } catch (err) {
        console.error('Error loading expense:', err)
        setError('Failed to load expense details')
      } finally {
        setLoading(false)
      }
    }

    loadExpense()
  }, [expenseId])

  // Get image URL from file ID (for thumbnails)
  const getImageUrl = (fileId: string): string => {
    return storage.getFilePreview(
      appwriteConfig.bucket,
      fileId,
      800, // width
      800  // height
    ).toString()
  }

  // Get full image URL (for preview dialog - more reliable than getFilePreview)
  const getFullImageUrl = (fileId: string): string => {
    return storage.getFileView(
      appwriteConfig.bucket,
      fileId
    ).toString()
  }

  // Handle delete
  const handleDelete = async () => {
    try {
      setDeleting(true)
      await deleteExpense(expenseId)
      router.push('/edms/expenses')
    } catch (err) {
      console.error('Error deleting expense:', err)
      setError('Failed to delete expense')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2
    }).format(amount)
  }

  if (loading) {
    return (
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Skeleton variant="rectangular" height={60} />
        </Grid>
        <Grid item xs={12} md={8}>
          <Skeleton variant="rectangular" height={400} />
        </Grid>
        <Grid item xs={12} md={4}>
          <Skeleton variant="rectangular" height={300} />
        </Grid>
      </Grid>
    )
  }

  if (error || !expense) {
    return (
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Alert severity="error" action={
            <Button color="inherit" onClick={() => router.push('/edms/expenses')}>
              Back to List
            </Button>
          }>
            {error || 'Expense not found'}
          </Alert>
        </Grid>
      </Grid>
    )
  }

  const categoryConfig = EXPENSE_CATEGORIES[expense.expenseType] || { label: expense.expenseType, icon: 'ri-receipt-line' }
  const statusConfig = PAYMENT_STATUS_CONFIG[expense.paymentStatus] || { label: expense.paymentStatus, color: 'default' as const }
  const additionalImages = Array.isArray(expense.additionalImages) ? expense.additionalImages : []

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid item xs={12}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton onClick={() => router.back()}>
              <i className="ri-arrow-left-line" />
            </IconButton>
            <Box>
              <Typography variant="h4">{categoryConfig.label}</Typography>
              <Typography variant="body2" color="text.secondary">
                {dayjs(expense.expenseDate).format('dddd, MMMM D, YYYY')}
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={2}>
            {hasPermission('expenses.edit') && (
              <Button
                variant="outlined"
                startIcon={<i className="ri-pencil-line" />}
                onClick={() => router.push(`/edms/expenses/${expenseId}/edit`)}
              >
                Edit
              </Button>
            )}
            {hasPermission('expenses.delete') && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<i className="ri-delete-bin-line" />}
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete
              </Button>
            )}
          </Box>
        </Box>
      </Grid>

      {/* Main Content */}
      <Grid item xs={12} md={8}>
        <Grid container spacing={4}>
          {/* Amount Card */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" alignItems="center" gap={3}>
                    <Box
                      sx={{
                        p: 3,
                        borderRadius: 2,
                        bgcolor: 'primary.lighter',
                        color: 'primary.main'
                      }}
                    >
                      <i className={categoryConfig.icon} style={{ fontSize: 36 }} />
                    </Box>
                    <Box>
                      <Typography variant="h3" fontWeight={700}>
                        {formatCurrency(expense.amount)}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        {expense.description}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    size="medium"
                    label={statusConfig.label}
                    color={statusConfig.color}
                    sx={{ fontSize: 14, px: 2, py: 2 }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Details Card */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Expense Details" />
              <CardContent>
                <List disablePadding>
                  <ListItem divider>
                    <ListItemIcon>
                      <i className="ri-calendar-line" />
                    </ListItemIcon>
                    <ListItemText primary="Date" secondary={dayjs(expense.expenseDate).format('DD MMMM YYYY')} />
                  </ListItem>

                  <ListItem divider>
                    <ListItemIcon>
                      <i className={categoryConfig.icon} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Category" 
                      secondary={
                        <Box>
                          {categoryConfig.label}
                          {expense.subCategory && (
                            <Chip label={expense.subCategory} size="small" sx={{ ml: 1 }} />
                          )}
                        </Box>
                      } 
                    />
                  </ListItem>

                  {expense.vendor && (
                    <ListItem divider>
                      <ListItemIcon>
                        <i className="ri-store-line" />
                      </ListItemIcon>
                      <ListItemText primary="Vendor / Supplier" secondary={expense.vendor} />
                    </ListItem>
                  )}

                  {expense.receiptNumber && (
                    <ListItem divider>
                      <ListItemIcon>
                        <i className="ri-file-list-line" />
                      </ListItemIcon>
                      <ListItemText primary="Receipt / Invoice Number" secondary={expense.receiptNumber} />
                    </ListItem>
                  )}

                  <ListItem divider>
                    <ListItemIcon>
                      <i className="ri-bank-card-line" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Payment Method" 
                      secondary={PAYMENT_METHODS[expense.paymentMethod || 'cash'] || expense.paymentMethod} 
                    />
                  </ListItem>

                  {expense.isRecurring && (
                    <ListItem divider>
                      <ListItemIcon>
                        <i className="ri-repeat-line" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Recurring" 
                        secondary={`${expense.recurringFrequency?.charAt(0).toUpperCase()}${expense.recurringFrequency?.slice(1)} recurring expense`} 
                      />
                    </ListItem>
                  )}

                  <ListItem>
                    <ListItemIcon>
                      <i className="ri-time-line" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Created" 
                      secondary={dayjs(expense.$createdAt).format('DD MMM YYYY, HH:mm')} 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Receipt Images Card */}
          {(expense.receiptImage || additionalImages.length > 0) && (
            <Grid item xs={12}>
              <Card>
                <CardHeader title="Receipt & Documents" />
                <CardContent>
                  <Grid container spacing={2}>
                    {/* Main Receipt */}
                    {expense.receiptImage && (
                      <Grid item xs={6} sm={4} md={3}>
                        <Box
                          sx={{
                            position: 'relative',
                            paddingTop: '100%',
                            borderRadius: 2,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            '&:hover': {
                              '& .overlay': { opacity: 1 }
                            }
                          }}
                          onClick={() => { setImageError(false); setPreviewImage(getFullImageUrl(expense.receiptImage!)) }}
                        >
                          <Box
                            component="img"
                            src={getImageUrl(expense.receiptImage)}
                            alt="Receipt"
                            onError={(e: any) => { e.target.style.display = 'none' }}
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                          <Box
                            className="overlay"
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              bgcolor: 'rgba(0,0,0,0.5)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: 0,
                              transition: 'opacity 0.2s'
                            }}
                          >
                            <i className="ri-zoom-in-line" style={{ fontSize: 24, color: 'white' }} />
                          </Box>
                          <Chip
                            label="Receipt"
                            size="small"
                            sx={{
                              position: 'absolute',
                              bottom: 8,
                              left: 8
                            }}
                          />
                        </Box>
                      </Grid>
                    )}

                    {/* Additional Images */}
                    {additionalImages.map((fileId: string, index: number) => (
                      <Grid item xs={6} sm={4} md={3} key={fileId}>
                        <Box
                          sx={{
                            position: 'relative',
                            paddingTop: '100%',
                            borderRadius: 2,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            '&:hover': {
                              '& .overlay': { opacity: 1 }
                            }
                          }}
                          onClick={() => { setImageError(false); setPreviewImage(getFullImageUrl(fileId)) }}
                        >
                          <Box
                            component="img"
                            src={getImageUrl(fileId)}
                            alt={`Document ${index + 1}`}
                            onError={(e: any) => { e.target.style.display = 'none' }}
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                          <Box
                            className="overlay"
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              bgcolor: 'rgba(0,0,0,0.5)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: 0,
                              transition: 'opacity 0.2s'
                            }}
                          >
                            <i className="ri-zoom-in-line" style={{ fontSize: 24, color: 'white' }} />
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </Grid>

      {/* Side Panel - Associations */}
      <Grid item xs={12} md={4}>
        <Grid container spacing={4}>
          {/* Trip Card */}
          {trip && (
            <Grid item xs={12}>
              <Card>
                <CardHeader 
                  title="Linked Trip"
                  action={
                    <Button
                      size="small"
                      onClick={() => router.push(`/edms/trips/${trip.$id}`)}
                    >
                      View Trip
                    </Button>
                  }
                />
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'info.lighter',
                        color: 'info.main'
                      }}
                    >
                      <i className="ri-truck-line" style={{ fontSize: 24 }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {trip.tripNumber}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {typeof trip.route === 'object' ? trip.route?.routeName : trip.route || 'No route'}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Vehicle Card */}
          {vehicle && (
            <Grid item xs={12}>
              <Card>
                <CardHeader 
                  title="Linked Vehicle"
                  action={
                    <Button
                      size="small"
                      onClick={() => router.push(`/vehicles/${vehicle.$id}`)}
                    >
                      View Vehicle
                    </Button>
                  }
                />
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'secondary.lighter',
                        color: 'secondary.main'
                      }}
                    >
                      <i className="ri-car-line" style={{ fontSize: 24 }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {vehicle.vehicleNumber}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {[vehicle.vehicleType, vehicle.model].filter(Boolean).join(' ') || 'No details'}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* No associations */}
          {!trip && !vehicle && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box textAlign="center" py={3}>
                    <i className="ri-link-unlink" style={{ fontSize: 48, color: 'var(--mui-palette-text-secondary)' }} />
                    <Typography variant="body1" color="text.secondary" mt={2}>
                      Not linked to any trip or vehicle
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
        <DialogContent>
          <Box textAlign="center" py={2}>
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                bgcolor: 'error.lighter',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}
            >
              <i className="ri-delete-bin-line" style={{ fontSize: 28, color: 'var(--mui-palette-error-main)' }} />
            </Box>
            <Typography variant="h6" mb={1}>Delete Expense?</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Are you sure you want to delete this expense? This action cannot be undone.
            </Typography>
            <Box display="flex" justifyContent="center" gap={2}>
              <Button
                variant="outlined"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog
        open={!!previewImage}
        onClose={() => setPreviewImage(null)}
        maxWidth="lg"
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'background.paper' }
            }}
            onClick={() => setPreviewImage(null)}
          >
            <i className="ri-close-line" />
          </IconButton>
          {previewImage && !imageError && (
            <Box
              component="img"
              src={previewImage}
              alt="Preview"
              onError={() => setImageError(true)}
              sx={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                display: 'block'
              }}
            />
          )}
          {imageError && (
            <Box textAlign="center" p={6}>
              <i className="ri-image-line" style={{ fontSize: 48, color: 'var(--mui-palette-text-secondary)' }} />
              <Typography variant="body1" color="text.secondary" mt={2}>
                Unable to load image preview
              </Typography>
              {previewImage && (
                <Button
                  sx={{ mt: 2 }}
                  variant="outlined"
                  startIcon={<i className="ri-download-line" />}
                  component="a"
                  href={previewImage}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in new tab
                </Button>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Grid>
  )
}

export default ExpenseDetailsView
