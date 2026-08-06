'use client'

// React Imports
import { useState, useMemo, useEffect, useCallback } from 'react'

// Next Imports
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import TablePagination from '@mui/material/TablePagination'
import IconButton from '@mui/material/IconButton'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import Grid from '@mui/material/Grid'
import { DatePicker } from '@mui/x-date-pickers-pro'
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers-pro'
import { LicenseInfo } from '@mui/x-license'
import dayjs, { Dayjs } from 'dayjs'

// Third-party Imports
import classnames from 'classnames'
import { toast } from 'react-toastify'
import { rankItem } from '@tanstack/match-sorter-utils'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel
} from '@tanstack/react-table'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'

// Type Imports
import type { TripType } from '@/types/apps/deliveryTypes'

// Component Imports
import Link from '@/components/Link'
import OptionMenu from '@core/components/option-menu'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Actions Imports
import { getAllTrips, updateTripStatus, deleteTrip } from '@/libs/actions/trip.actions'

// Hook Imports
import { usePermissions } from '@/hooks/usePermissions'

// Dialog Imports
import OpenDialogOnElementClick from '@/components/dialogs/OpenDialogOnElementClick'
import GenericTableExportDialog from '@/components/dialogs/generic-table-export-dialog'
import DeleteConfirmationDialog from '@/components/dialogs/delete-confirmation-dialog'
import type { ExportColumn, ExportSummary } from '@/components/dialogs/generic-table-export-dialog'

LicenseInfo.setLicenseKey('e0d9bb8070ce0054c9d9ecb6e82cb58fTz03MTc0MCxFPTE3MjI1MzA1NTIwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxLVj0y')

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta({ itemRank })
  return itemRank.passed
}

const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'> = {
  awaiting_manifests: 'warning',
  planned: 'info',
  in_progress: 'primary',
  at_pickup: 'warning',
  on_route: 'warning',
  completed: 'success',
  cancelled: 'error'
}

const columnHelper = createColumnHelper<TripType>()

