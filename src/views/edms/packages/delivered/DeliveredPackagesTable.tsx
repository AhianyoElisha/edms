'use client'

/**
 * Completed Deliveries.
 *
 * Every delivered manifest in the chosen date range, grouped by the driver who
 * made the delivery and the route they ran. The office thinks of a completed
 * delivery as "Kofi's run on Route K", not as manifest number MF-F261107-8173,
 * so driver and route lead and the manifest number is a footnote.
 */

// React Imports
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'

// Next Imports
import Link from 'next/link'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Autocomplete from '@mui/material/Autocomplete'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import InputAdornment from '@mui/material/InputAdornment'
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers-pro'
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs'
import { LicenseInfo } from '@mui/x-license'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'

// Third-party Imports
import { format } from 'date-fns'
import { toast } from 'react-toastify'

// Component Imports
import LoaderDark from '@/components/layout/shared/LoaderDark'

// Action Imports
import { getDeliveredManifests, isManifestAwaitingVerification } from '@/libs/actions/manifest.actions'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Set MUI X License
LicenseInfo.setLicenseKey('e0d9bb8070ce0054c9d9ecb6e82cb58fTz0wLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxLVj0y')

const UNASSIGNED_DRIVER = 'No driver recorded'
const UNASSIGNED_ROUTE = 'No route recorded'

interface DeliveryRow {
  id: string
  driver: string
  route: string
  vehicle: string
  tripId: string | null
  tripNumber: string
  stop: string
  company: string
  manifestNumber: string
  packageSize: string
  packageCount: number
  deliveredCount: number
  shortage: number
  surplus: number
  awaitingReview: boolean
  deliveryTime: string | null
}

interface DeliveryGroup {
  key: string
  driver: string
  route: string
  rows: DeliveryRow[]
  packages: number
  shortage: number
  surplus: number
  awaitingReview: number
}

const toRow = (manifest: any): DeliveryRow => {
  const trip = manifest.trip && typeof manifest.trip === 'object' ? manifest.trip : null
  const stop = manifest.dropofflocation && typeof manifest.dropofflocation === 'object' ? manifest.dropofflocation : null
  const packageCount = manifest.packageCount || 0
  const deliveredCount = manifest.deliveredCount || 0

  return {
    id: manifest.$id,
    driver: trip?.driver?.name?.trim() || UNASSIGNED_DRIVER,
    route: trip?.route?.routeName?.trim() || trip?.route?.routeCode || UNASSIGNED_ROUTE,
    vehicle: trip?.vehicle?.vehicleNumber || '',
    tripId: trip?.$id || null,
    tripNumber: trip?.tripNumber || '',
    stop: stop?.locationName || 'Unknown stop',
    company: manifest.clientName || '',
    manifestNumber: manifest.manifestNumber || '',
    packageSize: manifest.packageSize || '',
    packageCount,
    deliveredCount,
    // A shortage may be recorded on its own, or implied by delivered < total.
    shortage: manifest.shortageCount || (packageCount > 0 ? Math.max(0, packageCount - deliveredCount) : 0),
    // Packages carried over and above the manifest
    surplus: manifest.surplusCount || 0,
    awaitingReview: isManifestAwaitingVerification(manifest),
    deliveryTime: manifest.deliveryTime || manifest.arrivalTime || null
  }
}

const formatDateTime = (value: string | null) => {
  if (!value) return 'N/A'

  const date = new Date(value)

  return isNaN(date.getTime()) ? 'N/A' : format(date, 'MMM dd, yyyy HH:mm')
}

