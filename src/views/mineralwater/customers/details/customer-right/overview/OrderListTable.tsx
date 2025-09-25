'use client'

// React Imports
import { useState, useEffect, useMemo, useCallback } from 'react'

// Next Imports
import Link from 'next/link'
import { useParams } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import TablePagination from '@mui/material/TablePagination'
import Alert from '@mui/material/Alert'
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
import type { TransactionItemDetailType } from '@/types/apps/ecommerceTypes'

// Component Imports
import OptionMenu from '@core/components/option-menu'
import CustomerPaymentDialog from '@components/dialogs/customer-payment-dialog'

// Util Imports
import { formatDate, formatTime } from '@/utils/dateAndCurrency'
import LoaderDark from '@/components/layout/shared/LoaderDark'

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

type PaymentStatusType = {
  text: string
  color: ThemeColor
}

export const paymentStatus: { [key: string]: PaymentStatusType } = {
  'paid': { text: 'Paid', color: 'success' },
  'partial': { text: 'Partial Payment', color: 'warning' },
  'postdated': { text: 'Post Dated Cheque', color: 'secondary' },
  'credit': { text: 'Credit', color: 'error' }
}

type CustomerOrderTypeWithAction = TransactionItemDetailType & {
  action?: string
  outstandingBalance?: number
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

  // Keep local state in sync when external value changes
  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  // Debounce calls to onChange
  useEffect(() => {
    const handler = setTimeout(() => {
      onChange(value)
    }, debounce)

    return () => clearTimeout(handler)
  }, [value, debounce, onChange])

  return (
    <TextField
      {...props}
      value={value}
      onChange={e => setValue(e.target.value)}
      size={props.size || 'small'}
    />
  )
}



// Column Definitions
const columnHelper = createColumnHelper<CustomerOrderTypeWithAction>()

const OrderListTable = ({ orderData, isLoading, onUpdate }: { 
  orderData?: TransactionItemDetailType[], 
  isLoading?: boolean,
  onUpdate?: () => void 
}) => {
  // States
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState<TransactionItemDetailType[]>(orderData || [])
  const [globalFilter, setGlobalFilter] = useState<TransactionItemDetailType['$id']>('')
  const [globalFilteredData, setGlobalFilteredData] = useState<TransactionItemDetailType[]>([])
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<TransactionItemDetailType | null>(null)

  // Hooks
  const { lang: locale } = useParams()

  // Sync local data state with orderData prop
  useEffect(() => {
    setData(orderData || [])
  }, [orderData])

  const handleProcessPayment = (order: TransactionItemDetailType) => {
    setSelectedOrder(order)
    setPaymentDialogOpen(true)
  }


  const columns = useMemo<ColumnDef<CustomerOrderTypeWithAction, any>[]>(
    () => [
      columnHelper.accessor('$id', {
        header: 'order',
        cell: ({ row }) => (
          <Typography
            component={Link}
            href={`/sales/${row.original.$id}`}
            color='primary'
          >{`#${row.original.$id!.slice(0, 8)}`}</Typography>
        )
      }),
      columnHelper.accessor('$createdAt', {
        header: 'Created Date',
        cell: ({ row }) => {
          const dateString = row.original?.$createdAt!;
          let formattedDate;

          try {
            // Attempt to parse the date string
            const date = new Date(dateString);

            // Check if the date is valid
            if (isNaN(date.getTime())) {
              throw new Error('Invalid date');
            }

            // Format the date
            formattedDate = `${formatDate(date.toISOString())}, ${formatTime(date.toISOString())}`; // e.g., "Sep 23, 2024"
          } catch (error) {
            console.error('Error parsing date:', error);
            formattedDate = 'Invalid Date';
          }

          return <Typography>{formattedDate}</Typography>;
        }
      }),
      columnHelper.accessor('paymentStatus', {
        header: 'Status',
        cell: ({ row }) => (
          <Chip
            label={row.original.paymentStatus}
            color={paymentStatus[row.original.paymentStatus]?.color}
            variant='tonal'
            size='small'
          />
        )
      }),
      columnHelper.accessor('totalPrice', {
        header: 'Total Price',
        cell: ({ row }) => <Typography>GH₵{row.original?.totalPrice}</Typography>
      }),
      // Add Outstanding Balance column
      columnHelper.accessor('outstandingBalance', {
        header: 'Outstanding',
        cell: ({ row }) => {
          const totalPayments = (row.original.cash || 0) + (row.original.bank || 0) + 
                              (row.original.momo || 0) + (row.original.cheque || 0);
          const outstanding = (row.original.totalPrice || 0) - totalPayments;
          
          return (
            <Typography color={outstanding > 0 ? 'error.main' : 'success.main'}>
              GH₵{Math.max(0, outstanding).toFixed(2)}
            </Typography>
          );
        }
      }),
      // Add Actions column
      columnHelper.accessor('action', {
        header: 'Actions',
        cell: ({ row }) => {
          const totalPayments = (row.original.cash || 0) + (row.original.bank || 0) + 
                              (row.original.momo || 0) + (row.original.cheque || 0);
          const outstanding = (row.original.totalPrice || 0) - totalPayments;
          const canProcessPayment = outstanding > 0;

          return (
            <div className='flex items-center'>
              <OptionMenu
                iconButtonProps={{ size: 'medium' }}
                iconClassName='text-textSecondary text-[22px]'
                options={[
                  ...(canProcessPayment ? [{
                    text: 'Process Payment',
                    icon: 'ri-money-dollar-circle-line',
                    menuItemProps: { 
                      onClick: () => handleProcessPayment(row.original),
                      className: 'text-success-main'
                    }
                  }] : []),
                  
                ]}
              />
            </div>
          );
        },
        enableSorting: false
      })
    ],
    [data]
  )

  const table = useReactTable({
    data: data,
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
    getCoreRowModel: getCoreRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues()
  })

  // Add an effect to update globalFilteredData when the table's filtered data changes
  useEffect(() => {
    setGlobalFilteredData(table.getFilteredRowModel().rows.map(row => row.original))
  }, [table.getFilteredRowModel().rows])

  return (
    <>
      <Card>
        <CardContent className='flex justify-between flex-col items-start sm:flex-row sm:items-center gap-y-4'>
          <Typography variant='h5'>Orders Placed</Typography>
          <DebouncedInput
            value={globalFilter ?? ''}
            onChange={value => setGlobalFilter(String(value))}
            placeholder='Search Order'
            className='max-sm:is-full'
          />
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
            {table.getFilteredRowModel().rows.length !== 0 ? (
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
            ) : (
              <tbody>
                <tr>
                  <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                    {isLoading ? <LoaderDark /> : 'No data available'}
                  </td>
                </tr>
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

      {/* Payment Dialog */}
      {selectedOrder && (
        <CustomerPaymentDialog
          open={paymentDialogOpen}
          setOpen={setPaymentDialogOpen}
          orderData={selectedOrder as any}
          onUpdate={() => {
            if (onUpdate) {
              // Call the parent's update function to refresh customer data
              onUpdate();
            }
            // Also refresh the local data
            setData(prevData => 
              prevData.map(order => 
                order.$id === selectedOrder.$id 
                  ? { 
                      ...order, 
                      // Update with the new payment status and amounts
                      paymentStatus: 'processing' // This will be updated properly by the parent refresh
                    }
                  : order
              )
            );
            // Close the dialog
            setPaymentDialogOpen(false);
          }}
        />
      )}
    </>
  )
}

export default OrderListTable