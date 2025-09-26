'use client'

// React Imports
import { useState, useEffect, useMemo, useCallback } from 'react'

// Next Imports
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import TablePagination from '@mui/material/TablePagination'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Menu from '@mui/material/Menu'
import Tooltip from '@mui/material/Tooltip'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

// Third-party Imports
import classnames from 'classnames'
import { rankItem } from '@tanstack/match-sorter-utils'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
  getPaginationRowModel,
  getSortedRowModel
} from '@tanstack/react-table'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import type { RankingInfo } from '@tanstack/match-sorter-utils'
import { toast } from 'react-toastify'

// Type Imports
import type { ThemeColor } from '@core/types'
import { VehicleType, VehicleStatusType } from '@/types/apps/deliveryTypes'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'
import OptionMenu from '@core/components/option-menu'

// Action Imports
import { 
  getAllVehicles, 
  deleteVehicle, 
  updateVehicleStatus,
  getVehicleStatistics 
} from '@/libs/actions/vehicle.actions'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

declare module '@tanstack/table-core' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface FilterMeta {
    itemRank: RankingInfo
  }
}

type VehicleStatusChipColorType = {
  color: ThemeColor
}

export const statusChipColor: { [key: string]: VehicleStatusChipColorType } = {
  active: { color: 'success' },
  available: { color: 'info' },
  maintenance: { color: 'warning' },
  unavailable: { color: 'error' }
}

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta({
    itemRank
  })
  return itemRank.passed
}

const columnHelper = createColumnHelper<VehicleType>()

