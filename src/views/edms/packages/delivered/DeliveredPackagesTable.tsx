'use client'

// React Imports
import { useCallback, useEffect, useMemo, useState } from 'react'

// Next Imports
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Button, { ButtonProps } from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { TextFieldProps } from '@mui/material/TextField'
import Grid from '@mui/material/Grid'
import { DatePicker } from '@mui/x-date-pickers-pro'
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers-pro'
import { LicenseInfo } from '@mui/x-license'
import dayjs, { Dayjs } from 'dayjs'

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
import { format } from 'date-fns'
import { toast } from 'react-toastify'

// Type Imports
import type { ThemeColor } from '@core/types'
import type { PackageTrackingType } from '@/types/apps/deliveryTypes'

// Component Imports
import OptionMenu from '@core/components/option-menu'
import LoaderDark from '@/components/layout/shared/LoaderDark'
import OpenDialogOnElementClick from '@/components/dialogs/OpenDialogOnElementClick'
import InventoryExportDialog from '@/components/dialogs/stores-dialog'

// Action Imports
import { getDeliveredPackagesByDateRange } from '@/libs/actions/package.actions'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Set MUI X License
LicenseInfo.setLicenseKey('e0d9bb8070ce0054c9d9ecb6e82cb58fTz0wLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxLVj0y')

declare module '@tanstack/table-core' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface FilterMeta {
    itemRank: RankingInfo
  }
}

type PackageWithActionsType = PackageTrackingType & {
  actions?: string
}

type PackageSizeType = {
  [key: string]: {
    label: string
    color: ThemeColor
  }
}

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta({ itemRank })
  return itemRank.passed
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
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value)
    }, debounce)

    return () => clearTimeout(timeout)
  }, [value, debounce, onChange])

  return <TextField {...props} value={value} onChange={e => setValue(e.target.value)} size='small' />
}

const packageSizeObj: PackageSizeType = {
  small: { label: 'Small', color: 'info' },
  medium: { label: 'Medium', color: 'warning' },
  big: { label: 'Big', color: 'error' },
  bin: { label: 'Bin', color: 'secondary' }
}

// Column Definitions
const columnHelper = createColumnHelper<PackageWithActionsType>()

