'use client'

/**
 * DeliveredPackagesTable - Now shows delivered manifests with package counts
 * Each manifest tracks: packageSize, packageCount, and deliveredCount
 */

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
import type { ManifestType } from '@/types/apps/deliveryTypes'

// Component Imports
import OptionMenu from '@core/components/option-menu'
import LoaderDark from '@/components/layout/shared/LoaderDark'
import OpenDialogOnElementClick from '@/components/dialogs/OpenDialogOnElementClick'
import InventoryExportDialog from '@/components/dialogs/stores-dialog'

// Action Imports
import { getDeliveredManifests } from '@/libs/actions/manifest.actions'

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

type ManifestWithActionsType = ManifestType & {
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
  small: { label: 'Small', color: 'success' },
  medium: { label: 'Medium', color: 'warning' },
  big: { label: 'Big', color: 'error' }
}

// Column Definitions
const columnHelper = createColumnHelper<ManifestWithActionsType>()

const DeliveredPackagesTable = () => {
  // States
  const [data, setData] = useState<ManifestType[]>([])
  const [filteredData, setFilteredData] = useState(data)
  const [globalFilter, setGlobalFilter] = useState('')
  const [globalFilteredData, setGlobalFilteredData] = useState<ManifestType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(7, 'days'))
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs())
  
  // Hooks
  const router = useRouter()
  
  // Fetch delivered manifests
  const fetchDeliveredManifests = useCallback(async () => {
    try {
      setIsLoading(true)
      
      const startDateISO = startDate ? startDate.startOf('day').toISOString() : undefined
      const endDateISO = endDate ? endDate.endOf('day').toISOString() : undefined
      
      const manifests = await getDeliveredManifests(startDateISO, endDateISO)
      
      setData(manifests)
      setFilteredData(manifests)
      
    } catch (error) {
      console.error('Error fetching delivered manifests:', error)
      toast.error('Failed to fetch delivered manifests')
    } finally {
      setIsLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchDeliveredManifests()
  }, [fetchDeliveredManifests])

  // Calculate total delivered packages
  const totalDeliveredPackages = useMemo(() => {
    return filteredData.reduce((sum, m) => sum + (m.deliveredCount || m.packageCount || 0), 0)
  }, [filteredData])

  const columns = useMemo<ColumnDef<ManifestWithActionsType, any>[]>(
    () => [
      columnHelper.accessor('manifestNumber', {
        header: 'Manifest Number',
        cell: ({ row }) => (
          <div className='flex flex-col'>
            <Typography className='font-medium' color='text.primary'>
              {row.original.manifestNumber}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {row.original.recipientName || 'Unknown recipient'}
            </Typography>
          </div>
        )
      }),
      columnHelper.accessor('recipientPhone', {
        header: 'Recipient Phone',
        cell: ({ row }) => (
          <Typography color='text.primary'>{row.original.recipientPhone || 'N/A'}</Typography>
        )
      }),
      columnHelper.accessor('packageSize', {
        header: 'Package Size',
        cell: ({ row }) => {
          const size = row.original.packageSize || 'unknown'
          return (
            <Chip
              label={packageSizeObj[size]?.label || size}
              variant='tonal'
              color={packageSizeObj[size]?.color || 'default'}
              size='small'
            />
          )
        }
      }),
      columnHelper.accessor('packageCount', {
        header: 'Package Count',
        cell: ({ row }) => (
          <Typography color='text.primary' className='font-medium'>
            {row.original.packageCount || 0}
          </Typography>
        )
      }),
      columnHelper.accessor('deliveredCount', {
        header: 'Delivered',
        cell: ({ row }) => {
          const delivered = row.original.deliveredCount || 0
          const total = row.original.packageCount || 0
          const isComplete = delivered >= total
          return (
            <Chip
              label={`${delivered}/${total}`}
              variant='tonal'
              color={isComplete ? 'success' : 'warning'}
              size='small'
            />
          )
        }
      }),
      columnHelper.accessor('deliveryTime', {
        header: 'Delivery Date',
        cell: ({ row }) => {
          const dateString = row.original.deliveryTime
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
      columnHelper.accessor('manifestDate', {
        header: 'Manifest Date',
        cell: ({ row }) => {
          const dateString = row.original.manifestDate
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
                  menuItemProps: { onClick: () => router.push(`/edms/manifests/${row.original.$id}`) }
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
    data: filteredData as ManifestType[],
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
                  onClick={fetchDeliveredManifests}
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
              placeholder='Search Manifest Number or Recipient'
              className='max-sm:is-full'
            />
            <Chip 
              label={`${filteredData.length} Manifests (${totalDeliveredPackages} Packages)`} 
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
                    {isLoading ? <LoaderDark /> : 'No delivered manifests found for the selected date range'}
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
