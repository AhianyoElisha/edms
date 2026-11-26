'use client'

// React Imports
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'

// Next Imports
import Link from 'next/link'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Checkbox from '@mui/material/Checkbox'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Alert from '@mui/material/Alert'
import Collapse from '@mui/material/Collapse'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TablePagination from '@mui/material/TablePagination'
import CircularProgress from '@mui/material/CircularProgress'

// Third-party Imports
import { Query } from 'appwrite'
import dayjs from 'dayjs'
import { toast } from 'react-toastify'

// Component Imports
import CompanyFilterSelect from '@/components/edms/CompanyFilterSelect'
import TripTitle from '@/components/edms/TripTitle'
import OpenDialogOnElementClick from '@/components/dialogs/OpenDialogOnElementClick'
import GenericTableExportDialog from '@/components/dialogs/generic-table-export-dialog'
import type { ExportColumn, ExportSummary } from '@/components/dialogs/generic-table-export-dialog'

// Hook Imports
import { useUrlFilters } from '@/hooks/useUrlFilters'
import { usePermissions } from '@/hooks/usePermissions'

// Action Imports
import { listTripsAroundMonth, setTripsBilling, setTripsInvoiceMonth } from '@/libs/actions/tripMonth.actions'
import { getCompanies } from '@/libs/actions/company.actions'
import { getLossesForTrips, owedValue } from '@/libs/actions/driverloss.actions'
import { getAllExpenses } from '@/libs/actions/expense.actions'

// Util Imports
import { monthKey, monthLabel, parseMonthKey, periodLabel, shiftMonthKey } from '@/utils/invoiceMonth'
import type { InvoicePeriod } from '@/utils/invoiceMonth'
import { byDriver, splitExpenses, sumPrice, toBreakdownExpense, toBreakdownTrip } from './breakdown'
import type { BreakdownExpense, BreakdownTrip, DriverBreakdown, ExpenseGroup } from './breakdown'
import { tripLabel } from '@/utils/tripLabel'

// Only what the page shows; the relationship fields keep each page of results small
const TRIP_FIELDS = [
  '$id', 'tripNumber', 'tripDate', 'status', 'tripCost', 'clientRate', 'tonnage', 'companyId', 'billingMonth', 'billingPeriod', 'invoiceGenerated', 'paymentStatus',
  'driver.$id', 'driver.name', 'vehicle.$id', 'vehicle.vehicleNumber', 'route.$id', 'route.routeName',
  'manifests.status', 'manifests.deliveryTime', 'manifests.packageCount', 'manifests.deliveredCount',
  'manifests.shortageCount', 'manifests.surplusCount'
]

type View = 'trips' | 'drivers' | 'losses'
type Show = 'invoice' | 'movedOut' | 'movedIn' | 'lateClose' | 'all'

const money = (value: number) =>
  new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 }).format(value)

const day = (value?: string) => (value ? dayjs(value).format('D MMM YYYY') : '')
const statusLabel = (status: string) => status.replace(/_/g, ' ')
const typeLabel = (type: string) => type.replace(/_/g, ' ').replace(/^./, letter => letter.toUpperCase())

// A driver row on the By driver tab: their trips on the invoice and their expenses
type DriverRow = DriverBreakdown & { expenses: ExpenseGroup | null }

const expensesOf = (row: { expenses: ExpenseGroup | null }) => row.expenses?.total || 0

// The trip as the shared trip label reads it ("No route" is a placeholder, not a route)
const labelTrip = (trip: BreakdownTrip) => ({ ...trip, routeName: trip.routeName === 'No route' ? '' : trip.routeName })

