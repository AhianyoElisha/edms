'use client'

// React Imports
import { useState, useMemo, useCallback, useEffect } from 'react'

// Next Imports
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Checkbox from '@mui/material/Checkbox'
import LinearProgress from '@mui/material/LinearProgress'
import TablePagination from '@mui/material/TablePagination'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

// Third-party Imports
import classnames from 'classnames'
import { rankItem } from '@tanstack/match-sorter-utils'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
  getPaginationRowModel,
  getSortedRowModel
} from '@tanstack/react-table'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import type { RankingInfo } from '@tanstack/match-sorter-utils'

// Type Imports
import type { ThemeColor } from '@core/types'
import type { Locale } from '@configs/i18n'
import type { Vehicle } from '@/types/apps/logisticsTypes'

// Components Imports
import CustomAvatar from '@core/components/mui/Avatar'
import OptionMenu from '@core/components/option-menu'

// Util Imports

// Style Imports
import tableStyles from '@core/styles/table.module.css'
import { Logistics } from '@/types/apps/ecommerceTypes'
import { getLogisticsList } from '@/libs/actions/customer.action'
import { toast } from 'react-toastify'
import LoaderDark from '@/components/layout/shared/LoaderDark'
import AddLogisticsDrawer from './AddTruckorTricycleDrawer'
import EditLogisticsDrawer from './EditTruckorTricycleDrawer'
import { Button, CardContent, TextField, TextFieldProps } from '@mui/material'

declare module '@tanstack/table-core' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface FilterMeta {
    itemRank: RankingInfo
  }
}

type chipColorType = {
  color: ThemeColor
}

export const chipColor: { [key: string]: chipColorType } = {
  'No Warnings': { color: 'success' },
  'Fuel Problems': { color: 'primary' },
  'Temperature Not Optimal': { color: 'warning' },
  'Ecu Not Responding': { color: 'error' },
  'Oil Leakage': { color: 'info' }
}

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  // Rank the item
  const itemRank = rankItem(row.getValue(columnId), value)

  // Store the itemRank info
  addMeta({
    itemRank
  })

  // Return if the item should be filtered in/out
  return itemRank.passed
}

type LogisticsTypeWithAction = Logistics & {
  actions?: string
}

const DebouncedInput = ({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}: {
  value: string | number
  onChange: (value: string | number) => void
  debounce?: number
} & Omit<TextFieldProps, 'onChange'>) => {
  // States
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value)
    }, debounce)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return <TextField {...props} value={value} onChange={e => setValue(e.target.value)} size='small' />
}

// Column Definitions
const columnHelper = createColumnHelper<LogisticsTypeWithAction>()

