'use client'

// React Imports
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

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
import Autocomplete from '@mui/material/Autocomplete'

// Date Picker Imports
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers-pro'
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs'
import dayjs, { Dayjs } from 'dayjs'

// Action Imports
import { createExpenseWithReceipt } from '@/libs/actions/expense.actions'
import { getAllTrips } from '@/libs/actions/trip.actions'
import { getAllVehicles } from '@/libs/actions/vehicle.actions'

// Type Imports
import type { 
  ExpenseInput, 
  ExpenseTypeCategory, 
  PaymentMethodType, 
  PaymentStatusType,
  TripType,
  VehicleType
} from '@/types/apps/deliveryTypes'

// Auth Hook
import { useAuth } from '@/contexts/AppwriteProvider'

// Expense Type Categories with labels
const EXPENSE_CATEGORIES: { value: ExpenseTypeCategory; label: string; icon: string }[] = [
  { value: 'fuel', label: 'Fuel', icon: 'ri-gas-station-line' },
  { value: 'maintenance', label: 'Maintenance & Repairs', icon: 'ri-tools-line' },
  { value: 'tools', label: 'Tools', icon: 'ri-hammer-line' },
  { value: 'equipment', label: 'Equipment', icon: 'ri-settings-3-line' },
  { value: 'vehicle_purchase', label: 'Vehicle Purchase', icon: 'ri-car-line' },
  { value: 'office', label: 'Office Supplies', icon: 'ri-building-2-line' },
  { value: 'salary', label: 'Salary & Wages', icon: 'ri-money-dollar-circle-line' },
  { value: 'allowance', label: 'Allowance', icon: 'ri-hand-coin-line' },
  { value: 'truck_rental', label: 'Truck Rentals', icon: 'ri-truck-line' },
  { value: 'communication', label: 'Communication', icon: 'ri-phone-line' },
  { value: 'utilities', label: 'Utilities', icon: 'ri-lightbulb-line' },
  { value: 'trip_related', label: 'Trip Related', icon: 'ri-truck-line' },
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
  allowance: ['Driver Allowance', 'Mate Allowance', 'Bonus', 'Overtime'],
  truck_rental: ['Monthly Rental', 'Trip-based Rental'],
  communication: ['Airtime', 'Internet', 'Phone Bills'],
  utilities: ['Electricity', 'Water', 'Rent'],
  trip_related: ['Toll Fees', 'Parking', 'Loading', 'Accommodation', 'Meals', 'Permits'],
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

const ExpenseCreateForm = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  // Get context from URL params
  const tripIdFromUrl = searchParams.get('tripId')
  const vehicleIdFromUrl = searchParams.get('vehicleId')

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
  const [tripId, setTripId] = useState<string>(tripIdFromUrl || '')
  const [vehicleId, setVehicleId] = useState<string>(vehicleIdFromUrl || '')
  const [isRecurring, setIsRecurring] = useState<boolean>(false)
  const [recurringFrequency, setRecurringFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly')

  // Receipt Files
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([])
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)

  // Data Loading
  const [trips, setTrips] = useState<TripType[]>([])
  const [vehicles, setVehicles] = useState<VehicleType[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [dataLoading, setDataLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  // Load trips and vehicles on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setDataLoading(true)
        const [tripsData, vehiclesData] = await Promise.all([
          getAllTrips(), // Load all trips - no filter to allow linking expense to any trip
          getAllVehicles()
        ])
        setTrips(tripsData)
        setVehicles(vehiclesData.filter(v => v.status === 'active'))

        // If tripId is provided, get vehicle from trip
        if (tripIdFromUrl) {
          const trip = tripsData.find(t => t.$id === tripIdFromUrl)
          if (trip && trip.vehicle && !vehicleIdFromUrl) {
            setVehicleId(trip.vehicle)
          }
        }
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setDataLoading(false)
      }
    }

    loadData()
  }, [tripIdFromUrl, vehicleIdFromUrl])

  // Handle receipt file selection
  const handleReceiptChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setReceiptFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle additional files selection
  const handleAdditionalFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setAdditionalFiles(prev => [...prev, ...files])
  }

  // Remove additional file
  const removeAdditionalFile = (index: number) => {
    setAdditionalFiles(prev => prev.filter((_, i) => i !== index))
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
      const expenseData: ExpenseInput = {
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

      await createExpenseWithReceipt(
        expenseData,
        user?.$id || 'system',
        receiptFile || undefined,
        additionalFiles.length > 0 ? additionalFiles : undefined
      )

      setSuccess(true)
      
      // Navigate back after success
      setTimeout(() => {
        if (tripIdFromUrl) {
          router.push(`/edms/trips/${tripIdFromUrl}`)
        } else {
          router.push('/edms/expenses')
        }
      }, 1500)
    } catch (err) {
      console.error('Error creating expense:', err)
      setError('Failed to create expense. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Get selected trip info
  const selectedTrip = trips.find(t => t.$id === tripId)
  const selectedVehicle = vehicles.find(v => v.$id === vehicleId)

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Grid container spacing={6}>
        {/* Page Header */}
        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h4">
              <i className="ri-receipt-line mie-2" />
              Add New Expense
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

        {/* Context Alert */}
        {(tripIdFromUrl || vehicleIdFromUrl) && (
          <Grid item xs={12}>
            <Alert severity="info" icon={<i className="ri-information-line" />}>
              {tripIdFromUrl && selectedTrip && (
                <span>
                  Creating expense for trip <strong>{selectedTrip.tripNumber}</strong>
                </span>
              )}
              {!tripIdFromUrl && vehicleIdFromUrl && selectedVehicle && (
                <span>
                  Creating expense for vehicle <strong>{selectedVehicle.licensePlate}</strong>
                </span>
              )}
            </Alert>
          </Grid>
        )}

        {/* Error/Success Messages */}
        {error && (
          <Grid item xs={12}>
            <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
          </Grid>
        )}
        {success && (
          <Grid item xs={12}>
            <Alert severity="success">Expense created successfully!</Alert>
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
                      <Autocomplete
                        fullWidth
                        disabled={dataLoading}
                        options={trips}
                        getOptionLabel={t => t.tripNumber || ''}
                        value={trips.find(t => t.$id === tripId) || null}
                        onChange={(_, selected) => {
                          setTripId(selected?.$id || '')
                          // Auto-fill vehicle from trip
                          if (selected?.vehicle) {
                            const vid = typeof selected.vehicle === 'object'
                              ? (selected.vehicle as any).$id
                              : selected.vehicle
                            setVehicleId(vid)
                          }
                        }}
                        renderOption={(props, trip) => (
                          <li {...props} key={trip.$id}>
                            <Box display='flex' flexDirection='column'>
                              <Box display='flex' alignItems='center' gap={1}>
                                <Typography variant='body2'>{trip.tripNumber}</Typography>
                                <Chip
                                  label={trip.status?.replace('_', ' ')}
                                  size='small'
                                  variant='outlined'
                                  color={
                                    trip.status === 'completed' ? 'success' :
                                    trip.status === 'in_progress' ? 'primary' :
                                    trip.status === 'cancelled' ? 'error' : 'default'
                                  }
                                />
                              </Box>
                              <Typography variant='caption' color='text.secondary'>
                                {trip.tripDate ? new Date(trip.tripDate).toLocaleDateString() : 'No date'}
                                {trip.driver && typeof trip.driver === 'object' && ` • ${(trip.driver as any).name || 'Unknown driver'}`}
                              </Typography>
                            </Box>
                          </li>
                        )}
                        renderInput={params => (
                          <TextField {...params} label='Trip' placeholder='Search by trip number...' />
                        )}
                        noOptionsText='No trips available'
                        isOptionEqualToValue={(option, value) => option.$id === value.$id}
                      />
                    </Grid>

                    {/* Vehicle Selection */}
                    <Grid item xs={12}>
                      <Autocomplete
                        fullWidth
                        disabled={dataLoading}
                        options={vehicles}
                        getOptionLabel={v => `${v.vehicleNumber}${v.brand ? ' - ' + v.brand : ''}${v.model ? ' ' + v.model : ''}`}
                        value={vehicles.find(v => v.$id === vehicleId) || null}
                        onChange={(_, selected) => setVehicleId(selected?.$id || '')}
                        renderOption={(props, vehicle) => (
                          <li {...props} key={vehicle.$id}>
                            <div>
                              <Typography variant='body2'>{vehicle.vehicleNumber}</Typography>
                              {(vehicle.brand || vehicle.model) && (
                                <Typography variant='caption' color='text.secondary'>
                                  {vehicle.brand} {vehicle.model}
                                </Typography>
                              )}
                            </div>
                          </li>
                        )}
                        renderInput={params => (
                          <TextField {...params} label='Vehicle' placeholder='Search vehicle...' />
                        )}
                        noOptionsText='No active vehicles available'
                        isOptionEqualToValue={(option, value) => option.$id === value.$id}
                      />
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
            <CardHeader title="Receipt / Documentation" subheader="Upload receipt images (optional)" />
            <CardContent>
              <Grid container spacing={4}>
                {/* Main Receipt */}
                <Grid item xs={12} sm={6} md={4}>
                  <Box
                    sx={{
                      border: '2px dashed',
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: 3,
                      textAlign: 'center',
                      cursor: 'pointer',
                      '&:hover': { borderColor: 'primary.main' }
                    }}
                    onClick={() => document.getElementById('receipt-upload')?.click()}
                  >
                    {receiptPreview ? (
                      <Box>
                        <Box
                          component="img"
                          src={receiptPreview}
                          alt="Receipt preview"
                          sx={{ maxWidth: '100%', maxHeight: 200, mb: 2, borderRadius: 1 }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {receiptFile?.name}
                        </Typography>
                        <Button
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation()
                            setReceiptFile(null)
                            setReceiptPreview(null)
                          }}
                        >
                          Remove
                        </Button>
                      </Box>
                    ) : (
                      <Box>
                        <i className="ri-upload-cloud-line" style={{ fontSize: 48, color: 'var(--mui-palette-text-secondary)' }} />
                        <Typography variant="body1" mt={2}>
                          Click to upload receipt
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          PNG, JPG up to 5MB
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <input
                    id="receipt-upload"
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleReceiptChange}
                  />
                </Grid>

                {/* Additional Files */}
                <Grid item xs={12} sm={6} md={8}>
                  <Typography variant="subtitle2" mb={2}>
                    Additional Documents
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<i className="ri-add-line" />}
                    onClick={() => document.getElementById('additional-upload')?.click()}
                    sx={{ mb: 2 }}
                  >
                    Add More Files
                  </Button>
                  <input
                    id="additional-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={handleAdditionalFilesChange}
                  />
                  {additionalFiles.length > 0 && (
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {additionalFiles.map((file, index) => (
                        <Chip
                          key={index}
                          label={file.name}
                          onDelete={() => removeAdditionalFile(index)}
                          size="small"
                          icon={<i className="ri-image-line" />}
                        />
                      ))}
                    </Box>
                  )}
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
              {loading ? 'Saving...' : 'Save Expense'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </LocalizationProvider>
  )
}

export default ExpenseCreateForm