const DeliveredPackagesTable = () => {
  // States
  const [data, setData] = useState<PackageTrackingType[]>([])
  const [filteredData, setFilteredData] = useState(data)
  const [globalFilter, setGlobalFilter] = useState('')
  const [globalFilteredData, setGlobalFilteredData] = useState<PackageTrackingType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(7, 'days'))
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs())
  
  // Hooks
  const router = useRouter()
  
  // Fetch delivered packages
  const fetchDeliveredPackages = useCallback(async () => {
    try {
      setIsLoading(true)
      
      const startDateISO = startDate ? startDate.startOf('day').toISOString() : undefined
      const endDateISO = endDate ? endDate.endOf('day').toISOString() : undefined
      
      const packages = await getDeliveredPackagesByDateRange(startDateISO, endDateISO)
      
      setData(packages)
      setFilteredData(packages)
      
    } catch (error) {
      console.error('Error fetching delivered packages:', error)
      toast.error('Failed to fetch delivered packages')
    } finally {
      setIsLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchDeliveredPackages()
  }, [fetchDeliveredPackages])

  const columns = useMemo<ColumnDef<PackageWithActionsType, any>[]>(
    () => [
      columnHelper.accessor('trackingNumber', {
        header: 'Tracking Number',
        cell: ({ row }) => (
          <div className='flex flex-col'>
            <Typography className='font-medium' color='text.primary'>
              {row.original.trackingNumber}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {row.original.recipient}
            </Typography>
          </div>
        )
      }),
      columnHelper.accessor('recipientPhone', {
        header: 'Recipient Phone',
        cell: ({ row }) => (
          <Typography color='text.primary'>{row.original.recipientPhone}</Typography>
        )
      }),
      columnHelper.accessor('packageSize', {
        header: 'Package Size',
        cell: ({ row }) => {
          const size = row.original.isBin ? 'bin' : row.original.packageSize
          return (
            <div className='flex items-center gap-2'>
              <Chip
                label={packageSizeObj[size]?.label || size}
                variant='tonal'
                color={packageSizeObj[size]?.color || 'default'}
                size='small'
              />
              {row.original.isBin && row.original.itemCount && (
                <Typography variant='body2' color='text.secondary'>
                  ({row.original.itemCount} items)
                </Typography>
              )}
            </div>
          )
        }
      }),
      columnHelper.accessor('deliveryDate', {
        header: 'Delivery Date',
        cell: ({ row }) => {
          const dateString = row.original.deliveryDate
          let formattedDate = 'N/A'
          
          if (dateString) {
            try {
              const date = new Date(dateString)
              if (!isNaN(date.getTime())) {
                formattedDate = format(date, 'MMM dd, yyyy HH:mm')
              }
            } catch (error) {
              console.error('Error parsing date:', error)
            }
          }
          
          return <Typography>{formattedDate}</Typography>
        }
      }),
      columnHelper.accessor('expectedDeliveryDate', {
        header: 'Expected Date',
        cell: ({ row }) => {
          const dateString = row.original.expectedDeliveryDate
          let formattedDate = 'N/A'
          
          if (dateString) {
            try {
              const date = new Date(dateString)
              if (!isNaN(date.getTime())) {
                formattedDate = format(date, 'MMM dd, yyyy')
              }
            } catch (error) {
              console.error('Error parsing date:', error)
            }
          }
          
          return <Typography>{formattedDate}</Typography>
        }
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: ({ row }) => (
          <Chip
            label='Delivered'
            variant='tonal'
            color='success'
            size='small'
          />
        )
      }),
      columnHelper.accessor('$createdAt', {
        header: 'Created Date',
        cell: ({ row }) => {
          const dateString = row.original.$createdAt
          let formattedDate = 'N/A'
          
          if (dateString) {
            try {
              const date = new Date(dateString)
              if (!isNaN(date.getTime())) {
                formattedDate = format(date, 'MMM dd, yyyy')
              }
            } catch (error) {
              console.error('Error parsing date:', error)
            }
          }
          
          return <Typography>{formattedDate}</Typography>
        }
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
                  text: 'View Details', 
                  icon: 'ri-eye-line',
                  menuItemProps: { onClick: () => router.push(`/edms/packages/${row.original.$id}`) }
                }
              ]}
            />
          </div>
        ),
        enableSorting: false
      })
    ],
    [router]
  )

  const table = useReactTable({
    data: filteredData as PackageTrackingType[],
    columns,
    filterFns: {
      fuzzy: fuzzyFilter
    },
    state: {
      globalFilter
    },
    initialState: {
      pagination: {
        pageSize: 10
      }
    },
    globalFilterFn: fuzzyFilter,
    getCoreRowModel: getCoreRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues()
  })

  useEffect(() => {
    setGlobalFilteredData(table.getFilteredRowModel().rows.map(row => row.original))
  }, [table.getFilteredRowModel().rows])

  const buttonProps: ButtonProps = {
    variant: 'outlined',
    children: 'Export',
    className: 'max-sm:is-full is-auto',
    color: 'secondary',
    startIcon: <i className='ri-upload-2-line' />
  }

  return (
    <>
      <Typography className='mt-4' variant='h4'>Delivered Packages</Typography>
      <Divider className='my-8' />
      
      <Card>
        <CardHeader title='Date Range Filter' />
        <div className='p-5'>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Grid container spacing={4}>
              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label='Start Date'
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'small'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label='End Date'
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'small'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant='contained'
                  onClick={fetchDeliveredPackages}
                  disabled={isLoading}
                  fullWidth
                  startIcon={<i className='ri-refresh-line' />}
                >
                  {isLoading ? 'Loading...' : 'Apply Filter'}
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant='outlined'
                  onClick={() => {
                    setStartDate(dayjs().subtract(7, 'days'))
                    setEndDate(dayjs())
                  }}
                  fullWidth
                  startIcon={<i className='ri-restart-line' />}
                >
                  Reset to Last 7 Days
                </Button>
              </Grid>
            </Grid>
          </LocalizationProvider>
        </div>
        <Divider />
        
        <div className='flex justify-between flex-col items-start sm:flex-row sm:items-center gap-y-4 p-5'>
          <div className='flex items-center gap-4'>
            <DebouncedInput
              value={globalFilter ?? ''}
              onChange={value => setGlobalFilter(String(value))}
              placeholder='Search Tracking Number or Recipient'
              className='max-sm:is-full'
            />
            <Chip 
              label={`${filteredData.length} Packages Delivered`} 
              color='success' 
              variant='tonal'
            />
          </div>
          <div className='flex items-center max-sm:flex-col gap-4 max-sm:is-full is-auto'>
            <OpenDialogOnElementClick 
              element={Button} 
              elementProps={buttonProps} 
              dialog={InventoryExportDialog} 
              dialogProps={{
                tableData: globalFilter ? globalFilteredData : filteredData 
              }} 
            />
          </div>
        </div>
        
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
                    {isLoading ? <LoaderDark /> : 'No delivered packages found for the selected date range'}
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
                      <tr key={row.id}>
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
          rowsPerPageOptions={[10, 25, 50, 100]}
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
    </>
  )
}

export default DeliveredPackagesTable
