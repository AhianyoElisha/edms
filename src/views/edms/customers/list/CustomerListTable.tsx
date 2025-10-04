'use client'

// React Imports
import { useState, useEffect, useMemo, useCallback } from 'react'

// Next Imports
import Link from 'next/link'
import { useParams } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Checkbox from '@mui/material/Checkbox'
import TextField from '@mui/material/TextField'
import TablePagination from '@mui/material/TablePagination'
import type { TextFieldProps } from '@mui/material/TextField'

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

// Type Imports
import type { ThemeColor } from '@core/types'
import type { Customer } from '@/types/apps/ecommerceTypes'
import { useRouter } from 'next/navigation'
// Component Imports
import AddCustomerDrawer from './AddCustomerDrawer'
import CustomAvatar from '@core/components/mui/Avatar'

// Util Imports
import { getInitials } from '@/utils/getInitials'

// Style Imports
import tableStyles from '@core/styles/table.module.css'
import OptionMenu from '@/@core/components/option-menu'
import { getCustomerList } from '@/libs/actions/customer.action'
import { toast } from 'react-toastify'
import { Chip, Divider } from '@mui/material'
import LoaderDark from '@/components/layout/shared/LoaderDark'
import EditCustomerDrawer from './EditCustomerDrawer'

declare module '@tanstack/table-core' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface FilterMeta {
    itemRank: RankingInfo
  }
}

type PayementStatusType = {
  text: string
  color: ThemeColor
}

type StatusChipColorType = {
  color: ThemeColor
}

export const paymentStatus: { [key: number]: PayementStatusType } = {
  1: { text: 'Paid', color: 'success' },
  2: { text: 'Pending', color: 'warning' },
  3: { text: 'Cancelled', color: 'secondary' },
  4: { text: 'Failed', color: 'error' }
}

export const statusChipColor: { [key: string]: StatusChipColorType } = {
  Delivered: { color: 'success' },
  'Out for Delivery': { color: 'primary' },
  'Ready to Pickup': { color: 'info' },
  Dispatched: { color: 'warning' }
}

type ECommerceOrderTypeWithAction = Customer & {
  actions?: string
  paymentStatus: PayementStatusType
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
const columnHelper = createColumnHelper<ECommerceOrderTypeWithAction>()

const CustomerListTable = () => {
  // States
  const [customerUserOpen, setCustomerUserOpen] = useState(false)
  const [editCustomerOpen, setEditCustomerOpen] = useState<{ open: boolean; data: Customer | null }>({ open: false, data: null })
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState<Customer[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()

  // Hooks
  const { lang: locale } = useParams()


  const fetchCustomerData = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await getCustomerList()
      setData(response?.rows as unknown as Customer[])
    } catch (error) {
      console.error('Error fetching customer  data:', error)
      toast.error('Failed to fetch customer data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCustomerData()
  }, [fetchCustomerData])


  const columns = useMemo<ColumnDef<ECommerceOrderTypeWithAction, any>[]>(
    () => [
      columnHelper.accessor('customer', {
        header: 'Customers',
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            {getAvatar({ avatar: '', customer: '' })}
            <div className='flex flex-col items-start'>
              <Link href={`/customers/${row.original.$id}`}>
                <Typography
                  color='text.primary'
                  className='font-medium hover:text-primary'
                >
                  {row.original.customer}
                </Typography>
              </Link>
              <Typography variant='body2'>{row.original.email}</Typography>
            </div>
          </div>
        )
      }),
      columnHelper.accessor('country', {
        header: 'Country',
        cell: ({ row }) => (
          <div className='flex items-center gap-2'>
            <Typography>{row.original.country}</Typography>
          </div>
        )
      }),

      columnHelper.accessor('city', {
        header: 'City',
        cell: ({ row }) => (
          <div className='flex items-center gap-2'>
            <Typography>{row.original.city}</Typography>
          </div>
        )
      }),
      
      columnHelper.accessor('town', {
        header: 'Town',
        cell: ({ row }) => (
          <div className='flex items-center gap-2'>
            <Typography>{row.original.town}</Typography>
          </div>
        )
      }),
      
      columnHelper.accessor('orders', {
        header: 'Orders',
        cell: ({ row }) => <Typography>{row.original.orders?.length}</Typography>
      }),
      columnHelper.accessor('totalSpent', {
        header: 'Total (GH₵)',
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            <Typography className='font-medium' color='text.primary'>
              GH₵{row.original.totalSpent?.toLocaleString() ?? 0.00}
            </Typography>
            {row.original.debt! > 0 && (
            <Chip
              label={`Debt: GH₵ ${row.original.debt}`}
              color={'error'}
              variant='tonal'
              size='small'
            />
            )}
          </div>
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
                { text: 'Details', 
                  icon: 'ri-stack-line',
                  menuItemProps: { onClick: () => router.push(`/customers/${row.original.$id}`) }
                },
                {
                  text: 'Edit',
                  icon: 'ri-edit-box-line',
                  linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' },
                  menuItemProps: { onClick: () => setEditCustomerOpen({ open: true, data: row.original })}
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
    data: data as Customer[],
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
    enableRowSelection: true, //enable row selection for all rows
    // enableRowSelection: row => row.original.age > 18, // or enable row selection conditionally per row
    globalFilterFn: fuzzyFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues()
  })

  const getAvatar = (params: Pick<Customer, 'avatar' | 'customer'>) => {
    const { avatar, customer } = params

    if (avatar) {
      return <CustomAvatar 
        src={avatar} 
        skin='light' 
        size={34} 
        sx={{
          '& .MuiAvatar-img': {
            objectFit: 'contain'
          }
        }}
      />
    } else {
      return (
        <CustomAvatar skin='light' size={34}>
          {getInitials(customer as string)}
        </CustomAvatar>
      )
    }
  }

  return (
    <>
      <Typography className='mt-4' variant='h4'>Customers List</Typography>
      <Divider className='my-8' />
      <Card>
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
              onClick={() => setCustomerUserOpen(!customerUserOpen)}
            >
              Add Customer
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
          rowsPerPageOptions={[10, 25, 50, 100]}
          component='div'
          className='border-bs'
          count={table.getFilteredRowModel().rows.length}
          rowsPerPage={table.getState().pagination.pageSize}
          page={table.getState().pagination.pageIndex}
          SelectProps={{
            inputProps: { 'aria-label': 'rows per page' }
          }}
          onPageChange={(_, page) => {
            table.setPageIndex(page)
          }}
          onRowsPerPageChange={e => table.setPageSize(Number(e.target.value))}
        />
      </Card>
      <AddCustomerDrawer
        open={customerUserOpen}
        handleClose={() => setCustomerUserOpen(!customerUserOpen)}
        customerData={data}
        onSuccess={fetchCustomerData}
      />
      <EditCustomerDrawer
        open={editCustomerOpen.open}
        handleClose={() => setEditCustomerOpen({ open: false, data: null })}
        customerData={editCustomerOpen.data!}
        onSuccess={fetchCustomerData}
      />
    </>
  )
}

export default CustomerListTable