const TripsOverviewTable = () => {
  // States
  const [tripData, setTripData] = useState<TripType[]>([])
  const [loading, setLoading] = useState(true)
  const [rowSelection, setRowSelection] = useState({})
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [tripIdsToDelete, setTripIdsToDelete] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)

  // Routing
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Read filters from URL params
  const globalFilter = searchParams.get('search') || ''
  const statusFilter = searchParams.get('status') || 'all'
  const dateFrom = searchParams.get('dateFrom') ? dayjs(searchParams.get('dateFrom')) : null
  const dateTo = searchParams.get('dateTo') ? dayjs(searchParams.get('dateTo')) : null

  // URL param helper
  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, pathname, router])

  const setGlobalFilter = useCallback((value: string) => updateParam('search', value), [updateParam])
  const setStatusFilter = useCallback((value: string) => updateParam('status', value === 'all' ? '' : value), [updateParam])
  const setDateFrom = useCallback((value: Dayjs | null) => updateParam('dateFrom', value ? value.format('YYYY-MM-DD') : ''), [updateParam])
  const setDateTo = useCallback((value: Dayjs | null) => updateParam('dateTo', value ? value.format('YYYY-MM-DD') : ''), [updateParam])

  // Permissions
  const { hasPermission, canViewFinancials, isDriver, user } = usePermissions()

  // Only admins hold the trips.delete permission
  const canDelete = hasPermission('trips.delete')

  const openDeleteDialog = useCallback((tripIds: string[]) => {
    if (tripIds.length === 0) return
    setTripIdsToDelete(tripIds)
    setDeleteDialogOpen(true)
  }, [])

  const handleConfirmDelete = async (deletedBy: string) => {
    const ids = tripIdsToDelete

    try {
      setIsDeleting(true)
      const results = await Promise.all(ids.map(id => deleteTrip(id, deletedBy)))
      const deletedIds = ids.filter((_, i) => results[i].success)
      const failedCount = ids.length - deletedIds.length

      if (deletedIds.length > 0) {
        setTripData(prevData => prevData.filter(trip => !deletedIds.includes(trip.$id)))
      }
      setRowSelection({})
      setDeleteDialogOpen(false)
      setTripIdsToDelete([])

      if (failedCount === 0) {
        toast.success(`${deletedIds.length} trip${deletedIds.length > 1 ? 's' : ''} deleted successfully`)
      } else if (deletedIds.length === 0) {
        toast.error('Failed to delete selected trips')
      } else {
        toast.warning(`${deletedIds.length} deleted, ${failedCount} failed`)
      }
    } catch (error: any) {
      console.error('Error deleting trips:', error)
      toast.error(error?.message || 'Failed to delete trips')
    } finally {
      setIsDeleting(false)
    }
  }

  // Load trips
  useEffect(() => {
    // Wait until the current user is resolved so drivers never briefly see all trips
    if (!user) return

    const loadTrips = async () => {
      try {
        setLoading(true)
        const filters: { status?: string; driverId?: string } = {}
        if (statusFilter !== 'all') filters.status = statusFilter
        if (isDriver && user?.$id) filters.driverId = user.$id
        const trips = await getAllTrips(Object.keys(filters).length ? filters : undefined)
        setTripData(trips)
      } catch (error) {
        console.error('Error loading trips:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTrips()
  }, [statusFilter, user, isDriver])

  // Client-side date filtering
  const filteredTripData = useMemo(() => {
    let filtered = tripData
    if (dateFrom) {
      filtered = filtered.filter(trip => dayjs(trip.tripDate).isAfter(dateFrom.startOf('day').subtract(1, 'ms')))
    }
    if (dateTo) {
      filtered = filtered.filter(trip => dayjs(trip.tripDate).isBefore(dateTo.endOf('day').add(1, 'ms')))
    }
    return filtered
  }, [tripData, dateFrom, dateTo])

  // Export configuration
  const exportColumns: ExportColumn[] = useMemo(() => [
    { header: 'Trip Number', accessor: (row: TripType) => row.tripNumber, width: 25, excelWidth: 15 },
    { header: 'Date', accessor: (row: TripType) => new Date(row.tripDate).toLocaleDateString(), width: 22, excelWidth: 14 },
    { header: 'Driver', accessor: (row: TripType) => row.driver?.name || 'N/A', width: 28, excelWidth: 20 },
    { header: 'Vehicle', accessor: (row: TripType) => row.vehicle?.vehicleNumber || 'N/A', width: 22, excelWidth: 15 },
    { header: 'Route', accessor: (row: TripType) => row.route?.routeName || 'N/A', width: 30, excelWidth: 20 },
    { header: 'Tonnage', accessor: (row: TripType) => row.tonnage ? `${row.tonnage} tons` : '-', align: 'right', width: 18, excelWidth: 12 },
    ...(canViewFinancials ? [{ header: 'Price (GH₵)', accessor: (row: TripType) => row.tripCost ? `GH₵ ${Number(row.tripCost).toFixed(2)}` : '-', align: 'right' as const, width: 22, excelWidth: 15 }] : []),
    { header: 'Status', accessor: (row: TripType) => row.status?.replace('_', ' ') || '', width: 20, excelWidth: 15 }
  ], [canViewFinancials])

  const exportSummary: ExportSummary[] = useMemo(() => [
    { label: 'Total Trips', value: String(filteredTripData.length) },
    ...(canViewFinancials
      ? [{ label: 'Total Revenue', value: `GH₵ ${filteredTripData.reduce((sum, t) => sum + (Number(t.tripCost) || 0), 0).toFixed(2)}` }]
      : [])
  ], [filteredTripData, canViewFinancials])


  const columns = useMemo<ColumnDef<TripType, any>[]>(
    () => [
      ...(canDelete ? [{
        id: 'select',
        header: ({ table }: any) => (
          <Checkbox
            {...{
              checked: table.getIsAllRowsSelected(),
              indeterminate: table.getIsSomeRowsSelected(),
              onChange: table.getToggleAllRowsSelectedHandler()
            }}
          />
        ),
        cell: ({ row }: any) => (
          <Checkbox
            {...{
              checked: row.getIsSelected(),
              disabled: !row.getCanSelect(),
              indeterminate: row.getIsSomeSelected(),
              onChange: row.getToggleSelectedHandler()
            }}
          />
        )
      } as ColumnDef<TripType, any>] : []),
      columnHelper.accessor('tripNumber', {
        header: 'Trip Number',
        cell: ({ row }) => (
          <Typography className='font-medium' color='text.primary'>
            {row.original.tripNumber}
          </Typography>
        )
      }),
      columnHelper.accessor('tripDate', {
        header: 'Trip Date',
        cell: ({ row }) => (
          <Typography color='text.primary'>
            {new Date(row.original.tripDate).toLocaleDateString()}
          </Typography>
        )
      }),
      columnHelper.accessor('driver', {
        header: 'Driver',
        cell: ({ row }) => (
          <Typography color='text.primary'>
            {row.original.driver.name || 'N/A'}
          </Typography>
        )
      }),
      columnHelper.accessor('vehicle', {
        header: 'Vehicle',
        cell: ({ row }) => (
          <Typography color='text.primary'>
            {row.original.vehicle.vehicleNumber || 'N/A'}
          </Typography>
        )
      }),
      columnHelper.accessor('route', {
        header: 'Route',
        cell: ({ row }) => (
          <Typography color='text.primary'>
            {row.original.route?.routeName || 'N/A'}
          </Typography>
        )
      }),
      columnHelper.accessor('tonnage', {
        header: 'Tonnage',
        cell: ({ row }) => (
          <Typography color='text.primary'>
            {row.original.tonnage ? `${row.original.tonnage} tons` : '-'}
          </Typography>
        )
      }),
      ...(canViewFinancials ? [columnHelper.accessor('tripCost', {
        header: 'Price (GH₵)',
        cell: ({ row }: any) => (
          <Typography color='text.primary' className='font-medium'>
            {row.original.tripCost ? `GH₵ ${Number(row.original.tripCost).toFixed(2)}` : '-'}
          </Typography>
        )
      })] : []),
      columnHelper.accessor('manifests', {
        header: 'Manifests',
        cell: ({ row }) => {
          const count = Array.isArray(row.original.manifests) ? row.original.manifests.length : 0
          return count === 0 && row.original.status === 'awaiting_manifests' ? (
            <Chip label='Awaiting' color='warning' size='small' variant='tonal' />
          ) : (
            <Typography color='text.primary'>{count}</Typography>
          )
        }
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: ({ row }) => (
          <Chip
            label={row.original.status?.replace('_', ' ')}
            color={statusColors[row.original.status || 'planned'] || 'default'}
            size='small'
            variant='tonal'
          />
        )
      }),
      columnHelper.accessor('$id', {
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => (
          <div className='flex items-center'>
            <OptionMenu
              iconButtonProps={{ size: 'medium' }}
              iconClassName='text-textSecondary text-[22px]'
              options={[
                {
                  text: 'View Details',
                  icon: 'ri-eye-line',
                  href: `/edms/trips/${row.original.$id}`,
                  linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' }
                },
                ...(row.original.status === 'awaiting_manifests' && hasPermission('manifests.create') ? [{
                  text: 'Add Manifests',
                  icon: 'ri-file-add-line',
                  href: `/edms/trips/${row.original.$id}/add-manifests`,
                  linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' }
                }] : []),
                ...(hasPermission('trips.edit') ? [{
                  text: 'Edit',
                  icon: 'ri-edit-box-line',
                  href: `/edms/trips/${row.original.$id}/edit`,
                  linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' }
                }] : []),
                ...(canDelete ? [{
                  text: 'Delete',
                  icon: 'ri-delete-bin-7-line',
                  menuItemProps: {
                    className: 'flex items-center gap-2 text-error',
                    onClick: () => openDeleteDialog([row.original.$id])
                  }
                }] : [])
              ]}
            />
          </div>
        )
      })
    ],
    [hasPermission, canDelete, canViewFinancials, openDeleteDialog]
  )

  const table = useReactTable({
    data: filteredTripData,
    columns,
    filterFns: {
      fuzzy: fuzzyFilter
    },
    state: {
      globalFilter,
      rowSelection
    },
    enableRowSelection: canDelete,
    onRowSelectionChange: setRowSelection,
    globalFilterFn: fuzzyFilter,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
    <Card>
      <CardContent className='flex flex-col gap-4'>
        <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <div className='flex flex-wrap items-center gap-2'>
            <TextField
              select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className='min-w-[150px]'
              size='small'
            >
              <MenuItem value='all'>All Trips</MenuItem>
              <MenuItem value='awaiting_manifests'>Awaiting Manifests</MenuItem>
              <MenuItem value='planned'>Planned</MenuItem>
              <MenuItem value='in_progress'>In Progress</MenuItem>
              <MenuItem value='completed'>Completed</MenuItem>
              <MenuItem value='cancelled'>Cancelled</MenuItem>
            </TextField>
            <TextField
              value={globalFilter ?? ''}
              onChange={e => setGlobalFilter(e.target.value)}
              placeholder='Search Trips...'
              size='small'
              className='min-w-[200px]'
            />
          </div>
          <div className='flex items-center gap-2'>
            {canDelete && table.getSelectedRowModel().rows.length > 0 && (
              <Button
                variant='contained'
                color='error'
                startIcon={<i className='ri-delete-bin-7-line' />}
                onClick={() => openDeleteDialog(table.getSelectedRowModel().rows.map(row => row.original.$id))}
                disabled={isDeleting}
              >
                Delete Selected ({table.getSelectedRowModel().rows.length})
              </Button>
            )}
            <OpenDialogOnElementClick
              element={Button}
              elementProps={{
                variant: 'outlined',
                startIcon: <i className='ri-download-line' />,
                children: 'Export',
                disabled: filteredTripData.length === 0
              }}
              dialog={GenericTableExportDialog}
              dialogProps={{
                title: 'Trip Report',
                data: filteredTripData,
                columns: exportColumns,
                summaryItems: exportSummary,
                fileName: 'trip-report'
              }}
            />
            {hasPermission('trips.create') && (
              <Button
                variant='contained'
                component={Link}
                href='/edms/trips/create'
                startIcon={<i className='ri-add-line' />}
              >
                Create Trip
              </Button>
            )}
          </div>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <DatePicker
            label='From Date'
            value={dateFrom}
            onChange={(val) => setDateFrom(val)}
            slotProps={{ textField: { size: 'small', sx: { minWidth: 160 } } }}
          />
          <DatePicker
            label='To Date'
            value={dateTo}
            onChange={(val) => setDateTo(val)}
            slotProps={{ textField: { size: 'small', sx: { minWidth: 160 } } }}
          />
          {(dateFrom || dateTo) && (
            <Button size='small' variant='text' onClick={() => { setDateFrom(null); setDateTo(null) }}>
              Clear Dates
            </Button>
          )}
        </div>
      </CardContent>

      <div className='overflow-x-auto'>
        <table className={tableStyles.table}>
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id}>
                    {header.isPlaceholder ? null : (
                      <div
                        className={classnames({
                          'flex items-center': header.column.getIsSorted(),
                          'cursor-pointer select-none': header.column.getCanSort()
                        })}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <i className='ri-arrow-up-s-line text-xl' />,
                          desc: <i className='ri-arrow-down-s-line text-xl' />
                        }[header.column.getIsSorted() as 'asc' | 'desc'] ?? null}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          {loading ? (
            <tbody>
              <tr>
                <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                  <Typography className='py-8'>Loading trips...</Typography>
                </td>
              </tr>
            </tbody>
          ) : table.getFilteredRowModel().rows.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                  <Typography className='py-8'>No trips found</Typography>
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className={classnames({ selected: row.getIsSelected() })}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 40, 50, 100]}
        component='div'
        className='border-bs'
        count={table.getFilteredRowModel().rows.length}
        rowsPerPage={table.getState().pagination.pageSize}
        page={table.getState().pagination.pageIndex}
        onPageChange={(_, page) => {
          table.setPageIndex(page)
        }}
        onRowsPerPageChange={e => table.setPageSize(Number(e.target.value))}
      />
    </Card>

    <DeleteConfirmationDialog
      open={deleteDialogOpen}
      setOpen={setDeleteDialogOpen}
      title={
        tripIdsToDelete.length > 1
          ? `Delete ${tripIdsToDelete.length} selected trips?`
          : 'Delete this trip?'
      }
      description='This action cannot be undone.'
      confirmButtonText={tripIdsToDelete.length > 1 ? 'Yes, Delete Trips' : 'Yes, Delete Trip'}
      isDeleting={isDeleting}
      onConfirm={handleConfirmDelete}
    />
    </LocalizationProvider>
  )
}

export default TripsOverviewTable
