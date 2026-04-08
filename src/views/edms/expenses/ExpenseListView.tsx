'use client'

// React Imports
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

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
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Skeleton from '@mui/material/Skeleton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TablePagination from '@mui/material/TablePagination'
import TableSortLabel from '@mui/material/TableSortLabel'
import Paper from '@mui/material/Paper'
import Tooltip from '@mui/material/Tooltip'
import Collapse from '@mui/material/Collapse'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'

// Date Picker Imports
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers-pro'
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs'
import dayjs, { Dayjs } from 'dayjs'

// Action Imports
import { getAllExpenses, markExpenseAsPaid } from '@/libs/actions/expense.actions'
import { getAllVehicles } from '@/libs/actions/vehicle.actions'
import { getAllTrips } from '@/libs/actions/trip.actions'

// Hook Imports
import { usePermissions } from '@/hooks/usePermissions'

// Dialog Imports
import OpenDialogOnElementClick from '@/components/dialogs/OpenDialogOnElementClick'
import ExpenseExportDialog from '@/components/dialogs/expense-export-dialog'

// Type Imports
import type { 
  ExpenseType, 
  ExpenseTypeCategory, 
  PaymentStatusType,
  VehicleType,
  TripType,
  ExpenseFilters
} from '@/types/apps/deliveryTypes'

// Expense Type Categories with labels
const EXPENSE_CATEGORIES: { value: ExpenseTypeCategory | ''; label: string; icon: string }[] = [
  { value: '', label: 'All Types', icon: 'ri-list-check' },
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

// Payment Status labels and colors
const PAYMENT_STATUS_CONFIG: Record<PaymentStatusType, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  paid: { label: 'Paid', color: 'success' },
  pending: { label: 'Pending', color: 'warning' },
  partial: { label: 'Partial', color: 'error' }
}

// Get expense type label
const getExpenseTypeLabel = (type: ExpenseTypeCategory): string => {
  const category = EXPENSE_CATEGORIES.find(c => c.value === type)
  return category?.label || type
}

// Get expense type icon
const getExpenseTypeIcon = (type: ExpenseTypeCategory): string => {
  const category = EXPENSE_CATEGORIES.find(c => c.value === type)
  return category?.icon || 'ri-receipt-line'
}

type Order = 'asc' | 'desc'

interface HeadCell {
  id: keyof ExpenseType | 'actions'
  label: string
  sortable: boolean
  align?: 'left' | 'center' | 'right'
}

const headCells: HeadCell[] = [
  { id: 'expenseDate', label: 'Date', sortable: true },
  { id: 'expenseType', label: 'Type', sortable: true },
  { id: 'description', label: 'Description', sortable: false },
  { id: 'vendor', label: 'Vendor', sortable: true },
  { id: 'amount', label: 'Amount', sortable: true, align: 'right' },
  { id: 'paymentStatus', label: 'Status', sortable: true, align: 'center' },
  { id: 'actions', label: 'Actions', sortable: false, align: 'center' }
]

