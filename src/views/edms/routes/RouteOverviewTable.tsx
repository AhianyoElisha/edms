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

// Hook Imports
import { usePermissions } from '@/hooks/usePermissions'

// Dialog Imports
import OpenDialogOnElementClick from '@/components/dialogs/OpenDialogOnElementClick'
import GenericTableExportDialog from '@/components/dialogs/generic-table-export-dialog'
import type { ExportColumn, ExportSummary } from '@/components/dialogs/generic-table-export-dialog'

type RouteWithActions = RouteType

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta({ itemRank })
  return itemRank.passed
}

const columnHelper = createColumnHelper<RouteWithActions>()

const RouteOverviewTable = () => {
  // Permissions
  const { hasPermission } = usePermissions()

  // Routing
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // States
  const [routeData, setRouteData] = useState<RouteWithActions[]>([])
  const [loading, setLoading] = useState(true)

  // Read filters from URL params
  const globalFilter = searchParams.get('search') || ''
  const statusFilter = (searchParams.get('status') || 'all') as 'all' | 'active' | 'inactive'

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

  // Export configuration
  const exportColumns: ExportColumn[] = useMemo(() => [
    { header: 'Route Code', accessor: (row: RouteType) => row.routeCode, width: 20, excelWidth: 14 },
    { header: 'Route Name', accessor: (row: RouteType) => row.routeName, width: 30, excelWidth: 22 },
    { header: 'Start Location', accessor: (row: RouteType) => typeof (row.startLocation as any) === 'object' ? (row.startLocation as any).locationName : 'N/A', width: 28, excelWidth: 20 },
    { header: 'End Location', accessor: (row: RouteType) => typeof (row.endLocation as any) === 'object' ? (row.endLocation as any).locationName : 'N/A', width: 28, excelWidth: 20 },
    { header: 'Stops', accessor: (row: RouteType) => `${row.intermediateStops.length + 2} locations`, align: 'center', width: 18, excelWidth: 14 },
    { header: 'Distance (km)', accessor: (row: RouteType) => row.distance ? `${row.distance}` : '-', align: 'right', width: 20, excelWidth: 14 },
    { header: 'Duration (min)', accessor: (row: RouteType) => row.estimatedDuration ? `${row.estimatedDuration}` : '-', align: 'right', width: 20, excelWidth: 14 },
    { header: 'Status', accessor: (row: RouteType) => row.isActive ? 'Active' : 'Inactive', width: 15, excelWidth: 10 }
  ], [])

  const exportSummary: ExportSummary[] = useMemo(() => [
    { label: 'Total Routes', value: String(routeData.length) },
    { label: 'Active', value: String(routeData.filter(r => r.isActive).length) },
    { label: 'Inactive', value: String(routeData.filter(r => !r.isActive).length) }
  ], [routeData])

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
      columnHelper.accessor('startLocation', {
        header: 'Start Location',
        cell: ({ row }) => (
          <Typography color='text.primary'>
            {typeof (row.original.startLocation as any) === 'object'
              ? (row.original.startLocation as any).locationName
              : 'N/A'}
          </Typography>
        )
      }),
      columnHelper.accessor('endLocation', {
        header: 'End Location',
        cell: ({ row }) => (
          <Typography color='text.primary'>
            {typeof (row.original.endLocation as any) === 'object'
              ? (row.original.endLocation as any).locationName
              : 'N/A'}
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
                ...(hasPermission('routes.edit') ? [{
                  text: 'Edit',
                  icon: 'ri-edit-box-line',
                  href: `/edms/routes/${row.original.$id}/edit`,
                  linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' }
                }] : []),
                {
                  text: row.original.isActive ? 'Deactivate' : 'Activate',
                  icon: row.original.isActive ? 'ri-close-circle-line' : 'ri-checkbox-circle-line',
                  linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' },
                  menuItemProps: { onClick: () => handleToggleStatus(row.original.$id) }
                },
                ...(hasPermission('routes.delete') ? [{
                  text: 'Delete',
                  icon: 'ri-delete-bin-7-line',
                  linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4 text-error' },
                  menuItemProps: { onClick: () => handleDeleteRoute(row.original.$id) }
                }] : [])
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
        <div className='flex items-center gap-2'>
          <OpenDialogOnElementClick
            element={Button}
            elementProps={{
              variant: 'outlined',
              startIcon: <i className='ri-download-line' />,
              children: 'Export',
              disabled: routeData.length === 0
            }}
            dialog={GenericTableExportDialog}
            dialogProps={{
              title: 'Route Report',
              data: routeData,
              columns: exportColumns,
              summaryItems: exportSummary,
              fileName: 'route-report'
            }}
          />
          {hasPermission('routes.create') && (
            <Button
              variant='contained'
              component={Link}
              href='/edms/routes/create'
              startIcon={<i className='ri-add-line' />}
            >
              Create Route
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
  )
}

export default RouteOverviewTable
