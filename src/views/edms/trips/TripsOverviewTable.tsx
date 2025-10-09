'use client'

// React Imports
import { useState, useMemo, useEffect } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import TablePagination from '@mui/material/TablePagination'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'

// Third-party Imports
import classnames from 'classnames'
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
import { getAllTrips, updateTripStatus } from '@/libs/actions/trip.actions'

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta({ itemRank })
  return itemRank.passed
}

const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'> = {
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
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Load trips
  useEffect(() => {
    const loadTrips = async () => {
      try {
        setLoading(true)
        const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined
        const trips = await getAllTrips(filters)
        setTripData(trips)
      } catch (error) {
        console.error('Error loading trips:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTrips()
  }, [statusFilter])


  const columns = useMemo<ColumnDef<TripType, any>[]>(
    () => [
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
      columnHelper.accessor('manifests', {
        header: 'Manifests',
        cell: ({ row }) => (
          <Typography color='text.primary'>
            {Array.isArray(row.original.manifests) ? row.original.manifests.length : 0}
          </Typography>
        )
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: ({ row }) => (
          <Chip
            label={row.original.status?.replace('_', ' ').toUpperCase()}
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
                {
                  text: 'Edit',
                  icon: 'ri-edit-box-line',
                  href: `/edms/trips/${row.original.$id}/edit`,
                  linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' }
                }
              ]}
            />
          </div>
        )
      })
    ],
    []
  )

  const table = useReactTable({
    data: tripData,
    columns,
    filterFns: {
      fuzzy: fuzzyFilter
    },
    state: {
      globalFilter
    },
    globalFilterFn: fuzzyFilter,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  return (
    <Card>
      <CardContent className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
        <div className='flex items-center gap-2'>
          <TextField
            select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className='min-w-[150px]'
            size='small'
          >
            <MenuItem value='all'>All Trips</MenuItem>
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
        <Button
          variant='contained'
          component={Link}
          href='/edms/trips/create'
          startIcon={<i className='ri-add-line' />}
        >
          Create Trip
        </Button>
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
        rowsPerPageOptions={[10, 25, 50]}
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
  )
}

export default TripsOverviewTable