const LogisticsOverviewTable = ({ vehicleData }: { vehicleData?: Logistics[] }) => {
  // States
  const [logisticsOpen, setLogisticsOpen] = useState(false)
  const [editLogisticsOpen, setEditLogisticsOpen] = useState<{ open: boolean; data: Logistics | null }>({ open: false, data: null })
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState<Logistics[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()

  // Hooks
  const { lang: locale } = useParams()


  const fetchLogisticsData = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await getLogisticsList()
      setData(response?.documents as unknown as Logistics[])
    } catch (error) {
      console.error('Error fetching vehicles  data:', error)
      toast.error('Failed to fetch vehicles data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogisticsData()
  }, [fetchLogisticsData])

  const columns = useMemo<ColumnDef<LogisticsTypeWithAction, any>[]>(
    () => [
      columnHelper.accessor('vehicleNumber', {
        header: 'Vehicle',
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            <CustomAvatar skin='light' color='secondary'>
              {
                row.original.vehicleType === 'truck' ? <i className='ri-truck-line text-[28px]' /> :
                row.original.vehicleType === 'van' ? <i className='ri-car-line text-[28px]' /> :
                row.original.vehicleType === 'bike' ? <i className='ri-e-bike-2-line text-[28px]' /> :
                <i className='ri-car-fill text-[28px]' />
              }
            </CustomAvatar>
            <div className='flex flex-col'>
              <Typography
                component={Link}
                href={`/vehicles/${row.original.$id}`}
                className='font-medium hover:text-primary'
                color='text.primary'
              >
                {row.original.vehicleNumber}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {row.original.vehicleType?.charAt(0).toUpperCase() + row.original.vehicleType?.slice(1)}
              </Typography>
            </div>
          </div>
        )
      }),
      columnHelper.accessor('brand', {
        header: 'Brand & Model',
        cell: ({ row }) => (
          <div className='flex flex-col'>
            <Typography color='text.primary' className='font-medium'>
              {row.original.brand || 'N/A'}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {row.original.model || 'N/A'}
            </Typography>
          </div>
        )
      }),
      columnHelper.accessor('year', {
        header: 'Year',
        cell: ({ row }) => (
          <Typography color='text.primary'>
            {row.original.year || 'N/A'}
          </Typography>
        )
      }),
      columnHelper.accessor('ownership', {
        header: 'Ownership',
        cell: ({ row }) => (
          <Chip
            variant='tonal'
            label={row.original.ownership === 'owned' ? 'Owned' : 'Rented'}
            size='small'
            color={row.original.ownership === 'owned' ? 'success' : 'warning'}
            icon={row.original.ownership === 'owned' ? 
              <i className='ri-check-line' /> : 
              <i className='ri-exchange-line' />
            }
          />
        )
      }),
      columnHelper.accessor('monthlyRentalCost', {
        header: 'Rental Cost',
        cell: ({ row }) => (
          <Typography color='text.primary'>
            {row.original.ownership === 'rented' && row.original.monthlyRentalCost 
              ? `GHS ${row.original.monthlyRentalCost.toLocaleString()}` 
              : '-'}
          </Typography>
        )
      }),
      columnHelper.accessor('driver', {
        header: 'Driver',
        cell: ({ row }) => (
          <Typography color='text.primary'>
            {row.original.driver ? (
              <Chip
                variant='tonal'
                label='Assigned'
                size='small'
                color='primary'
                icon={<i className='ri-user-line' />}
              />
            ) : (
              <Chip
                variant='tonal'
                label='Unassigned'
                size='small'
                color='secondary'
                icon={<i className='ri-user-unfollow-line' />}
              />
            )}
          </Typography>
        )
      }),
      columnHelper.accessor('assignedRoutes', {
        header: 'Routes',
        cell: ({ row }) => (
          <div className='flex items-center gap-1'>
            {row.original.assignedRoutes && row.original.assignedRoutes.length > 0 ? (
              <>
                <Chip
                  variant='tonal'
                  label={`${row.original.assignedRoutes.length} Route${row.original.assignedRoutes.length > 1 ? 's' : ''}`}
                  size='small'
                  color='info'
                  icon={<i className='ri-route-line' />}
                />
              </>
            ) : (
              <Chip
                variant='tonal'
                label='No Routes'
                size='small'
                color='secondary'
              />
            )}
          </div>
        )
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: ({ row }) => (
          <Chip
            variant='tonal'
            label={row.original.status?.charAt(0).toUpperCase() + row.original.status?.slice(1)}
            size='small'
            color={
              row.original.status === 'active' ? 'success' :
              row.original.status === 'maintenance' ? 'warning' :
              'error'
            }
            icon={
              row.original.status === 'active' ? <i className='ri-checkbox-circle-line' /> :
              row.original.status === 'maintenance' ? <i className='ri-tools-line' /> :
              <i className='ri-close-circle-line' />
            }
          />
        )
      }),
      columnHelper.accessor('actions', {
        header: 'Actions',
        cell: ({ row }) => (
          <div className='flex items-center'>
            <OptionMenu
              iconButtonProps={{ size: 'medium' }}
              iconClassName='text-textSecondary text-[22px]'
              options={[
                {
                  text: 'Edit',
                  icon: 'ri-edit-box-line',
                  linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' },
                  menuItemProps: { onClick: () => setEditLogisticsOpen({ open: true, data: row.original })}
                },
                { 
                  text: 'Details', 
                  icon: 'ri-stack-line',
                  linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' },
                  menuItemProps: { onClick: () => router.push(`/vehicles/${row.original.$id}`) }
                },
              ]}
            />
          </div>
        ),
        enableSorting: false
      })
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const table = useReactTable({
    data: data as Logistics[],
    columns,
    filterFns: {
      fuzzy: fuzzyFilter
    },
    state: {
      rowSelection
    },
    initialState: {
      pagination: {
        pageSize: 5
      }
    },
    enableRowSelection: true, //enable row selection for all rows
    // enableRowSelection: row => row.original.age > 18, // or enable row selection conditionally per row
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues()
  })

  return (
  <>
    <Card>
      <CardHeader 
        title='Fleet Management' 
        subheader='Complete vehicle inventory with ownership, driver assignments, and route details'
        action={<OptionMenu options={['Refresh', 'Update', 'Share']} />} 
      />
        <CardContent className='flex justify-between flex-wrap max-sm:flex-col sm:items-center gap-4'>
          <DebouncedInput
            value={globalFilter ?? ''}
            onChange={value => setGlobalFilter(String(value))}
            placeholder='Search'
            className='max-sm:is-full'
          />
          <div className='flex gap-4 max-sm:flex-col max-sm:is-full'>
            <Button
              variant='outlined'
              className='max-sm:is-full'
              color='secondary'
              startIcon={<i className='ri-upload-2-line' />}
            >
              Export
            </Button>
            <Button
              variant='contained'
              color='primary'
              className='max-sm:is-full'
              startIcon={<i className='ri-add-line' />}
              onClick={() => setLogisticsOpen(!logisticsOpen)}
            >
              Add Vehicle
            </Button>
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
                      <>
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
                      </>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          {table.getFilteredRowModel().rows.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                  {isLoading ? <LoaderDark /> : 'No data available'}
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody>
              {table
                .getRowModel()
                .rows.slice(0, table.getState().pagination.pageSize)
                .map(row => {
                  return (
                    <tr key={row.id} className={classnames({ selected: row.getIsSelected() })}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                  )
                })}
            </tbody>
          )}
        </table>
      </div>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component='div'
        className='border-bs'
        count={table.getExpandedRowModel().rows.length}
        rowsPerPage={table.getState().pagination.pageSize}
        page={table.getState().pagination.pageIndex}
        onPageChange={(_, page) => {
          table.setPageIndex(page)
        }}
        onRowsPerPageChange={e => table.setPageSize(Number(e.target.value))}
      />
      </Card>
      <AddLogisticsDrawer
        open={logisticsOpen}
        handleClose={() => setLogisticsOpen(!logisticsOpen)}
        vehicleData={data}
        onSuccess={fetchLogisticsData}
      />
      <EditLogisticsDrawer
        open={editLogisticsOpen.open}
        handleClose={() => setEditLogisticsOpen({ open: false, data: null })}
        vehicleData={editLogisticsOpen.data!}
        onSuccess={fetchLogisticsData}
      />
  </>
  )
}

export default LogisticsOverviewTable