const VehicleOverviewTable = () => {
  // States
  const [vehicles, setVehicles] = useState<VehicleType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rowSelection, setRowSelection] = useState({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [statistics, setStatistics] = useState<any>(null)

  // Hooks
  const router = useRouter()

  // Fetch vehicles data
  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [vehiclesData, statsData] = await Promise.all([
        getAllVehicles(),
        getVehicleStatistics()
      ])
      setVehicles(vehiclesData)
      setStatistics(statsData)
    } catch (error) {
      console.error('Error fetching vehicles:', error)
      setError('Failed to load vehicles')
      toast.error('Failed to load vehicles')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load data on component mount
  useEffect(() => {
    fetchVehicles()
  }, [fetchVehicles])

  // Handle delete vehicle
  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return

    try {
      setDeleteLoading(vehicleId)
      await deleteVehicle(vehicleId)
      await fetchVehicles() // Refresh the data
      toast.success('Vehicle deleted successfully')
    } catch (error) {
      console.error('Error deleting vehicle:', error)
      toast.error('Failed to delete vehicle')
    } finally {
      setDeleteLoading(null)
    }
  }

  // Handle status update
  const handleStatusUpdate = async (vehicleId: string, newStatus: VehicleStatusType) => {
    try {
      await updateVehicleStatus(vehicleId, newStatus)
      await fetchVehicles() // Refresh the data
      toast.success('Vehicle status updated successfully')
    } catch (error) {
      console.error('Error updating vehicle status:', error)
      toast.error('Failed to update vehicle status')
    }
  }

  // Handle edit vehicle
  const handleEditVehicle = (vehicle: VehicleType) => {
    // Navigate to edit page or open dialog
    router.push(`/vehicles/${vehicle.$id}/edit`)
  }

  // Table columns
  const columns = useMemo<ColumnDef<VehicleType, any>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            {...{
              checked: table.getIsAllRowsSelected(),
              indeterminate: table.getIsSomeRowsSelected(),
              onChange: table.getToggleAllRowsSelectedHandler()
            }}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            {...{
              checked: row.getIsSelected(),
              disabled: !row.getCanSelect(),
              indeterminate: row.getIsSomeSelected(),
              onChange: row.getToggleSelectedHandler()
            }}
          />
        )
      },
      columnHelper.accessor('licensePlate', {
        header: 'License Plate',
        cell: ({ row }) => (
          <div className='flex items-center gap-4'>
            <CustomAvatar skin='light' size={34}>
              {row.original.type === 'truck' && <i className='ri-truck-line' />}
              {row.original.type === 'van' && <i className='ri-car-line' />}
              {row.original.type === 'motorcycle' && <i className='ri-motorbike-line' />}
              {row.original.type === 'bicycle' && <i className='ri-bike-line' />}
            </CustomAvatar>
            <div className='flex flex-col'>
              <Typography
                component={Link}
                href={`/vehicles/${row.original.$id}`}
                className='font-medium hover:text-primary'
                color='text.primary'
              >
                {row.original.licensePlate}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {row.original.model} ({row.original.year})
              </Typography>
            </div>
          </div>
        )
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        cell: ({ row }) => (
          <div className='flex items-center gap-2'>
            <Chip
              variant='tonal'
              label={row.original.type.charAt(0).toUpperCase() + row.original.type.slice(1)}
              size='small'
              color='primary'
            />
          </div>
        )
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: ({ row }) => (
          <Chip
            variant='tonal'
            label={row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
            size='small'
            color={statusChipColor[row.original.status]?.color}
          />
        )
      }),
      columnHelper.accessor('driverName', {
        header: 'Assigned Driver',
        cell: ({ row }) => (
          <Typography color='text.primary'>
            {row.original.driverName || 'Unassigned'}
          </Typography>
        )
      }),
      columnHelper.accessor('capacity', {
        header: 'Capacity',
        cell: ({ row }) => (
          <Typography color='text.primary'>
            {row.original.capacity}
          </Typography>
        )
      }),
      columnHelper.accessor('location', {
        header: 'Location',
        cell: ({ row }) => (
          <Typography color='text.primary'>
            {row.original.location || 'Unknown'}
          </Typography>
        )
      }),
      columnHelper.accessor('fuelLevel', {
        header: 'Fuel/Battery',
        cell: ({ row }) => {
          const level = row.original.type === 'bicycle' || row.original.type === 'motorcycle' 
            ? row.original.batteryLevel 
            : row.original.fuelLevel
          const color = level && level > 70 ? 'success' : level && level > 30 ? 'warning' : 'error'
          
          return (
            <div className='flex items-center gap-2'>
              <Typography variant='body2'>
                {level || 0}%
              </Typography>
              <Chip
                variant='tonal'
                label={`${level || 0}%`}
                size='small'
                color={color}
              />
            </div>
          )
        }
      }),
      columnHelper.accessor('$id', {
        header: 'Actions',
        cell: ({ row }) => (
          <div className='flex items-center'>
            <OptionMenu
              iconButtonProps={{ size: 'medium' }}
              iconClassName='text-textSecondary'
              options={[
                {
                  text: 'View Details',
                  icon: 'ri-eye-line',
                  href: `/vehicles/${row.original.$id}`
                },
                {
                  text: 'Edit',
                  icon: 'ri-edit-box-line',
                  menuItemProps: {
                    onClick: () => handleEditVehicle(row.original)
                  }
                },
                {
                  text: 'Set Active',
                  icon: 'ri-play-circle-line',
                  menuItemProps: {
                    onClick: () => handleStatusUpdate(row.original.$id, 'active'),
                    disabled: row.original.status === 'active'
                  }
                },
                {
                  text: 'Set Available',
                  icon: 'ri-pause-circle-line',
                  menuItemProps: {
                    onClick: () => handleStatusUpdate(row.original.$id, 'available'),
                    disabled: row.original.status === 'available'
                  }
                },
                {
                  text: 'Maintenance',
                  icon: 'ri-tools-line',
                  menuItemProps: {
                    onClick: () => handleStatusUpdate(row.original.$id, 'maintenance'),
                    disabled: row.original.status === 'maintenance'
                  }
                },
                {
                  text: 'Delete',
                  icon: 'ri-delete-bin-7-line',
                  menuItemProps: {
                    onClick: () => handleDeleteVehicle(row.original.$id),
                    disabled: deleteLoading === row.original.$id
                  }
                }
              ]}
            />
            {deleteLoading === row.original.$id && (
              <CircularProgress size={16} className='ml-2' />
            )}
          </div>
        ),
        enableSorting: false
      })
    ],
    [deleteLoading]
  )

  // Table instance
  const table = useReactTable({
    data: vehicles,
    columns,
    filterFns: {
      fuzzy: fuzzyFilter
    },
    state: {
      rowSelection,
      globalFilter
    },
    initialState: {
      pagination: {
        pageSize: 10
      }
    },
    enableRowSelection: true,
    globalFilterFn: fuzzyFilter,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues()
  })

  if (error) {
    return (
      <Card>
        <CardHeader title='Vehicles' />
        <Alert severity='error' className='m-4'>
          {error}
          <Button onClick={fetchVehicles} className='ml-2'>
            Retry
          </Button>
        </Alert>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader 
          title='Vehicles Management' 
          action={
            <Button
              variant='contained'
              startIcon={<i className='ri-add-line' />}
              onClick={() => router.push('/vehicles/add')}
            >
              Add Vehicle
            </Button>
          }
        />
        
        {/* Statistics Cards */}
        {statistics && (
          <Box className='p-4'>
            <Grid container spacing={4}>
              <Grid item xs={12} sm={3}>
                <Card className='border'>
                  <div className='flex items-center p-4'>
                    <CustomAvatar variant='rounded' skin='light' color='primary'>
                      <i className='ri-car-line text-[22px]' />
                    </CustomAvatar>
                    <div className='ml-4'>
                      <Typography variant='h5'>{statistics.total}</Typography>
                      <Typography variant='body2'>Total Vehicles</Typography>
                    </div>
                  </div>
                </Card>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Card className='border'>
                  <div className='flex items-center p-4'>
                    <CustomAvatar variant='rounded' skin='light' color='success'>
                      <i className='ri-play-circle-line text-[22px]' />
                    </CustomAvatar>
                    <div className='ml-4'>
                      <Typography variant='h5'>{statistics.active}</Typography>
                      <Typography variant='body2'>Active</Typography>
                    </div>
                  </div>
                </Card>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Card className='border'>
                  <div className='flex items-center p-4'>
                    <CustomAvatar variant='rounded' skin='light' color='info'>
                      <i className='ri-pause-circle-line text-[22px]' />
                    </CustomAvatar>
                    <div className='ml-4'>
                      <Typography variant='h5'>{statistics.available}</Typography>
                      <Typography variant='body2'>Available</Typography>
                    </div>
                  </div>
                </Card>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Card className='border'>
                  <div className='flex items-center p-4'>
                    <CustomAvatar variant='rounded' skin='light' color='warning'>
                      <i className='ri-tools-line text-[22px]' />
                    </CustomAvatar>
                    <div className='ml-4'>
                      <Typography variant='h5'>{statistics.maintenance}</Typography>
                      <Typography variant='body2'>Maintenance</Typography>
                    </div>
                  </div>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Search and Filters */}
        <div className='flex flex-col gap-4 p-6 border-bs'>
          <div className='flex items-center justify-between flex-wrap gap-4'>
            <div className='flex items-center gap-2'>
              <Typography variant='h5'>Search</Typography>
              <TextField
                placeholder='Search vehicles...'
                value={globalFilter ?? ''}
                onChange={e => setGlobalFilter(String(e.target.value))}
                className='max-sm:is-full'
                InputProps={{
                  startAdornment: <i className='ri-search-line' />
                }}
              />
            </div>
            <Button
              variant='outlined'
              startIcon={<i className='ri-upload-2-line' />}
              className='max-sm:is-full'
            >
              Export
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className='overflow-x-auto'>
          {loading ? (
            <div className='flex items-center justify-center p-8'>
              <CircularProgress />
              <Typography className='ml-2'>Loading vehicles...</Typography>
            </div>
          ) : (
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
              <tbody>
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                      <Typography className='py-8'>No vehicles found</Typography>
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <tr key={row.id} className={classnames({ selected: row.getIsSelected() })}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component='div'
          className='border-bs'
          count={table.getFilteredRowModel().rows.length}
          rowsPerPage={table.getState().pagination.pageSize}
          page={table.getState().pagination.pageIndex}
          SelectProps={{
            inputProps: { 'aria-label': 'rows per page' }
          }}
          onPageChange={(_, page) => table.setPageIndex(page)}
          onRowsPerPageChange={e => table.setPageSize(Number(e.target.value))}
        />
      </Card>


    </>
  )
}

export default VehicleOverviewTable