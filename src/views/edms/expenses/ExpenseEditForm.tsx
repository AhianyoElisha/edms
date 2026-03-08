'use client'

// React Imports
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import InputAdornment from '@mui/material/InputAdornment'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import FormHelperText from '@mui/material/FormHelperText'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Skeleton from '@mui/material/Skeleton'

// Date Picker Imports
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers-pro'
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs'
import dayjs, { Dayjs } from 'dayjs'

// Action Imports
import { getExpenseById, updateExpense, uploadReceiptImage, uploadAdditionalImages, removeReceiptImage, removeAdditionalImage } from '@/libs/actions/expense.actions'
import { getAllTrips } from '@/libs/actions/trip.actions'
import { getAllVehicles } from '@/libs/actions/vehicle.actions'
import { storage, appwriteConfig } from '@/libs/appwrite.config'

// Type Imports
import type { 
  ExpenseType,
  ExpenseInput, 
  ExpenseTypeCategory, 
  PaymentMethodType, 
  PaymentStatusType,
  TripType,
  VehicleType
} from '@/types/apps/deliveryTypes'

// Expense Type Categories with labels
const EXPENSE_CATEGORIES: { value: ExpenseTypeCategory; label: string; icon: string }[] = [
  { value: 'fuel', label: 'Fuel', icon: 'ri-gas-station-line' },
  { value: 'maintenance', label: 'Maintenance & Repairs', icon: 'ri-tools-line' },
  { value: 'tools', label: 'Tools', icon: 'ri-hammer-line' },
  { value: 'equipment', label: 'Equipment', icon: 'ri-settings-3-line' },
  { value: 'vehicle_purchase', label: 'Vehicle Purchase', icon: 'ri-car-line' },
  { value: 'office', label: 'Office Supplies', icon: 'ri-building-2-line' },
  { value: 'salary', label: 'Salary & Wages', icon: 'ri-money-dollar-circle-line' },
  { value: 'communication', label: 'Communication', icon: 'ri-phone-line' },
  { value: 'utilities', label: 'Utilities', icon: 'ri-lightbulb-line' },
  { value: 'trip_related', label: 'Trip Related', icon: 'ri-truck-line' },
  { value: 'allowance', label: 'Allowance', icon: 'ri-hand-coin-line' },
  { value: 'truck_rental', label: 'Truck Rentals', icon: 'ri-truck-line' },
  { value: 'other', label: 'Other', icon: 'ri-more-line' }
]

// Sub-categories for each expense type
const SUB_CATEGORIES: Record<ExpenseTypeCategory, string[]> = {
  fuel: ['Diesel', 'Petrol', 'Gas'],
  maintenance: ['Oil Change', 'Tyre Replacement', 'Brake Service', 'Engine Repair', 'Body Work', 'Electrical', 'General Service'],
  tools: ['Hand Tools', 'Power Tools', 'Safety Equipment'],
  equipment: ['Loading Equipment', 'Office Equipment', 'Warehouse Equipment'],
  vehicle_purchase: ['New Vehicle', 'Used Vehicle', 'Parts'],
  office: ['Stationery', 'Furniture', 'IT Equipment'],
  salary: ['Driver Salary', 'Staff Salary', 'Bonus', 'Overtime'],
  communication: ['Airtime', 'Internet', 'Phone Bills'],
  utilities: ['Electricity', 'Water', 'Rent'],
  trip_related: ['Toll Fees', 'Parking', 'Loading', 'Accommodation', 'Meals', 'Permits'],
  allowance: ['Driver Allowance', 'Mate Allowance', 'Bonus', 'Overtime'],
  truck_rental: ['Monthly Rental', 'Trip-based Rental'],
  other: ['Miscellaneous']
}

// Payment Methods
const PAYMENT_METHODS: { value: PaymentMethodType; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'credit', label: 'Credit' }
]

// Payment Statuses
const PAYMENT_STATUSES: { value: PaymentStatusType; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'partial', label: 'Partially Paid' }
]

interface ExpenseEditFormProps {
  expenseId: string
}