const MonthlyBreakdown = () => {
  const { searchParams, setParam, setParams } = useUrlFilters()
  const { hasPermission, canViewFinancials, isAdmin } = usePermissions()
  const canMove = isAdmin || hasPermission('trips.manage') || hasPermission('trips.edit')

  const now = new Date()
  const month = /^\d{4}-\d{2}$/.test(searchParams.get('month') || '') ? searchParams.get('month')! : monthKey(now.getFullYear(), now.getMonth())
  const nextMonth = shiftMonthKey(month, 1)
  const view = (searchParams.get('view') || 'trips') as View
  const show = (searchParams.get('show') || 'invoice') as Show
  const companyId = searchParams.get('company') || ''
  const search = searchParams.get('search') || ''

  // Which of a twice-monthly client's invoices is being looked at; 0 is the whole month
  const period = (['1', '2'].includes(searchParams.get('invoice') || '') ? Number(searchParams.get('invoice')) : 0) as InvoicePeriod

  const [trips, setTrips] = useState<any[]>([])

  // Each company's cut-off day, for those invoiced twice a month
  const [cutoffs, setCutoffs] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [openDriver, setOpenDriver] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const { year, month: monthIndex } = parseMonthKey(month)
      const { inMonth, movedIn } = await listTripsAroundMonth<any>(monthIndex, year, 'rows', [Query.select(TRIP_FIELDS)])

      setTrips([...inMonth, ...movedIn])
    } catch (loadError) {
      console.error('Error loading the monthly breakdown:', loadError)
      setError('Could not load the trips for this month.')
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => {
    setSelected(new Set())
    load()
  }, [load])

  useEffect(() => {
    getCompanies()
      .then(companies =>
        setCutoffs(new Map(companies.filter(c => c.invoiceCutoffDay).map(c => [c.$id, c.invoiceCutoffDay as number])))
      )
      .catch(loadError => console.error('Error loading companies:', loadError))
  }, [])

  const rows = useMemo(
    () =>
      trips
        .map(trip => toBreakdownTrip(trip, month, cutoffs.get(trip.companyId) || null, period))
        .sort((a, b) => a.tripDate.localeCompare(b.tripDate) || a.tripNumber.localeCompare(b.tripNumber)),
    [trips, month, cutoffs, period]
  )

  // The first/second invoice choice only means something for a twice-monthly client
  const hasPeriods = companyId ? cutoffs.has(companyId) : cutoffs.size > 0
  const cutoffDay = companyId ? cutoffs.get(companyId) : cutoffs.size === 1 ? [...cutoffs.values()][0] : undefined
  const slotLabel = (style: 'long' | 'short' = 'long') => `${monthLabel(month, style)}${period ? `, ${periodLabel(period)}` : ''}`

  // "October 2026 invoice", or "October 2026 1st invoice" for one of two
  const invoiceName = `${monthLabel(month)} ${period ? periodLabel(period) : 'invoice'}`

  useEffect(() => {
    setPage(0)
    setSelected(new Set())
  }, [month, show, companyId, search, view, period])

  const ofCompany = useMemo(() => (companyId ? rows.filter(trip => trip.companyId === companyId) : rows), [rows, companyId])

  // The month's sums: what was run, what left, what came in, what is invoiced
  const totals = useMemo(() => {
    const run = ofCompany.filter(trip => trip.runIn)
    const movedOut = ofCompany.filter(trip => trip.movedOut)
    const movedIn = ofCompany.filter(trip => trip.movedIn)
    const invoice = ofCompany.filter(trip => trip.invoiceIn)

    return { run, movedOut, movedIn, invoice }
  }, [ofCompany])

  const listed = useMemo(() => {
    const term = search.trim().toLowerCase()

    const base =
      show === 'movedOut' ? totals.movedOut
      : show === 'movedIn' ? totals.movedIn
      : show === 'lateClose' ? totals.invoice.filter(trip => trip.runIn && trip.closedAfterRunMonth)
      : show === 'all' ? ofCompany
      : totals.invoice

    return term
      ? base.filter(trip =>
          [trip.tripNumber, trip.driverName, trip.vehicleNumber, trip.routeName].some(value => value.toLowerCase().includes(term))
        )
      : base
  }, [show, totals, ofCompany, search])

  // ---- Expenses, to set beside the revenue ----
  // The ones dated in the invoice's window (the month, or its half for a twice-monthly
  // client), plus any linked to a trip listed here whatever their date
  const [expenses, setExpenses] = useState<BreakdownExpense[]>([])
  const [expensesLoading, setExpensesLoading] = useState(false)
  const [expensesError, setExpensesError] = useState('')
  const companyTripKey = ofCompany.map(trip => trip.$id).join(',')

  const expenseWindow = useMemo(() => {
    const start = dayjs(`${month}-01`).startOf('month')
    const end = start.endOf('month')

    if (period === 1 && cutoffDay) return { start, end: start.date(cutoffDay).endOf('day') }
    if (period === 2 && cutoffDay) return { start: start.date(cutoffDay + 1), end }

    return { start, end }
  }, [month, period, cutoffDay])

  useEffect(() => {
    if (!canViewFinancials || loading) return

    let cancelled = false
    const tripIds = companyTripKey ? companyTripKey.split(',') : []

    const chunks: string[][] = []

    for (let i = 0; i < tripIds.length; i += 100) chunks.push(tripIds.slice(i, i + 100))

    setExpensesLoading(true)
    setExpensesError('')

    Promise.all([
      getAllExpenses({ dateRange: { start: expenseWindow.start.toISOString(), end: expenseWindow.end.toISOString() } }),
      ...chunks.map(chunk => getAllExpenses({ tripIds: chunk }))
    ])
      .then(results => {
        if (!cancelled) setExpenses(results.flat().map(toBreakdownExpense))
      })
      .catch(loadError => {
        console.error('Error loading expenses for the breakdown:', loadError)
        if (!cancelled) {
          setExpenses([])
          setExpensesError('Could not load the expenses for this period.')
        }
      })
      .finally(() => {
        if (!cancelled) setExpensesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [canViewFinancials, loading, companyTripKey, expenseWindow])

  // What each listed trip spent (only expenses recorded against the trip itself)
  const tripExpenses = useMemo(() => splitExpenses(expenses, ofCompany).byTrip, [expenses, ofCompany])

  // The invoice's expenses: on its trips, on its drivers, and the rest
  const invoiceExpenses = useMemo(() => splitExpenses(expenses, totals.invoice), [expenses, totals.invoice])

  // Expenses are not kept per company, so with a company picked only the drivers on
  // its trips are shown, and costs not tied to a driver are left out
  const showAllExpenses = !companyId

  const drivers: DriverRow[] = useMemo(() => {
    const rows: DriverRow[] = byDriver(totals.invoice).map(driver => ({
      ...driver,
      expenses: invoiceExpenses.byDriver.get(driver.driverId || 'none') || null
    }))

    if (showAllExpenses) {
      const listedIds = new Set(rows.map(row => row.driverId || 'none'))

      // Drivers with expenses in the period but no trips on this invoice
      invoiceExpenses.byDriver.forEach((group, driverId) => {
        if (listedIds.has(driverId)) return

        rows.push({
          driverId: driverId === 'none' ? '' : driverId,
          driverName: group.driverName,
          trips: 0,
          cancelled: 0,
          amount: 0,
          lines: [],
          packagesSent: 0,
          packagesDelivered: 0,
          packagesShort: 0,
          packagesExtra: 0,
          tripsWithShortage: [],
          expenses: group
        })
      })
    }

    return rows
  }, [totals.invoice, invoiceExpenses, showAllExpenses])

  const revenueTotal = sumPrice(totals.invoice)
  const unassignedExpenses = showAllExpenses ? invoiceExpenses.unassigned.total : 0
  const driverExpensesTotal = drivers.reduce((sum, driver) => sum + expensesOf(driver), 0)
  const expensesTotal = driverExpensesTotal + unassignedExpenses

  // What the loss sheet charges each driver for this invoice's trips (priced items still owed)
  const [lossValues, setLossValues] = useState<Record<string, number>>({})
  const invoiceTripKey = totals.invoice.map(trip => trip.$id).join(',')

  useEffect(() => {
    if (view !== 'losses' || !invoiceTripKey) {
      setLossValues({})

      return
    }

    let cancelled = false

    getLossesForTrips(invoiceTripKey.split(','))
      .then(losses => {
        if (cancelled) return

        const byDriver: Record<string, number> = {}

        losses.forEach(loss => {
          byDriver[loss.driverId] = (byDriver[loss.driverId] || 0) + owedValue(loss)
        })
        setLossValues(byDriver)
      })
      .catch(loadError => console.error('Error loading loss values:', loadError))

    return () => {
      cancelled = true
    }
  }, [view, invoiceTripKey])

  const lossValue = (driverId: string) => Math.round((lossValues[driverId] || 0) * 100) / 100
  const lateCloseCount = useMemo(() => totals.invoice.filter(trip => trip.runIn && trip.closedAfterRunMonth).length, [totals.invoice])

  const selectedTrips = listed.filter(trip => selected.has(trip.$id))
  const allListedSelected = listed.length > 0 && selectedTrips.length === listed.length

  const toggle = (tripId: string) =>
    setSelected(current => {
      const next = new Set(current)

      if (next.has(tripId)) next.delete(tripId)
      else next.add(tripId)

      return next
    })

  // `targetPeriod` names one of the month's two invoices; without it a trip moved to
  // another month lands on that month's first
  const move = async (target: string | null, targetPeriod: 1 | 2 | null = null) => {
    if (selectedTrips.length === 0) return

    setSaving(true)

    // A trip sent back to the month it was run in needs no override at all
    const result = await setTripsInvoiceMonth(selectedTrips.map(trip => trip.$id), target, targetPeriod)

    setSaving(false)

    if (result.changed > 0) {
      toast.success(
        target
          ? `${result.changed} trip${result.changed === 1 ? '' : 's'} moved to the ${monthLabel(target)}${targetPeriod ? ` ${periodLabel(targetPeriod)}` : ' invoice'}`
          : `${result.changed} trip${result.changed === 1 ? '' : 's'} put back in the month ${result.changed === 1 ? 'it was' : 'they were'} run`
      )
    }

    if (result.failed > 0) toast.error(`${result.failed} could not be changed: ${result.firstError}`)

    setSelected(new Set())
    load()
  }

  // Record that the ticked trips were invoiced to the client, paid, or neither
  const bill = async (update: { invoiced: boolean; paid?: boolean }, done: string) => {
    if (selectedTrips.length === 0) return

    setSaving(true)

    const result = await setTripsBilling(selectedTrips.map(trip => trip.$id), update)

    setSaving(false)

    if (result.changed > 0) toast.success(`${result.changed} trip${result.changed === 1 ? '' : 's'} ${done}`)
    if (result.failed > 0) toast.error(`${result.failed} could not be changed: ${result.firstError}`)

    setSelected(new Set())
    load()
  }

  const tripColumns: ExportColumn[] = [
    { header: 'Trip', accessor: (trip: BreakdownTrip) => tripLabel(labelTrip(trip)), width: 40, excelWidth: 44 },
    { header: 'Trip date', accessor: (trip: BreakdownTrip) => day(trip.tripDate), width: 16, excelWidth: 14 },
    { header: 'Driver', accessor: (trip: BreakdownTrip) => trip.driverName, width: 22, excelWidth: 22 },
    { header: 'Vehicle', accessor: (trip: BreakdownTrip) => trip.vehicleNumber, width: 16, excelWidth: 14 },
    { header: 'Route', accessor: (trip: BreakdownTrip) => trip.routeName, width: 28, excelWidth: 32 },
    ...(canViewFinancials
      ? [
          { header: 'Price (GH₵)', accessor: (trip: BreakdownTrip) => (trip.earns ? trip.price.toFixed(2) : '0.00'), align: 'right' as const, width: 16, excelWidth: 14 },
          { header: 'Expenses (GH₵)', accessor: (trip: BreakdownTrip) => (tripExpenses.get(trip.$id)?.total || 0).toFixed(2), align: 'right' as const, width: 16, excelWidth: 14 },
          { header: 'Net (GH₵)', accessor: (trip: BreakdownTrip) => ((trip.earns ? trip.price : 0) - (tripExpenses.get(trip.$id)?.total || 0)).toFixed(2), align: 'right' as const, width: 16, excelWidth: 14 }
        ]
      : []),
    { header: 'Status', accessor: (trip: BreakdownTrip) => statusLabel(trip.status), width: 15, excelWidth: 18 },
    { header: 'Closed', accessor: (trip: BreakdownTrip) => day(trip.closedAt), width: 16, excelWidth: 14 },
    { header: 'Invoice month', accessor: (trip: BreakdownTrip) => `${monthLabel(trip.invoiceMonth)}${trip.invoicePeriod ? `, ${periodLabel(trip.invoicePeriod)}` : ''}`, width: 20, excelWidth: 24 },
    { header: 'Invoice', accessor: (trip: BreakdownTrip) => (trip.paid ? 'Paid' : trip.invoiced ? 'Invoiced' : 'Not invoiced'), width: 13, excelWidth: 14 }
  ]

  // Each driver's routes, then a line with their revenue beside their expenses
  const driverExportRows = [
    ...drivers.flatMap(driver => [
      ...driver.lines.map(line => ({ driverName: driver.driverName, ...line, expenses: null, net: null })),
      ...(canViewFinancials
        ? [
            {
              driverName: driver.driverName,
              routeName: `Total for ${driver.driverName}`,
              tonnage: '',
              trips: driver.trips,
              price: null,
              amount: driver.amount,
              expenses: expensesOf(driver),
              net: driver.amount - expensesOf(driver)
            }
          ]
        : [])
    ]),
    ...(canViewFinancials && unassignedExpenses > 0
      ? [{ driverName: 'Not tied to a driver', routeName: '', tonnage: '', trips: 0, price: null, amount: 0, expenses: unassignedExpenses, net: -unassignedExpenses }]
      : [])
  ]

  const optionalMoney = (value: number | null) => (value === null ? '' : value.toFixed(2))

  const driverColumns: ExportColumn[] = [
    { header: 'Driver', accessor: (row: any) => row.driverName, width: 34, excelWidth: 24 },
    { header: 'Route', accessor: (row: any) => row.routeName, width: 60, excelWidth: 34 },
    { header: 'Tonnage', accessor: (row: any) => row.tonnage || '-', align: 'right', width: 20, excelWidth: 10 },
    { header: 'Trips', accessor: (row: any) => row.trips, align: 'right', width: 16, excelWidth: 8 },
    ...(canViewFinancials
      ? [
          { header: 'Price (GH₵)', accessor: (row: any) => optionalMoney(row.price), align: 'right' as const, width: 24, excelWidth: 14 },
          { header: 'Revenue (GH₵)', accessor: (row: any) => row.amount.toFixed(2), align: 'right' as const, width: 28, excelWidth: 16 },
          { header: 'Expenses (GH₵)', accessor: (row: any) => optionalMoney(row.expenses), align: 'right' as const, width: 28, excelWidth: 16 },
          { header: 'Net (GH₵)', accessor: (row: any) => optionalMoney(row.net), align: 'right' as const, width: 28, excelWidth: 16 }
        ]
      : [])
  ]

  const lossRows = drivers.filter(driver => driver.trips + driver.cancelled > 0).filter(driver => driver.packagesSent > 0 || driver.packagesShort > 0 || lossValue(driver.driverId) > 0)

  const lossColumns: ExportColumn[] = [
    { header: 'Driver', accessor: (row: any) => row.driverName, width: 52, excelWidth: 24 },
    { header: 'Trips', accessor: (row: any) => row.trips + row.cancelled, align: 'right', width: 18, excelWidth: 8 },
    { header: 'Packages loaded', accessor: (row: any) => row.packagesSent, align: 'right', width: 28, excelWidth: 16 },
    { header: 'Delivered', accessor: (row: any) => row.packagesDelivered, align: 'right', width: 24, excelWidth: 12 },
    { header: 'Short', accessor: (row: any) => row.packagesShort, align: 'right', width: 18, excelWidth: 8 },
    { header: 'Extra', accessor: (row: any) => row.packagesExtra, align: 'right', width: 18, excelWidth: 8 },
    { header: 'Owed (GH₵)', accessor: (row: any) => lossValue(row.driverId).toFixed(2), align: 'right', width: 26, excelWidth: 14 }
  ]

  const exportSummary: ExportSummary[] = [
    { label: 'Invoice', value: slotLabel() },
    { label: 'Trips on the invoice', value: String(totals.invoice.length) },
    ...(canViewFinancials
      ? [
          { label: 'Invoice total', value: money(revenueTotal) },
          { label: 'Expenses', value: money(expensesTotal) },
          { label: 'Net', value: money(revenueTotal - expensesTotal) }
        ]
      : [])
  ]

  const totalShort = drivers.reduce((sum, driver) => sum + driver.packagesShort, 0)

  const exportProps =
    view === 'drivers'
      ? { title: `Driver Breakdown - ${slotLabel()}`, data: driverExportRows, columns: driverColumns, fileName: `driver-breakdown-${month}${period ? `-invoice-${period}` : ''}` }
      : view === 'losses'
        ? { title: `Losses - ${slotLabel()}`, data: lossRows, columns: lossColumns, fileName: `losses-${month}${period ? `-invoice-${period}` : ''}` }
        : { title: `Trips - ${slotLabel()}`, data: listed, columns: tripColumns, fileName: `trips-${month}${period ? `-invoice-${period}` : ''}` }

  const cards = [
    {
      label: period ? `Run for the ${periodLabel(period)}` : `Run in ${monthLabel(month, 'short')}`,
      trips: totals.run,
      hint: period
        ? cutoffDay
          ? `Trips dated ${period === 1 ? `1 to ${cutoffDay}` : `${cutoffDay + 1} to month end`}`
          : `Trips dated in the ${period === 1 ? 'first' : 'second'} part of the month`
        : 'Trips dated in this month'
    },
    { label: 'Moved to a later invoice', trips: totals.movedOut, hint: period ? 'Run for this invoice, invoiced later' : 'Run this month, invoiced later', sign: '−' },
    { label: 'Brought in', trips: totals.movedIn, hint: period ? 'From an earlier invoice' : 'Run in another month, invoiced in this one', sign: '+' },
    { label: period ? `${monthLabel(month, 'short')}, ${periodLabel(period)}` : `${monthLabel(month, 'short')} invoice`, trips: totals.invoice, hint: 'What this invoice adds up to', strong: true }
  ]

  return (
    <div className='flex flex-col gap-6'>
      <Card>
        <CardContent className='flex flex-wrap items-center justify-between gap-4'>
          <div className='flex items-center gap-2'>
            <IconButton aria-label='Previous month' onClick={() => setParam('month', shiftMonthKey(month, -1))}>
              <i className='ri-arrow-left-s-line' />
            </IconButton>
            <TextField
              type='month'
              size='small'
              label='Month'
              value={month}
              onChange={e => e.target.value && setParam('month', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <IconButton aria-label='Next month' onClick={() => setParam('month', nextMonth)}>
              <i className='ri-arrow-right-s-line' />
            </IconButton>
            <CompanyFilterSelect value={companyId} onChange={value => setParam('company', value)} />
            {hasPeriods && (
              <TextField
                select
                size='small'
                label='Invoice'
                value={String(period)}
                onChange={e => setParam('invoice', e.target.value === '0' ? '' : e.target.value)}
                sx={{ minWidth: 190 }}
              >
                <MenuItem value='0'>Whole month</MenuItem>
                <MenuItem value='1'>1st invoice{cutoffDay ? ` (1 to ${cutoffDay})` : ''}</MenuItem>
                <MenuItem value='2'>2nd invoice{cutoffDay ? ` (${cutoffDay + 1} to end)` : ''}</MenuItem>
              </TextField>
            )}
          </div>
          <div className='flex items-center gap-2'>
            <OpenDialogOnElementClick
              element={Button}
              elementProps={{
                variant: 'outlined',
                startIcon: <i className='ri-download-line' />,
                children: 'Export',
                disabled: loading || exportProps.data.length === 0
              }}
              dialog={GenericTableExportDialog}
              dialogProps={{ ...exportProps, summaryItems: exportSummary }}
            />
            <Button component={Link} href='/edms/trips' variant='text' startIcon={<i className='ri-list-check' />}>
              All trips
            </Button>
          </div>
        </CardContent>
      </Card>

      <Grid container spacing={6}>
        {cards.map(card => (
          <Grid item xs={12} sm={6} md={3} key={card.label}>
            <Card className={card.strong ? 'border border-primary' : ''}>
              <CardContent>
                <Typography variant='body2' color='text.secondary'>
                  {card.label}
                </Typography>
                <Typography variant='h4'>
                  {card.sign && card.trips.length > 0 ? `${card.sign} ` : ''}
                  {card.trips.length} trip{card.trips.length === 1 ? '' : 's'}
                </Typography>
                {canViewFinancials && <Typography color='text.primary'>{money(sumPrice(card.trips))}</Typography>}
                <Typography variant='caption' color='text.secondary'>
                  {card.hint}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {canViewFinancials && (
        <Card>
          <CardContent className='flex flex-col gap-4'>
            <div>
              <Typography variant='h6'>Revenue and expenses</Typography>
              <Typography variant='body2' color='text.secondary'>
                The {invoiceName} beside the expenses dated{' '}
                {expenseWindow.start.format('D MMM')} to {expenseWindow.end.format('D MMM YYYY')}
                {showAllExpenses
                  ? '.'
                  : '. Expenses are not recorded per company, so this counts the expenses of the drivers on its trips, and leaves out costs not tied to a driver.'}
              </Typography>
            </div>
            {expensesError && <Alert severity='warning'>{expensesError}</Alert>}
            <Grid container spacing={4}>
              <Grid item xs={12} sm={4}>
                <Typography variant='body2' color='text.secondary'>
                  Revenue
                </Typography>
                <Typography variant='h5'>{money(revenueTotal)}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant='body2' color='text.secondary'>
                  Expenses
                </Typography>
                <Typography variant='h5'>{expensesLoading ? <CircularProgress size={20} /> : money(expensesTotal)}</Typography>
                {!expensesLoading && showAllExpenses && expensesTotal > 0 && (
                  <Typography variant='caption' color='text.secondary'>
                    {money(driverExpensesTotal)} on drivers and trips · {money(unassignedExpenses)} not tied to a driver
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant='body2' color='text.secondary'>
                  Net
                </Typography>
                <Typography variant='h5' color={revenueTotal - expensesTotal < 0 ? 'error.main' : 'success.main'}>
                  {expensesLoading ? <CircularProgress size={20} /> : money(revenueTotal - expensesTotal)}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <Card>
        <Tabs value={view} onChange={(_, value) => setParam('view', value === 'trips' ? '' : value)} className='border-be'>
          <Tab value='trips' label='Trips' />
          <Tab value='drivers' label='By driver' />
          <Tab value='losses' label={`Losses${totalShort > 0 ? ` (${totalShort})` : ''}`} />
        </Tabs>

        {error && (
          <CardContent>
            <Alert severity='error'>{error}</Alert>
          </CardContent>
        )}

        {loading ? (
          <CardContent className='flex justify-center p-10'>
            <CircularProgress />
          </CardContent>
        ) : view === 'trips' ? (
          <>
            <CardContent className='flex flex-col gap-4'>
              {canViewFinancials && (
                <Typography variant='body2' color='text.secondary'>
                  A trip&apos;s expenses are the ones recorded against that trip. Fuel and allowances recorded against a
                  driver are on the By driver tab.
                </Typography>
              )}
              <div className='flex flex-wrap items-center gap-2'>
                <TextField
                  select
                  size='small'
                  label='Show'
                  value={show}
                  onChange={e => setParams({ show: e.target.value === 'invoice' ? '' : e.target.value })}
                  sx={{ minWidth: 260 }}
                >
                  <MenuItem value='invoice'>On the {invoiceName} ({totals.invoice.length})</MenuItem>
                  <MenuItem value='lateClose'>{period === 1 ? 'Closed after the cut-off' : 'Closed after the month ended'} ({lateCloseCount})</MenuItem>
                  <MenuItem value='movedOut'>Moved to a later invoice ({totals.movedOut.length})</MenuItem>
                  <MenuItem value='movedIn'>Brought in from another {period ? 'invoice' : 'month'} ({totals.movedIn.length})</MenuItem>
                  <MenuItem value='all'>Everything ({ofCompany.length})</MenuItem>
                </TextField>
                <TextField
                  size='small'
                  placeholder='Search trip, driver, vehicle or route'
                  defaultValue={search}
                  onChange={e => setParam('search', e.target.value)}
                  sx={{ minWidth: 280 }}
                />
              </div>
              {canMove ? (
                <div className='flex flex-wrap items-center gap-2'>
                  <Typography variant='body2' color='text.secondary'>
                    {selectedTrips.length > 0
                      ? `${selectedTrips.length} selected${canViewFinancials ? ` · ${money(sumPrice(selectedTrips))}` : ''}`
                      : `Tick the trips the client did not close in time for this ${period ? 'invoice' : 'month'}, then move them.`}
                  </Typography>
                  {period === 1 && (
                    <Button
                      size='small'
                      variant='contained'
                      disabled={saving || selectedTrips.length === 0}
                      onClick={() => move(month, 2)}
                      startIcon={<i className='ri-arrow-right-line' />}
                    >
                      Move to the 2nd invoice
                    </Button>
                  )}
                  <Button
                    size='small'
                    variant={period === 1 ? 'outlined' : 'contained'}
                    disabled={saving || selectedTrips.length === 0}
                    onClick={() => move(nextMonth)}
                    startIcon={<i className='ri-arrow-right-line' />}
                  >
                    Move to {monthLabel(nextMonth)}
                  </Button>
                  <Button
                    size='small'
                    variant='outlined'
                    disabled={saving || selectedTrips.every(trip => !trip.moved)}
                    onClick={() => move(null)}
                    startIcon={<i className='ri-arrow-go-back-line' />}
                  >
                    Put back where it was run
                  </Button>
                  <span className='is-px bs-6 bg-[var(--mui-palette-divider)]' />
                  <Button
                    size='small'
                    variant='outlined'
                    color='info'
                    disabled={saving || selectedTrips.length === 0}
                    onClick={() => bill({ invoiced: true }, 'marked invoiced')}
                  >
                    Mark invoiced
                  </Button>
                  <Button
                    size='small'
                    variant='outlined'
                    color='success'
                    disabled={saving || selectedTrips.length === 0}
                    onClick={() => bill({ invoiced: true, paid: true }, 'marked paid')}
                  >
                    Mark paid
                  </Button>
                  <Button
                    size='small'
                    variant='text'
                    color='secondary'
                    disabled={saving || selectedTrips.every(trip => !trip.invoiced)}
                    onClick={() => bill({ invoiced: false }, 'set back to not invoiced')}
                  >
                    Not invoiced
                  </Button>
                </div>
              ) : (
                <Typography variant='body2' color='text.secondary'>
                  You can view this breakdown; moving trips between months needs permission to edit trips.
                </Typography>
              )}
            </CardContent>
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    {canMove && (
                      <TableCell padding='checkbox'>
                        <Checkbox
                          checked={allListedSelected}
                          indeterminate={selectedTrips.length > 0 && !allListedSelected}
                          onChange={() => setSelected(allListedSelected ? new Set() : new Set(listed.map(trip => trip.$id)))}
                        />
                      </TableCell>
                    )}
                    <TableCell>Trip</TableCell>
                    <TableCell>Trip date</TableCell>
                    <TableCell>Driver</TableCell>
                    <TableCell>Vehicle</TableCell>
                    <TableCell>Route</TableCell>
                    {canViewFinancials && <TableCell align='right'>Price</TableCell>}
                    {canViewFinancials && <TableCell align='right'>Expenses</TableCell>}
                    {canViewFinancials && <TableCell align='right'>Net</TableCell>}
                    <TableCell>Status</TableCell>
                    <TableCell>Closed</TableCell>
                    <TableCell>Invoice month</TableCell>
                    <TableCell>Invoice</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {listed.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={13} align='center'>
                        <Typography color='text.secondary' className='p-4'>
                          No trips here for {slotLabel()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {listed.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(trip => (
                    <TableRow key={trip.$id} hover selected={selected.has(trip.$id)}>
                      {canMove && (
                        <TableCell padding='checkbox'>
                          <Checkbox checked={selected.has(trip.$id)} onChange={() => toggle(trip.$id)} />
                        </TableCell>
                      )}
                      <TableCell>
                        <TripTitle trip={labelTrip(trip)} link />
                      </TableCell>
                      <TableCell>{day(trip.tripDate)}</TableCell>
                      <TableCell>{trip.driverName}</TableCell>
                      <TableCell>{trip.vehicleNumber}</TableCell>
                      <TableCell>{trip.routeName}</TableCell>
                      {canViewFinancials && <TableCell align='right'>{trip.earns ? money(trip.price) : '-'}</TableCell>}
                      {canViewFinancials && (
                        <TableCell align='right'>
                          {tripExpenses.get(trip.$id) ? money(tripExpenses.get(trip.$id)!.total) : '-'}
                        </TableCell>
                      )}
                      {canViewFinancials && (
                        <TableCell align='right'>
                          {money((trip.earns ? trip.price : 0) - (tripExpenses.get(trip.$id)?.total || 0))}
                        </TableCell>
                      )}
                      <TableCell className='capitalize'>{statusLabel(trip.status)}</TableCell>
                      <TableCell>
                        {trip.closedAt ? (
                          <Typography variant='body2' color={trip.closedAfterRunMonth ? 'warning.main' : 'text.primary'}>
                            {day(trip.closedAt)}
                          </Typography>
                        ) : (
                          <Typography variant='body2' color='text.secondary'>
                            {trip.manifestCount > 0 ? `${trip.deliveredManifests} of ${trip.manifestCount} drops` : 'No manifests'}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {!trip.moved ? (
                          `${monthLabel(trip.invoiceMonth, 'short')}${trip.invoicePeriod ? `, ${periodLabel(trip.invoicePeriod)}` : ''}`
                        ) : (
                          <Chip
                            size='small'
                            variant='tonal'
                            color='warning'
                            label={`Moved to ${monthLabel(trip.invoiceMonth, 'short')}${trip.invoicePeriod ? `, ${periodLabel(trip.invoicePeriod)}` : ''}`}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {trip.paid ? (
                          <Chip size='small' variant='tonal' color='success' label='Paid' />
                        ) : trip.invoiced ? (
                          <Chip size='small' variant='tonal' color='info' label='Invoiced' />
                        ) : (
                          <Typography variant='body2' color='text.secondary'>
                            Not invoiced
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component='div'
              count={listed.length}
              page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[25, 50, 100]}
              onPageChange={(_, value) => setPage(value)}
              onRowsPerPageChange={e => {
                setRowsPerPage(parseInt(e.target.value, 10))
                setPage(0)
              }}
            />
          </>
        ) : view === 'drivers' ? (
          <>
            <CardContent>
              <Typography variant='body2' color='text.secondary'>
                Trips on the {invoiceName}, by driver
                {canViewFinancials
                  ? `, beside each driver's expenses dated ${expenseWindow.start.format('D MMM')} to ${expenseWindow.end.format('D MMM')} (and any recorded against their trips here)`
                  : ''}
                . Open a driver to see their trips by route and price{canViewFinancials ? ', and what they spent' : ''}.
              </Typography>
            </CardContent>
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell />
                    <TableCell>Driver</TableCell>
                    <TableCell align='right'>Trips</TableCell>
                    <TableCell align='right'>Cancelled</TableCell>
                    {canViewFinancials && <TableCell align='right'>Revenue</TableCell>}
                    {canViewFinancials && <TableCell align='right'>Expenses</TableCell>}
                    {canViewFinancials && <TableCell align='right'>Net</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {drivers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align='center'>
                        <Typography color='text.secondary' className='p-4'>
                          No trips on the {invoiceName}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {drivers.map(driver => {
                    const key = driver.driverId || 'none'
                    const open = openDriver === key
                    const spent = expensesOf(driver)

                    return (
                      <Fragment key={key}>
                        <TableRow hover className='cursor-pointer' onClick={() => setOpenDriver(open ? '' : key)}>
                          <TableCell padding='checkbox'>
                            <i className={open ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line'} />
                          </TableCell>
                          <TableCell className='font-medium'>{driver.driverName}</TableCell>
                          <TableCell align='right'>{driver.trips || '-'}</TableCell>
                          <TableCell align='right'>{driver.cancelled || '-'}</TableCell>
                          {canViewFinancials && <TableCell align='right'>{money(driver.amount)}</TableCell>}
                          {canViewFinancials && (
                            <TableCell align='right'>{expensesLoading ? '…' : spent > 0 ? money(spent) : '-'}</TableCell>
                          )}
                          {canViewFinancials && (
                            <TableCell align='right'>
                              <Typography variant='body2' color={driver.amount - spent < 0 ? 'error.main' : 'text.primary'}>
                                {money(driver.amount - spent)}
                              </Typography>
                            </TableCell>
                          )}
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={7} className='p-0 border-0'>
                            <Collapse in={open} unmountOnExit>
                              {driver.lines.length > 0 && (
                                <Table size='small' className='bg-actionHover'>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Route</TableCell>
                                      <TableCell align='right'>Tonnage</TableCell>
                                      <TableCell align='right'>Trips</TableCell>
                                      {canViewFinancials && <TableCell align='right'>Price</TableCell>}
                                      {canViewFinancials && <TableCell align='right'>Amount</TableCell>}
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {driver.lines.map(line => (
                                      <TableRow key={`${line.routeName}|${line.tonnage}|${line.price}`}>
                                        <TableCell>{line.routeName}</TableCell>
                                        <TableCell align='right'>{line.tonnage || '-'}</TableCell>
                                        <TableCell align='right'>{line.trips}</TableCell>
                                        {canViewFinancials && <TableCell align='right'>{money(line.price)}</TableCell>}
                                        {canViewFinancials && <TableCell align='right'>{money(line.amount)}</TableCell>}
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                              {canViewFinancials && driver.expenses && driver.expenses.items.length > 0 && (
                                <Table size='small' className='bg-actionHover'>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Expense date</TableCell>
                                      <TableCell>Type</TableCell>
                                      <TableCell>Description</TableCell>
                                      <TableCell align='right'>Amount</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {[...driver.expenses.items]
                                      .sort((a, b) => a.expenseDate.localeCompare(b.expenseDate))
                                      .map(expense => (
                                        <TableRow key={expense.$id}>
                                          <TableCell>{day(expense.expenseDate)}</TableCell>
                                          <TableCell>{typeLabel(expense.expenseType)}</TableCell>
                                          <TableCell>
                                            <Typography component={Link} href={`/edms/expenses/${expense.$id}`} variant='body2' color='primary'>
                                              {expense.description || 'View expense'}
                                            </Typography>
                                          </TableCell>
                                          <TableCell align='right'>{money(expense.amount)}</TableCell>
                                        </TableRow>
                                      ))}
                                  </TableBody>
                                </Table>
                              )}
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    )
                  })}
                  {canViewFinancials && unassignedExpenses > 0 && (
                    <>
                      <TableRow hover className='cursor-pointer' onClick={() => setOpenDriver(openDriver === 'unassigned' ? '' : 'unassigned')}>
                        <TableCell padding='checkbox'>
                          <i className={openDriver === 'unassigned' ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line'} />
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2' color='text.secondary'>
                            Not tied to a driver
                          </Typography>
                        </TableCell>
                        <TableCell align='right'>-</TableCell>
                        <TableCell align='right'>-</TableCell>
                        <TableCell align='right'>-</TableCell>
                        <TableCell align='right'>{money(unassignedExpenses)}</TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2' color='error.main'>
                            {money(-unassignedExpenses)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={7} className='p-0 border-0'>
                          <Collapse in={openDriver === 'unassigned'} unmountOnExit>
                            <Table size='small' className='bg-actionHover'>
                              <TableHead>
                                <TableRow>
                                  <TableCell>Expense type</TableCell>
                                  <TableCell align='right'>Expenses</TableCell>
                                  <TableCell align='right'>Amount</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {Object.entries(invoiceExpenses.unassigned.byType)
                                  .sort((a, b) => b[1] - a[1])
                                  .map(([type, amount]) => (
                                    <TableRow key={type}>
                                      <TableCell>{typeLabel(type)}</TableCell>
                                      <TableCell align='right'>
                                        {invoiceExpenses.unassigned.items.filter(expense => expense.expenseType === type).length}
                                      </TableCell>
                                      <TableCell align='right'>{money(amount)}</TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                            <Typography variant='caption' color='text.secondary' className='block p-3'>
                              Expenses with no driver or vehicle on them. Recording the driver (or the trip) on an expense moves it to that driver.
                            </Typography>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                  {drivers.length > 0 && (
                    <TableRow>
                      <TableCell />
                      <TableCell className='font-medium'>Total</TableCell>
                      <TableCell align='right' className='font-medium'>
                        {drivers.reduce((sum, driver) => sum + driver.trips, 0)}
                      </TableCell>
                      <TableCell align='right'>{drivers.reduce((sum, driver) => sum + driver.cancelled, 0) || '-'}</TableCell>
                      {canViewFinancials && (
                        <TableCell align='right' className='font-medium'>
                          {money(revenueTotal)}
                        </TableCell>
                      )}
                      {canViewFinancials && (
                        <TableCell align='right' className='font-medium'>
                          {money(expensesTotal)}
                        </TableCell>
                      )}
                      {canViewFinancials && (
                        <TableCell align='right' className='font-medium'>
                          {money(revenueTotal - expensesTotal)}
                        </TableCell>
                      )}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : (
          <>
            <CardContent>
              <Typography variant='body2' color='text.secondary'>
                Packages on delivered drops for the {invoiceName}. &ldquo;Short&rdquo; is what the office recorded as
                missing at a drop, or the gap between what was loaded and what was counted off where both were counted.
                &ldquo;Owed&rdquo; is what the loss sheet charges the driver for these trips (priced items not found).
              </Typography>
            </CardContent>
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell />
                    <TableCell>Driver</TableCell>
                    <TableCell align='right'>Loaded</TableCell>
                    <TableCell align='right'>Delivered</TableCell>
                    <TableCell align='right'>Short</TableCell>
                    <TableCell align='right'>Extra</TableCell>
                    <TableCell align='right'>Owed</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lossRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align='center'>
                        <Typography color='text.secondary' className='p-4'>
                          No package counts recorded on delivered drops for {monthLabel(month)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {[...lossRows]
                    .sort((a, b) => b.packagesShort - a.packagesShort || b.packagesSent - a.packagesSent)
                    .map(driver => {
                      const key = `loss-${driver.driverId || 'none'}`
                      const open = openDriver === key
                      const canOpen = driver.tripsWithShortage.length > 0

                      return (
                        <Fragment key={key}>
                          <TableRow hover className={canOpen ? 'cursor-pointer' : ''} onClick={() => canOpen && setOpenDriver(open ? '' : key)}>
                            <TableCell padding='checkbox'>
                              {canOpen && <i className={open ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line'} />}
                            </TableCell>
                            <TableCell className='font-medium'>{driver.driverName}</TableCell>
                            <TableCell align='right'>{driver.packagesSent.toLocaleString()}</TableCell>
                            <TableCell align='right'>{driver.packagesDelivered.toLocaleString()}</TableCell>
                            <TableCell align='right'>
                              {driver.packagesShort > 0 ? (
                                <Typography color='error.main' className='font-medium'>
                                  {driver.packagesShort.toLocaleString()}
                                </Typography>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell align='right'>{driver.packagesExtra || '-'}</TableCell>
                            <TableCell align='right' onClick={event => event.stopPropagation()}>
                              {driver.driverId ? (
                                <Typography component={Link} href={`/edms/losses/${driver.driverId}`} color={lossValue(driver.driverId) > 0 ? 'error.main' : 'text.secondary'}>
                                  {lossValue(driver.driverId) > 0 ? money(lossValue(driver.driverId)) : '-'}
                                </Typography>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell colSpan={7} className='p-0 border-0'>
                              <Collapse in={open} unmountOnExit>
                                <Table size='small' className='bg-actionHover'>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Trip</TableCell>
                                      <TableCell>Trip date</TableCell>
                                      <TableCell>Route</TableCell>
                                      <TableCell align='right'>Loaded</TableCell>
                                      <TableCell align='right'>Delivered</TableCell>
                                      <TableCell align='right'>Short</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {driver.tripsWithShortage.map(trip => (
                                      <TableRow key={trip.$id}>
                                        <TableCell>
                                          <TripTitle trip={labelTrip(trip)} link />
                                        </TableCell>
                                        <TableCell>{day(trip.tripDate)}</TableCell>
                                        <TableCell>{trip.routeName}</TableCell>
                                        <TableCell align='right'>{trip.packagesSent.toLocaleString()}</TableCell>
                                        <TableCell align='right'>{trip.packagesDelivered.toLocaleString()}</TableCell>
                                        <TableCell align='right'>{trip.packagesShort.toLocaleString()}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </Fragment>
                      )
                    })}
                  {lossRows.length > 0 && (
                    <TableRow>
                      <TableCell />
                      <TableCell className='font-medium'>Total</TableCell>
                      <TableCell align='right'>{lossRows.reduce((sum, d) => sum + d.packagesSent, 0).toLocaleString()}</TableCell>
                      <TableCell align='right'>{lossRows.reduce((sum, d) => sum + d.packagesDelivered, 0).toLocaleString()}</TableCell>
                      <TableCell align='right' className='font-medium'>
                        {totalShort.toLocaleString()}
                      </TableCell>
                      <TableCell align='right'>{lossRows.reduce((sum, d) => sum + d.packagesExtra, 0) || '-'}</TableCell>
                      <TableCell align='right' className='font-medium'>
                        {money(lossRows.reduce((sum, d) => sum + lossValue(d.driverId), 0))}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Card>
    </div>
  )
}

export default MonthlyBreakdown