const ExpenseListView = () => {
  const { hasPermission } = usePermissions()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Data State
  const [expenses, setExpenses] = useState<ExpenseType[]>([])
  const [vehicles, setVehicles] = useState<VehicleType[]>([])
  const [trips, setTrips] = useState<TripType[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Snackbar State
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  })

  // Read filters from URL search params (persisted across navigation)
  const searchQuery = searchParams.get('search') || ''
  const filterType = (searchParams.get('type') || '') as ExpenseTypeCategory | ''
  const filterStatus = (searchParams.get('status') || '') as PaymentStatusType | ''
  const filterVehicle = searchParams.get('vehicle') || ''
  const filterDriver = searchParams.get('driver') || ''
  // Use stable strings in dependency arrays to avoid infinite re-render loops
  const dateFromStr = searchParams.get('dateFrom') || ''
  const dateToStr = searchParams.get('dateTo') || ''
  const dateFrom = dateFromStr ? dayjs(dateFromStr) : null
  const dateTo = dateToStr ? dayjs(dateToStr) : null

  // Filter UI State
  const [showFilters, setShowFilters] = useState<boolean>(true)

  // Table State
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [order, setOrder] = useState<Order>('desc')
  const [orderBy, setOrderBy] = useState<keyof ExpenseType>('expenseDate')

  // Helper to update URL search params
  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, pathname, router])

  // Filter setters that update URL params
  const setSearchQuery = useCallback((value: string) => updateParam('search', value), [updateParam])
  const setFilterType = useCallback((value: ExpenseTypeCategory | '') => updateParam('type', value), [updateParam])
  const setFilterStatus = useCallback((value: PaymentStatusType | '') => updateParam('status', value), [updateParam])
  const setFilterVehicle = useCallback((value: string) => updateParam('vehicle', value), [updateParam])
  const setFilterDriver = useCallback((value: string) => updateParam('driver', value), [updateParam])
  const setDateFrom = useCallback((value: Dayjs | null) => updateParam('dateFrom', value ? value.format('YYYY-MM-DD') : ''), [updateParam])
  const setDateTo = useCallback((value: Dayjs | null) => updateParam('dateTo', value ? value.format('YYYY-MM-DD') : ''), [updateParam])

  // Load data on mount and when filters change
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // Build filters
        const filters: ExpenseFilters = {}
        if (filterType) filters.expenseType = filterType
        if (filterStatus) filters.paymentStatus = filterStatus
        if (filterVehicle) filters.vehicleId = filterVehicle
        if (dateFromStr || dateToStr) {
          filters.dateRange = {
            start: dateFromStr ? dayjs(dateFromStr).startOf('day').toISOString() : '',
            end: dateToStr ? dayjs(dateToStr).endOf('day').toISOString() : ''
          }
        }

        const [expensesData, vehiclesData, tripsData] = await Promise.all([
          getAllExpenses(Object.keys(filters).length > 0 ? filters : undefined),
          getAllVehicles(),
          getAllTrips()
        ])

        setExpenses(expensesData)
        setVehicles(vehiclesData)
        setTrips(tripsData)
      } catch (error) {
        console.error('Error loading expenses:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [filterType, filterStatus, filterVehicle, dateFromStr, dateToStr])

  // Get vehicle name by ID
  const getVehicleName = (vehicleId: string | undefined): string => {
    if (!vehicleId) return '-'
    const vehicle = vehicles.find(v => v.$id === vehicleId)
    return vehicle?.vehicleNumber || vehicleId
  }

  // Extract unique drivers from trips
  const drivers = useMemo(() => {
    const driverMap = new Map<string, string>()
    trips.forEach(trip => {
      if (trip.driver?.$id && trip.driver?.name) {
        driverMap.set(trip.driver.$id, trip.driver.name)
      }
    })
    return Array.from(driverMap, ([id, name]) => ({ id, name }))
  }, [trips])

  // Build a trip-to-driver lookup and driver-to-tripIds set
  const tripDriverMap = useMemo(() => {
    const map = new Map<string, string>()
    trips.forEach(trip => {
      if (trip.driver?.name) {
        map.set(trip.$id, trip.driver.name)
      }
    })
    return map
  }, [trips])

  const driverTripIds = useMemo(() => {
    if (!filterDriver) return null
    const ids = new Set<string>()
    trips.forEach(trip => {
      if (trip.driver?.$id === filterDriver) {
        ids.add(trip.$id)
      }
    })
    return ids
  }, [trips, filterDriver])

  // Get driver name for an expense (via trip)
  const getDriverName = useCallback((expense: ExpenseType): string => {
    if (!expense.tripId) return ''
    return tripDriverMap.get(expense.tripId) || ''
  }, [tripDriverMap])

  // Filter and sort expenses
  const filteredExpenses = useMemo(() => {
    let result = [...expenses]

    // Driver filter
    if (filterDriver && driverTripIds) {
      result = result.filter(expense => expense.tripId && driverTripIds.has(expense.tripId))
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(expense => 
        expense.description?.toLowerCase().includes(query) ||
        expense.vendor?.toLowerCase().includes(query) ||
        expense.receiptNumber?.toLowerCase().includes(query) ||
        expense.amount?.toString().includes(query) ||
        expense.subCategory?.toLowerCase().includes(query) ||
        expense.expenseType?.toLowerCase().includes(query) ||
        getExpenseTypeLabel(expense.expenseType)?.toLowerCase().includes(query) ||
        expense.paymentStatus?.toLowerCase().includes(query) ||
        (PAYMENT_STATUS_CONFIG[expense.paymentStatus]?.label || '').toLowerCase().includes(query) ||
        getVehicleName(expense.vehicleId)?.toLowerCase().includes(query) ||
        getDriverName(expense)?.toLowerCase().includes(query) ||
        dayjs(expense.expenseDate).format('DD MMM YYYY').toLowerCase().includes(query)
      )
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[orderBy]
      let bVal = b[orderBy]

      // Handle dates
      if (orderBy === 'expenseDate') {
        aVal = new Date(aVal as string).getTime()
        bVal = new Date(bVal as string).getTime()
      }

      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return order === 'asc' ? aVal - bVal : bVal - aVal
      }

      // Handle strings
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return order === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      return 0
    })

    return result
  }, [expenses, searchQuery, order, orderBy, vehicles, filterDriver, driverTripIds, getDriverName])

  // Paginated expenses
  const paginatedExpenses = useMemo(() => {
    return filteredExpenses.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    )
  }, [filteredExpenses, page, rowsPerPage])

  // Calculate totals
  const totals = useMemo(() => {
    const total = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    const paid = filteredExpenses
      .filter(e => e.paymentStatus === 'paid')
      .reduce((sum, e) => sum + (e.amount || 0), 0)
    const pending = filteredExpenses
      .filter(e => e.paymentStatus === 'pending')
      .reduce((sum, e) => sum + (e.amount || 0), 0)

    return { total, paid, pending }
  }, [filteredExpenses])

  // Handle sort
  const handleSort = (property: keyof ExpenseType) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  // Clear all filters
  const clearFilters = () => {
    router.replace(pathname, { scroll: false })
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2
    }).format(amount)
  }

  // Handle mark expense as paid
  const handleMarkAsPaid = async (expenseId: string) => {
    try {
      await markExpenseAsPaid(expenseId)
      setExpenses(prev => prev.map(e => 
        e.$id === expenseId ? { ...e, paymentStatus: 'paid' as PaymentStatusType } : e
      ))
      setSnackbar({ open: true, message: 'Expense marked as paid', severity: 'success' })
    } catch (error) {
      console.error('Error marking expense as paid:', error)
      setSnackbar({ open: true, message: 'Failed to mark expense as paid', severity: 'error' })
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Grid container spacing={6}>
        {/* Page Header */}
        <Grid item xs={12}>
          <Box display="flex" flexWrap={'wrap'} justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h4">
                <i className="ri-receipt-line mie-2" />
                Expenses
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage and track all expenses
              </Typography>
            </Box>
            <Box display="flex" flexWrap={'wrap'} gap={2}>
              <OpenDialogOnElementClick
                element={Button}
                elementProps={{
                  variant: 'outlined',
                  startIcon: <i className="ri-download-line" />,
                  children: 'Export',
                  disabled: filteredExpenses.length === 0
                }}
                dialog={ExpenseExportDialog}
                dialogProps={{
                  tableData: filteredExpenses,
                  totals,
                  getExpenseTypeLabel,
                  formatCurrency
                }}
              />
              {hasPermission('expenses.create') && (
                <Button
                  variant="contained"
                  startIcon={<i className="ri-add-line" />}
                  onClick={() => router.push('/edms/expenses/create')}
                >
                  Add Expense
                </Button>
              )}
            </Box>
          </Box>
        </Grid>

        {/* Summary Cards */}
        <Grid item xs={12}>
          <Grid container spacing={4}>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'primary.lighter',
                        color: 'primary.main'
                      }}
                    >
                      <i className="ri-money-dollar-circle-line" style={{ fontSize: 24 }} />
                    </Box>
                    <Box>
                      <Typography variant="h5">{formatCurrency(totals.total)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Expenses ({filteredExpenses.length})
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'success.lighter',
                        color: 'success.main'
                      }}
                    >
                      <i className="ri-checkbox-circle-line" style={{ fontSize: 24 }} />
                    </Box>
                    <Box>
                      <Typography variant="h5">{formatCurrency(totals.paid)}</Typography>
                      <Typography variant="body2" color="text.secondary">Paid</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'warning.lighter',
                        color: 'warning.main'
                      }}
                    >
                      <i className="ri-time-line" style={{ fontSize: 24 }} />
                    </Box>
                    <Box>
                      <Typography variant="h5">{formatCurrency(totals.pending)}</Typography>
                      <Typography variant="body2" color="text.secondary">Pending</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Filters Card */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title={
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" alignItems="center" gap={1}>
                    <i className="ri-filter-line" />
                    <Typography variant="h6">Filters</Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Button
                      size="small"
                      onClick={clearFilters}
                      startIcon={<i className="ri-refresh-line" />}
                    >
                      Clear
                    </Button>
                    <IconButton onClick={() => setShowFilters(!showFilters)}>
                      <i className={showFilters ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} />
                    </IconButton>
                  </Box>
                </Box>
              }
            />
            <Collapse in={showFilters}>
              <CardContent>
                <Grid container spacing={4}>
                  {/* Search */}
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Search expenses..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <i className="ri-search-line" />
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>

                  {/* Type Filter */}
                  <Grid item xs={12} sm={6} md={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={filterType}
                        label="Type"
                        onChange={(e) => setFilterType(e.target.value as ExpenseTypeCategory | '')}
                      >
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <MenuItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Status Filter */}
                  <Grid item xs={12} sm={6} md={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={filterStatus}
                        label="Status"
                        onChange={(e) => setFilterStatus(e.target.value as PaymentStatusType | '')}
                      >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="paid">Paid</MenuItem>
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="partial">Partial</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Vehicle Filter */}
                  <Grid item xs={12} sm={6} md={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Vehicle</InputLabel>
                      <Select
                        value={filterVehicle}
                        label="Vehicle"
                        onChange={(e) => setFilterVehicle(e.target.value)}
                      >
                        <MenuItem value="">All</MenuItem>
                        {vehicles.map((v) => (
                          <MenuItem key={v.$id} value={v.$id}>
                            {v.vehicleNumber}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Driver Filter
                  <Grid item xs={12} sm={6} md={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Driver</InputLabel>
                      <Select
                        value={filterDriver}
                        label="Driver"
                        onChange={(e) => setFilterDriver(e.target.value)}
                      >
                        <MenuItem value="">All</MenuItem>
                        {drivers.map((d) => (
                          <MenuItem key={d.id} value={d.id}>
                            {d.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid> */}

                  {/* Date From */}
                  <Grid item xs={12} sm={6} md={1.5}>
                    <DatePicker
                      label="From"
                      value={dateFrom}
                      onChange={setDateFrom}
                      slotProps={{
                        textField: { size: 'small', fullWidth: true },
                        field: { clearable: true }
                      }}
                    />
                  </Grid>

                  {/* Date To */}
                  <Grid item xs={12} sm={6} md={1.5}>
                    <DatePicker
                      label="To"
                      value={dateTo}
                      onChange={setDateTo}
                      slotProps={{
                        textField: { size: 'small', fullWidth: true },
                        field: { clearable: true }
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Collapse>
          </Card>
        </Grid>

        {/* Expenses Table */}
        <Grid item xs={12}>
          <Card>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    {headCells.map((headCell) => (
                      <TableCell
                        key={headCell.id}
                        align={headCell.align || 'left'}
                        sortDirection={orderBy === headCell.id ? order : false}
                      >
                        {headCell.sortable ? (
                          <TableSortLabel
                            active={orderBy === headCell.id}
                            direction={orderBy === headCell.id ? order : 'asc'}
                            onClick={() => handleSort(headCell.id as keyof ExpenseType)}
                          >
                            {headCell.label}
                          </TableSortLabel>
                        ) : (
                          headCell.label
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    [...Array(5)].map((_, index) => (
                      <TableRow key={index}>
                        {headCells.map((_, cellIndex) => (
                          <TableCell key={cellIndex}>
                            <Skeleton variant="text" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : paginatedExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={headCells.length} align="center">
                        <Box py={6}>
                          <i className="ri-receipt-line" style={{ fontSize: 48, color: 'var(--mui-palette-text-secondary)' }} />
                          <Typography variant="h6" color="text.secondary" mt={2}>
                            No expenses found
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Try adjusting your filters or add a new expense
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedExpenses.map((expense) => (
                      <TableRow
                        key={expense.$id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => router.push(`/edms/expenses/${expense.$id}`)}
                      >
                        <TableCell>
                          <Typography variant="body2">
                            {dayjs(expense.expenseDate).format('DD MMM YYYY')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <i className={getExpenseTypeIcon(expense.expenseType)} />
                            <Box>
                              <Typography variant="body2">
                                {getExpenseTypeLabel(expense.expenseType)}
                              </Typography>
                              {expense.subCategory && (
                                <Typography variant="caption" color="text.secondary">
                                  {expense.subCategory}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {expense.description}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {expense.vendor || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600}>
                            {formatCurrency(expense.amount)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            size="small"
                            variant="outlined"
                            label={PAYMENT_STATUS_CONFIG[expense.paymentStatus]?.label || expense.paymentStatus}
                            color={PAYMENT_STATUS_CONFIG[expense.paymentStatus]?.color || 'default'}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" justifyContent="center" gap={1}>
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/edms/expenses/${expense.$id}`)
                                }}
                              >
                                <i className="ri-eye-line" />
                              </IconButton>
                            </Tooltip>
                            {hasPermission('expenses.edit') && expense.paymentStatus !== 'paid' && (
                              <Tooltip title="Mark as Paid">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleMarkAsPaid(expense.$id)
                                  }}
                                >
                                  <i className="ri-checkbox-circle-line" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {hasPermission('expenses.edit') && (
                              <Tooltip title="Edit">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    router.push(`/edms/expenses/${expense.$id}/edit`)
                                  }}
                                >
                                  <i className="ri-pencil-line" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={filteredExpenses.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10))
                setPage(0)
              }}
            />
          </Card>
        </Grid>
      </Grid>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </LocalizationProvider>
  )
}

export default ExpenseListView