const DeliveredPackagesTable = () => {
  // Data
  const [rows, setRows] = useState<DeliveryRow[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Filters
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(7, 'days'))
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs())
  const [driverFilter, setDriverFilter] = useState<string | null>(null)
  const [routeFilter, setRouteFilter] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Paging
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  const fetchDeliveredManifests = useCallback(async () => {
    try {
      setIsLoading(true)

      const startDateISO = startDate?.isValid() ? startDate.startOf('day').toISOString() : undefined
      const endDateISO = endDate?.isValid() ? endDate.endOf('day').toISOString() : undefined

      const manifests = await getDeliveredManifests(startDateISO, endDateISO)

      setRows(manifests.map(toRow))
    } catch (error) {
      console.error('Error fetching delivered manifests:', error)
      toast.error('Failed to fetch completed deliveries')
    } finally {
      setIsLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchDeliveredManifests()
  }, [fetchDeliveredManifests])

  const driverOptions = useMemo(() => Array.from(new Set(rows.map(row => row.driver))).sort(), [rows])

  // Only routes the selected driver actually ran, so the two pickers never
  // combine into an empty result.
  const routeOptions = useMemo(
    () =>
      Array.from(
        new Set(rows.filter(row => !driverFilter || row.driver === driverFilter).map(row => row.route))
      ).sort(),
    [rows, driverFilter]
  )

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()

    return rows.filter(row => {
      if (driverFilter && row.driver !== driverFilter) return false
      if (routeFilter && row.route !== routeFilter) return false
      if (!term) return true

      return [row.driver, row.route, row.vehicle, row.tripNumber, row.stop, row.company, row.manifestNumber].some(
        value => value.toLowerCase().includes(term)
      )
    })
  }, [rows, driverFilter, routeFilter, search])

  // Driver, then route; newest delivery first inside each run.
  const groups = useMemo<DeliveryGroup[]>(() => {
    const byKey = new Map<string, DeliveryGroup>()

    filteredRows.forEach(row => {
      const key = `${row.driver}\u0000${row.route}`
      let group = byKey.get(key)

      if (!group) {
        group = { key, driver: row.driver, route: row.route, rows: [], packages: 0, shortage: 0, surplus: 0, awaitingReview: 0 }
        byKey.set(key, group)
      }

      group.rows.push(row)
      group.packages += row.deliveredCount || row.packageCount
      group.shortage += row.shortage
      group.surplus += row.surplus
      if (row.awaitingReview) group.awaitingReview++
    })

    const sorted = Array.from(byKey.values()).sort(
      (a, b) => a.driver.localeCompare(b.driver) || a.route.localeCompare(b.route)
    )

    sorted.forEach(group =>
      group.rows.sort((a, b) => (b.deliveryTime || '').localeCompare(a.deliveryTime || ''))
    )

    return sorted
  }, [filteredRows])

  const orderedRows = useMemo(() => groups.flatMap(group => group.rows.map(row => ({ row, group }))), [groups])
  const pageRows = orderedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  const totalPackages = useMemo(() => groups.reduce((sum, group) => sum + group.packages, 0), [groups])
  const totalShortage = useMemo(() => groups.reduce((sum, group) => sum + group.shortage, 0), [groups])
  const totalSurplus = useMemo(() => groups.reduce((sum, group) => sum + group.surplus, 0), [groups])

  // Any filter change can leave the current page past the end.
  useEffect(() => {
    setPage(0)
  }, [driverFilter, routeFilter, search, rows])

  useEffect(() => {
    if (routeFilter && !routeOptions.includes(routeFilter)) setRouteFilter(null)
  }, [routeFilter, routeOptions])

  const handleExport = async () => {
    if (orderedRows.length === 0) return

    const XLSX = await import('xlsx')

    const sheet = XLSX.utils.json_to_sheet(
      orderedRows.map(({ row }) => ({
        Driver: row.driver,
        Route: row.route,
        Vehicle: row.vehicle,
        Trip: row.tripNumber,
        Stop: row.stop,
        Company: row.company,
        'Manifest No.': row.manifestNumber,
        'Package Size': row.packageSize,
        'Total Packages': row.awaitingReview && !row.packageCount ? '' : row.packageCount,
        Delivered: row.awaitingReview && !row.packageCount ? '' : row.deliveredCount,
        Shortages: row.shortage,
        Surplus: row.surplus,
        'Delivered At': formatDateTime(row.deliveryTime),
        Status: row.awaitingReview ? 'Awaiting office review' : 'Delivered'
      }))
    )

    const book = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(book, sheet, 'Completed Deliveries')
    XLSX.writeFile(
      book,
      `completed-deliveries_${startDate?.format('YYYY-MM-DD') || 'start'}_${endDate?.format('YYYY-MM-DD') || 'end'}.xlsx`
    )
  }

  const COLUMN_COUNT = 7

  return (
    <>
      <Typography className='mt-4' variant='h4'>
        Completed Deliveries
      </Typography>
      <Typography variant='body2' color='text.secondary'>
        Delivered manifests, grouped by driver and route.
      </Typography>
      <Divider className='my-8' />

      <Card>
        <CardHeader title='Filters' />
        <div className='p-5'>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Grid container spacing={4}>
              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label='Start Date'
                  value={startDate}
                  onChange={newValue => setStartDate(newValue)}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label='End Date'
                  value={endDate}
                  onChange={newValue => setEndDate(newValue)}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Autocomplete
                  options={driverOptions}
                  value={driverFilter}
                  onChange={(_, value) => setDriverFilter(value)}
                  renderInput={params => <TextField {...params} size='small' label='Driver' placeholder='All drivers' />}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Autocomplete
                  options={routeOptions}
                  value={routeFilter}
                  onChange={(_, value) => setRouteFilter(value)}
                  renderInput={params => <TextField {...params} size='small' label='Route' placeholder='All routes' />}
                />
              </Grid>
            </Grid>
          </LocalizationProvider>
        </div>
        <Divider />

        <div className='flex justify-between flex-col items-start md:flex-row md:items-center gap-4 p-5'>
          <div className='flex flex-wrap items-center gap-3 max-sm:is-full'>
            <TextField
              size='small'
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Search driver, route, stop, vehicle…'
              className='max-sm:is-full'
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <i className='ri-search-line' />
                  </InputAdornment>
                )
              }}
            />
            <Chip
              label={`${filteredRows.length} deliveries • ${groups.length} driver/route runs`}
              color='success'
              variant='tonal'
            />
            {totalPackages > 0 && <Chip label={`${totalPackages} packages`} variant='tonal' />}
            {totalShortage > 0 && <Chip label={`${totalShortage} short`} color='error' variant='tonal' />}
            {totalSurplus > 0 && <Chip label={`${totalSurplus} extra`} color='warning' variant='tonal' />}
          </div>
          <div className='flex flex-wrap items-center gap-3 max-sm:is-full'>
            <Button
              variant='outlined'
              color='secondary'
              onClick={() => {
                setStartDate(dayjs().subtract(7, 'days'))
                setEndDate(dayjs())
                setDriverFilter(null)
                setRouteFilter(null)
                setSearch('')
              }}
              startIcon={<i className='ri-restart-line' />}
            >
              Reset
            </Button>
            <Button
              variant='outlined'
              color='secondary'
              onClick={handleExport}
              disabled={orderedRows.length === 0}
              startIcon={<i className='ri-upload-2-line' />}
            >
              Export
            </Button>
          </div>
        </div>

        <div className='overflow-x-auto'>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Stop</th>
                <th>Trip / Vehicle</th>
                <th>Company</th>
                <th>Packages</th>
                <th>Short / Extra</th>
                <th>Delivered At</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={COLUMN_COUNT} className='text-center'>
                    {isLoading ? <LoaderDark /> : 'No completed deliveries found for these filters'}
                  </td>
                </tr>
              ) : (
                pageRows.map(({ row, group }, index) => {
                  const startsGroup = index === 0 || pageRows[index - 1].group.key !== group.key

                  return (
                    <Fragment key={row.id}>
                      {startsGroup && (
                        <tr className='bg-actionHover'>
                          <td colSpan={COLUMN_COUNT}>
                            <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
                              <i className='ri-steering-2-line text-xl text-primary' />
                              <Typography className='font-medium' color='text.primary'>
                                {group.driver}
                              </Typography>
                              <i className='ri-route-line text-textSecondary' />
                              <Typography color='text.primary'>{group.route}</Typography>
                              <Chip
                                size='small'
                                variant='tonal'
                                color='success'
                                label={`${group.rows.length} ${group.rows.length === 1 ? 'delivery' : 'deliveries'}`}
                              />
                              {group.packages > 0 && (
                                <Chip size='small' variant='tonal' label={`${group.packages} packages`} />
                              )}
                              {group.shortage > 0 && (
                                <Chip size='small' variant='tonal' color='error' label={`${group.shortage} short`} />
                              )}
                              {group.surplus > 0 && (
                                <Chip size='small' variant='tonal' color='warning' label={`${group.surplus} extra`} />
                              )}
                              {group.awaitingReview > 0 && (
                                <Chip
                                  size='small'
                                  variant='tonal'
                                  color='warning'
                                  label={`${group.awaitingReview} awaiting review`}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td>
                          <Typography className='font-medium' color='text.primary'>
                            {row.stop}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {row.manifestNumber}
                          </Typography>
                        </td>
                        <td>
                          {row.tripId ? (
                            <Link href={`/edms/trips/${row.tripId}`} className='text-primary'>
                              {row.tripNumber || 'View trip'}
                            </Link>
                          ) : (
                            <Typography color='text.secondary'>—</Typography>
                          )}
                          {row.vehicle && (
                            <Typography variant='body2' color='text.secondary'>
                              {row.vehicle}
                            </Typography>
                          )}
                        </td>
                        <td>
                          <Typography color={row.company ? 'text.primary' : 'text.secondary'}>
                            {row.company || '—'}
                          </Typography>
                        </td>
                        <td>
                          {row.packageCount > 0 ? (
                            <div className='flex items-center gap-2'>
                              <Chip
                                label={`${row.deliveredCount}/${row.packageCount}`}
                                variant='tonal'
                                color={row.deliveredCount >= row.packageCount ? 'success' : 'warning'}
                                size='small'
                              />
                              {row.packageSize && (
                                <Typography variant='body2' color='text.secondary' className='capitalize'>
                                  {row.packageSize}
                                </Typography>
                              )}
                            </div>
                          ) : row.awaitingReview ? (
                            <Chip label='Awaiting review' variant='tonal' color='warning' size='small' />
                          ) : (
                            <Typography color='text.secondary'>Not counted</Typography>
                          )}
                        </td>
                        <td>
                          {row.shortage > 0 && (
                            <Chip label={`${row.shortage} short`} variant='tonal' color='error' size='small' />
                          )}
                          {row.surplus > 0 && (
                            <Chip label={`${row.surplus} extra`} variant='tonal' color='warning' size='small' />
                          )}
                          {row.shortage === 0 && row.surplus === 0 && <Typography color='text.secondary'>—</Typography>}
                        </td>
                        <td>
                          <Typography>{formatDateTime(row.deliveryTime)}</Typography>
                        </td>
                        <td>
                          <Tooltip title='View manifest'>
                            <IconButton component={Link} href={`/edms/manifests/${row.id}`} size='small'>
                              <i className='ri-eye-line text-textSecondary' />
                            </IconButton>
                          </Tooltip>
                        </td>
                      </tr>
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component='div'
          className='border-bs'
          count={orderedRows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={e => {
            setRowsPerPage(Number(e.target.value))
            setPage(0)
          }}
        />
      </Card>
    </>
  )
}

export default DeliveredPackagesTable
