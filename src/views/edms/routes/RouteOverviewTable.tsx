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
import type { RouteType } from '@/types/apps/deliveryTypes'

// Component Imports
import Link from '@/components/Link'
import OptionMenu from '@core/components/option-menu'
import CustomAvatar from '@core/components/mui/Avatar'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Actions Imports
import { getAllRoutes, toggleRouteStatus, deleteRoute } from '@/libs/actions/route.actions'

type RouteWithActions = RouteType

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta({ itemRank })
  return itemRank.passed
}

const columnHelper = createColumnHelper<RouteWithActions>()

const RouteOverviewTable = () => {
  // States
  const [routeData, setRouteData] = useState<RouteWithActions[]>([])
  const [loading, setLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Load routes
  useEffect(() => {
    const loadRoutes = async () => {
      try {
        setLoading(true)
        const filters = statusFilter !== 'all' ? { isActive: statusFilter === 'active' } : undefined
        const routes = await getAllRoutes(filters)
        setRouteData(routes)
      } catch (error) {
        console.error('Error loading routes:', error)
      } finally {
        setLoading(false)
      }
    }

    loadRoutes()
  }, [statusFilter])

  const handleToggleStatus = async (routeId: string) => {
    try {
      const updatedRoute = await toggleRouteStatus(routeId)
      
      // Update local state
      setRouteData(prevData =>
        prevData.map(route =>
          route.$id === routeId ? updatedRoute : route
        )
      )
    } catch (error) {
      console.error('Error toggling route status:', error)
    }
  }

  const handleDeleteRoute = async (routeId: string) => {
    if (confirm('Are you sure you want to delete this route?')) {
      try {
        await deleteRoute(routeId)
        
        // Remove from local state
        setRouteData(prevData => prevData.filter(route => route.$id !== routeId))
      } catch (error) {
        console.error('Error deleting route:', error)
      }
    }
  }

  const columns = useMemo<ColumnDef<RouteWithActions, any>[]>(
    () => [
      columnHelper.accessor('routeCode', {
        header: 'Route Code',
        cell: ({ row }) => (
          <div className='flex items-center gap-2'>
            <div className='flex flex-col'>
              <Typography className='font-medium' color='text.primary'>
                {row.original.routeCode}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {row.original.routeName}
              </Typography>
            </div>
          </div>
        )
      }),
      columnHelper.accessor('startLocationName', {
        header: 'Start Location',
        cell: ({ row }) => (
          <Typography color='text.primary'>
            {
              // @ts-ignore
            row.original.startLocation?.locationName || 'N/A'
            }
          </Typography>
        )
      }),
      columnHelper.accessor('endLocationName', {
        header: 'End Location',
        cell: ({ row }) => (
          <Typography color='text.primary'>
            {
              // @ts-ignore
            row.original.endLocation?.locationName || 'N/A'
            }
          </Typography>
        )
      }),
      columnHelper.accessor('intermediateStops', {
        header: 'Stops',
        cell: ({ row }) => (
          <Typography color='text.primary'>
            {row.original.intermediateStops.length + 2} locations
          </Typography>
        )
      }),
      columnHelper.accessor('distance', {
        header: 'Distance',
        cell: ({ row }) => (
          <Typography color='text.primary'>
            {row.original.distance ? `${row.original.distance} km` : '-'}
          </Typography>
        )
      }),
      columnHelper.accessor('estimatedDuration', {
        header: 'Duration',
        cell: ({ row }) => (
          <Typography color='text.primary'>
            {row.original.estimatedDuration ? `${row.original.estimatedDuration} min` : '-'}
          </Typography>
        )
      }),
      columnHelper.accessor('isActive', {
        header: 'Status',
        cell: ({ row }) => (
          <Chip
            label={row.original.isActive ? 'Active' : 'Inactive'}
            color={row.original.isActive ? 'success' : 'secondary'}
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
                  href: `/edms/routes/${row.original.$id}`,
                  linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' }
                },
                {
                  text: 'Edit',
                  icon: 'ri-edit-box-line',
                  href: `/edms/routes/${row.original.$id}/edit`,
                  linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' }
                },
                {
                  text: row.original.isActive ? 'Deactivate' : 'Activate',
                  icon: row.original.isActive ? 'ri-close-circle-line' : 'ri-checkbox-circle-line',
                  linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' },
                  menuItemProps: { onClick: () => handleToggleStatus(row.original.$id) }
                },
                {
                  text: 'Delete',
                  icon: 'ri-delete-bin-7-line',
                  linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4 text-error' },
                  menuItemProps: { onClick: () => handleDeleteRoute(row.original.$id) }
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
    data: routeData,
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
            onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className='min-w-[150px]'
            size='small'
          >
            <MenuItem value='all'>All Routes</MenuItem>
            <MenuItem value='active'>Active</MenuItem>
            <MenuItem value='inactive'>Inactive</MenuItem>
          </TextField>
          <TextField
            value={globalFilter ?? ''}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder='Search Routes...'
            size='small'
            className='min-w-[200px]'
          />
        </div>
        <Button
          variant='contained'
          component={Link}
          href='/edms/routes/create'
          startIcon={<i className='ri-add-line' />}
        >
          Create Route
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
                  <Typography className='py-8'>Loading routes...</Typography>
                </td>
              </tr>
            </tbody>
          ) : table.getFilteredRowModel().rows.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                  <Typography className='py-8'>No routes found</Typography>
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

export default RouteOverviewTable