const ExpenseEditForm = ({ expenseId }: ExpenseEditFormProps) => {
  const router = useRouter()

  // Original expense
  const [originalExpense, setOriginalExpense] = useState<ExpenseType | null>(null)

  // Form State
  const [expenseType, setExpenseType] = useState<ExpenseTypeCategory>('trip_related')
  const [subCategory, setSubCategory] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [vendor, setVendor] = useState<string>('')
  const [receiptNumber, setReceiptNumber] = useState<string>('')
  const [expenseDate, setExpenseDate] = useState<Dayjs>(dayjs())
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('cash')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusType>('paid')
  const [tripId, setTripId] = useState<string>('')
  const [vehicleId, setVehicleId] = useState<string>('')
  const [isRecurring, setIsRecurring] = useState<boolean>(false)
  const [recurringFrequency, setRecurringFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly')

  // Existing images
  const [existingReceiptImage, setExistingReceiptImage] = useState<string | null>(null)
  const [existingAdditionalImages, setExistingAdditionalImages] = useState<string[]>([])

  // New files to upload
  const [newReceiptFile, setNewReceiptFile] = useState<File | null>(null)
  const [newReceiptPreview, setNewReceiptPreview] = useState<string | null>(null)
  const [newAdditionalFiles, setNewAdditionalFiles] = useState<File[]>([])

  // Data Loading
  const [trips, setTrips] = useState<TripType[]>([])
  const [vehicles, setVehicles] = useState<VehicleType[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [dataLoading, setDataLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  // Load expense and reference data
  useEffect(() => {
    const loadData = async () => {
      try {
        setDataLoading(true)
        
        const [expenseData, tripsData, vehiclesData] = await Promise.all([
          getExpenseById(expenseId),
          getAllTrips(),
          getAllVehicles()
        ])

        setOriginalExpense(expenseData)
        setTrips(tripsData)
        setVehicles(vehiclesData.filter(v => v.status === 'active'))

        // Populate form fields
        setExpenseType(expenseData.expenseType)
        setSubCategory(expenseData.subCategory || '')
        setAmount(expenseData.amount.toString())
        setDescription(expenseData.description)
        setVendor(expenseData.vendor || '')
        setReceiptNumber(expenseData.receiptNumber || '')
        setExpenseDate(dayjs(expenseData.expenseDate))
        setPaymentMethod(expenseData.paymentMethod || 'cash')
        setPaymentStatus(expenseData.paymentStatus)
        setTripId(expenseData.tripId || '')
        setVehicleId(expenseData.vehicleId || '')
        setIsRecurring(expenseData.isRecurring || false)
        setRecurringFrequency(expenseData.recurringFrequency || 'monthly')

        // Set existing images
        setExistingReceiptImage(expenseData.receiptImage || null)
        setExistingAdditionalImages(Array.isArray(expenseData.additionalImages) ? expenseData.additionalImages : [])

      } catch (err) {
        console.error('Error loading expense:', err)
        setError('Failed to load expense')
      } finally {
        setDataLoading(false)
      }
    }

    loadData()
  }, [expenseId])

  // Get image URL from file ID
  const getImageUrl = (fileId: string): string => {
    return storage.getFilePreview(
      appwriteConfig.bucket,
      fileId,
      400,
      400
    ).toString()
  }

  // Handle new receipt file selection
  const handleReceiptChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setNewReceiptFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setNewReceiptPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle additional files selection
  const handleAdditionalFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setNewAdditionalFiles(prev => [...prev, ...files])
  }

  // Remove new additional file
  const removeNewAdditionalFile = (index: number) => {
    setNewAdditionalFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Remove existing receipt image
  const handleRemoveExistingReceipt = async () => {
    if (!existingReceiptImage) return
    try {
      await removeReceiptImage(expenseId)
      setExistingReceiptImage(null)
    } catch (err) {
      console.error('Error removing receipt:', err)
      setError('Failed to remove receipt image')
    }
  }

  // Remove existing additional image
  const handleRemoveExistingAdditional = async (fileId: string) => {
    try {
      await removeAdditionalImage(expenseId, fileId)
      setExistingAdditionalImages(prev => prev.filter(id => id !== fileId))
    } catch (err) {
      console.error('Error removing image:', err)
      setError('Failed to remove image')
    }
  }

  // Handle expense type change - reset sub-category
  const handleExpenseTypeChange = (newType: ExpenseTypeCategory) => {
    setExpenseType(newType)
    setSubCategory('')
  }

  // Handle form submission
  const handleSubmit = async () => {
    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }
    if (!description.trim()) {
      setError('Please enter a description')
      return
    }
    if (!expenseDate) {
      setError('Please select an expense date')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Update expense data
      const updateData: Partial<ExpenseInput> = {
        amount: parseFloat(amount),
        expenseDate: expenseDate.toISOString(),
        description: description.trim(),
        expenseType,
        subCategory: subCategory || undefined,
        vendor: vendor.trim() || undefined,
        receiptNumber: receiptNumber.trim() || undefined,
        tripId: tripId || undefined,
        vehicleId: vehicleId || undefined,
        paymentMethod,
        paymentStatus,
        isRecurring,
        recurringFrequency: isRecurring ? recurringFrequency : undefined
      }

      await updateExpense(expenseId, updateData)

      // Upload new receipt if provided
      if (newReceiptFile) {
        await uploadReceiptImage(expenseId, newReceiptFile)
      }

      // Upload new additional images if provided
      if (newAdditionalFiles.length > 0) {
        await uploadAdditionalImages(expenseId, newAdditionalFiles)
      }

      setSuccess(true)
      
      // Navigate back after success
      setTimeout(() => {
        router.push(`/edms/expenses/${expenseId}`)
      }, 1500)
    } catch (err) {
      console.error('Error updating expense:', err)
      setError('Failed to update expense. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (dataLoading) {
    return (
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Skeleton variant="rectangular" height={60} />
        </Grid>
        <Grid item xs={12} md={8}>
          <Skeleton variant="rectangular" height={500} />
        </Grid>
        <Grid item xs={12} md={4}>
          <Skeleton variant="rectangular" height={400} />
        </Grid>
      </Grid>
    )
  }

  if (!originalExpense) {
    return (
      <Alert severity="error" action={
        <Button color="inherit" onClick={() => router.push('/edms/expenses')}>
          Back to List
        </Button>
      }>
        Expense not found
      </Alert>
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Grid container spacing={6}>
        {/* Page Header */}
        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h4">
              <i className="ri-pencil-line mie-2" />
              Edit Expense
            </Typography>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => router.back()}
              startIcon={<i className="ri-arrow-left-line" />}
            >
              Back
            </Button>
          </Box>
        </Grid>

        {/* Error/Success Messages */}
        {error && (
          <Grid item xs={12}>
            <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
          </Grid>
        )}
        {success && (
          <Grid item xs={12}>
            <Alert severity="success">Expense updated successfully!</Alert>
          </Grid>
        )}

        {/* Main Form Card */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title="Expense Details" />
            <CardContent>
              <Grid container spacing={4}>
                {/* Expense Type */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Expense Type</InputLabel>
                    <Select
                      value={expenseType}
                      label="Expense Type"
                      onChange={(e) => handleExpenseTypeChange(e.target.value as ExpenseTypeCategory)}
                    >
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <MenuItem key={cat.value} value={cat.value}>
                          <Box display="flex" alignItems="center" gap={2}>
                            <i className={cat.icon} />
                            {cat.label}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Sub-Category */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Sub-Category</InputLabel>
                    <Select
                      value={subCategory}
                      label="Sub-Category"
                      onChange={(e) => setSubCategory(e.target.value)}
                    >
                      <MenuItem value="">None</MenuItem>
                      {SUB_CATEGORIES[expenseType]?.map((sub) => (
                        <MenuItem key={sub} value={sub}>
                          {sub}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>Optional - for more detailed categorization</FormHelperText>
                  </FormControl>
                </Grid>

                {/* Amount */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    InputProps={{
                      startAdornment: <InputAdornment position="start">GH₵</InputAdornment>
                    }}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>

                {/* Expense Date */}
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Expense Date"
                    value={expenseDate}
                    onChange={(date) => setExpenseDate(date || dayjs())}
                    slotProps={{
                      textField: { fullWidth: true }
                    }}
                    maxDate={dayjs()}
                  />
                </Grid>

                {/* Description */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    multiline
                    rows={2}
                    placeholder="Describe the expense..."
                  />
                </Grid>

                {/* Vendor */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Vendor / Supplier"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    placeholder="e.g., Shell Station"
                  />
                </Grid>

                {/* Receipt Number */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Receipt / Invoice Number"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    placeholder="e.g., INV-2024-001"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Side Panel - Association & Payment */}
        <Grid item xs={12} md={4}>
          <Grid container spacing={4}>
            {/* Association Card */}
            <Grid item xs={12}>
              <Card>
                <CardHeader title="Association" subheader="Link to trip or vehicle" />
                <CardContent>
                  <Grid container spacing={4}>
                    {/* Trip Selection */}
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Trip</InputLabel>
                        <Select
                          value={tripId}
                          label="Trip"
                          onChange={(e) => {
                            setTripId(e.target.value)
                            // Auto-fill vehicle from trip
                            const trip = trips.find(t => t.$id === e.target.value)
                            if (trip?.vehicle) {
                              setVehicleId(trip.vehicle)
                            }
                          }}
                        >
                          <MenuItem value="">None</MenuItem>
                          {trips.map((trip) => (
                            <MenuItem key={trip.$id} value={trip.$id}>
                              <Box>
                                <Typography variant="body2">{trip.tripNumber}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {trip.route || 'No route'}
                                </Typography>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* Vehicle Selection */}
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Vehicle</InputLabel>
                        <Select
                          value={vehicleId}
                          label="Vehicle"
                          onChange={(e) => setVehicleId(e.target.value)}
                        >
                          <MenuItem value="">None</MenuItem>
                          {vehicles.map((vehicle) => (
                            <MenuItem key={vehicle.$id} value={vehicle.$id}>
                              {vehicle.vehicleNumber}
                              {vehicle.brand && ` - ${vehicle.brand}`}
                              {vehicle.model && ` ${vehicle.model}`}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Payment Card */}
            <Grid item xs={12}>
              <Card>
                <CardHeader title="Payment Details" />
                <CardContent>
                  <Grid container spacing={4}>
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Payment Method</InputLabel>
                        <Select
                          value={paymentMethod}
                          label="Payment Method"
                          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
                        >
                          {PAYMENT_METHODS.map((method) => (
                            <MenuItem key={method.value} value={method.value}>
                              {method.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Payment Status</InputLabel>
                        <Select
                          value={paymentStatus}
                          label="Payment Status"
                          onChange={(e) => setPaymentStatus(e.target.value as PaymentStatusType)}
                        >
                          {PAYMENT_STATUSES.map((status) => (
                            <MenuItem key={status.value} value={status.value}>
                              {status.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={isRecurring}
                            onChange={(e) => setIsRecurring(e.target.checked)}
                          />
                        }
                        label="Recurring Expense"
                      />
                    </Grid>

                    {isRecurring && (
                      <Grid item xs={12}>
                        <FormControl fullWidth>
                          <InputLabel>Frequency</InputLabel>
                          <Select
                            value={recurringFrequency}
                            label="Frequency"
                            onChange={(e) => setRecurringFrequency(e.target.value as typeof recurringFrequency)}
                          >
                            <MenuItem value="daily">Daily</MenuItem>
                            <MenuItem value="weekly">Weekly</MenuItem>
                            <MenuItem value="monthly">Monthly</MenuItem>
                            <MenuItem value="yearly">Yearly</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Receipt Upload Card */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Receipt / Documentation" subheader="Manage receipt images" />
            <CardContent>
              <Grid container spacing={4}>
                {/* Existing Receipt */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" mb={2}>Main Receipt</Typography>
                  <Grid container spacing={2}>
                    {existingReceiptImage && !newReceiptFile && (
                      <Grid item>
                        <Box
                          sx={{
                            position: 'relative',
                            width: 150,
                            height: 150,
                            borderRadius: 2,
                            overflow: 'hidden'
                          }}
                        >
                          <Box
                            component="img"
                            src={getImageUrl(existingReceiptImage)}
                            alt="Receipt"
                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <IconButton
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              bgcolor: 'background.paper'
                            }}
                            onClick={handleRemoveExistingReceipt}
                          >
                            <i className="ri-close-line" />
                          </IconButton>
                          <Chip
                            label="Current"
                            size="small"
                            color="primary"
                            sx={{ position: 'absolute', bottom: 8, left: 8 }}
                          />
                        </Box>
                      </Grid>
                    )}

                    {newReceiptPreview && (
                      <Grid item>
                        <Box
                          sx={{
                            position: 'relative',
                            width: 150,
                            height: 150,
                            borderRadius: 2,
                            overflow: 'hidden'
                          }}
                        >
                          <Box
                            component="img"
                            src={newReceiptPreview}
                            alt="New Receipt"
                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <IconButton
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              bgcolor: 'background.paper'
                            }}
                            onClick={() => {
                              setNewReceiptFile(null)
                              setNewReceiptPreview(null)
                            }}
                          >
                            <i className="ri-close-line" />
                          </IconButton>
                          <Chip
                            label="New"
                            size="small"
                            color="success"
                            sx={{ position: 'absolute', bottom: 8, left: 8 }}
                          />
                        </Box>
                      </Grid>
                    )}

                    <Grid item>
                      <Box
                        sx={{
                          width: 150,
                          height: 150,
                          border: '2px dashed',
                          borderColor: 'divider',
                          borderRadius: 2,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          '&:hover': { borderColor: 'primary.main' }
                        }}
                        onClick={() => document.getElementById('receipt-upload')?.click()}
                      >
                        <i className="ri-upload-2-line" style={{ fontSize: 24 }} />
                        <Typography variant="caption" textAlign="center" mt={1}>
                          {existingReceiptImage ? 'Replace' : 'Upload'}
                        </Typography>
                      </Box>
                      <input
                        id="receipt-upload"
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={handleReceiptChange}
                      />
                    </Grid>
                  </Grid>
                </Grid>

                {/* Additional Images */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" mb={2}>Additional Documents</Typography>
                  <Grid container spacing={2}>
                    {/* Existing additional images */}
                    {existingAdditionalImages.map((fileId) => (
                      <Grid item key={fileId}>
                        <Box
                          sx={{
                            position: 'relative',
                            width: 120,
                            height: 120,
                            borderRadius: 2,
                            overflow: 'hidden'
                          }}
                        >
                          <Box
                            component="img"
                            src={getImageUrl(fileId)}
                            alt="Additional"
                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <IconButton
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              bgcolor: 'background.paper'
                            }}
                            onClick={() => handleRemoveExistingAdditional(fileId)}
                          >
                            <i className="ri-close-line" />
                          </IconButton>
                        </Box>
                      </Grid>
                    ))}

                    {/* New additional files */}
                    {newAdditionalFiles.map((file, index) => (
                      <Grid item key={index}>
                        <Box
                          sx={{
                            position: 'relative',
                            width: 120,
                            height: 120,
                            borderRadius: 2,
                            overflow: 'hidden',
                            bgcolor: 'action.hover',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Box textAlign="center">
                            <i className="ri-image-line" style={{ fontSize: 24 }} />
                            <Typography variant="caption" display="block" noWrap sx={{ maxWidth: 100 }}>
                              {file.name}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              bgcolor: 'background.paper'
                            }}
                            onClick={() => removeNewAdditionalFile(index)}
                          >
                            <i className="ri-close-line" />
                          </IconButton>
                          <Chip
                            label="New"
                            size="small"
                            color="success"
                            sx={{ position: 'absolute', bottom: 8, left: 8 }}
                          />
                        </Box>
                      </Grid>
                    ))}

                    {/* Add more button */}
                    <Grid item>
                      <Box
                        sx={{
                          width: 120,
                          height: 120,
                          border: '2px dashed',
                          borderColor: 'divider',
                          borderRadius: 2,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          '&:hover': { borderColor: 'primary.main' }
                        }}
                        onClick={() => document.getElementById('additional-upload')?.click()}
                      >
                        <i className="ri-add-line" style={{ fontSize: 24 }} />
                        <Typography variant="caption">Add More</Typography>
                      </Box>
                      <input
                        id="additional-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={handleAdditionalFilesChange}
                      />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Submit Button */}
        <Grid item xs={12}>
          <Box display="flex" justifyContent="flex-end" gap={2}>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading || success}
              startIcon={loading ? <CircularProgress size={20} /> : <i className="ri-save-line" />}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </LocalizationProvider>
  )
}

export default ExpenseEditForm
