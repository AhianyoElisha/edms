'use client'

// React Imports
import { useState, useMemo } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'

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

// Component Imports
import Link from '@components/Link'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

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

type DistributedProductType = {
  $id: string
  category: {
    title: string
    pricePerBox: number
  }
  totalProducts: number
  totalPrice: number
  status: string
}

// Column Definitions
const columnHelper = createColumnHelper<DistributedProductType>()

const DistributedProductsTable = ({ distributedProducts }: { distributedProducts: DistributedProductType[] }) => {
  // States
  const [rowSelection, setRowSelection] = useState({})
  const [globalFilter, setGlobalFilter] = useState('')

  const columns = useMemo<ColumnDef<DistributedProductType, any>[]>(
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
      columnHelper.accessor('category', {
        header: 'Product Category',
        cell: ({ row }) => (
          <div className='flex flex-col items-start'>
            <Typography color='text.primary' className='font-medium'>
              {row.original.category?.title || 'Unknown Category'}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Price per box: ₵{row.original.category?.pricePerBox || 0}
            </Typography>
          </div>
        )
      }),
      columnHelper.accessor('totalProducts', {
        header: 'Quantity',
        cell: ({ row }) => <Typography>{`${row.original.totalProducts} boxes`}</Typography>
      }),
      columnHelper.accessor('totalPrice', {
        header: 'Total Value',
        cell: ({ row }) => <Typography className='font-medium'>₵{row.original.totalPrice.toFixed(2)}</Typography>
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: ({ row }) => (
          <Chip
            variant='tonal'
            label={row.original.status}
            size='small'
            color={row.original.status === 'available' ? 'success' : 'error'}
          />
        )
      })
    ],
    []
  )

  const table = useReactTable({
    data: distributedProducts,
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

  return (
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
        {table.getFilteredRowModel().rows.length === 0 ? (
          <tbody>
            <tr>
              <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                No distributed products found
              </td>
            </tr>
          </tbody>
        ) : (
          <tbody className='border-be'>
            {table
              .getRowModel()
              .rows.slice(0, table.getState().pagination.pageSize)
              .map(row => {
                return (
                  <tr key={row.id} className={classnames({ selected: row.getIsSelected() })}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className='first:is-14'>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                )
              })}
          </tbody>
        )}
      </table>
    </div>
  )
}

const DistributedProductsCard = ({ vehicleData }: { vehicleData?: any }) => {
  const distributedProducts = vehicleData?.distributedproducts || []

  const totalValue = distributedProducts.reduce((sum: number, product: any) => sum + (product.totalPrice || 0), 0)
  const totalQuantity = distributedProducts.reduce((sum: number, product: any) => sum + (product.totalProducts || 0), 0)

  return (
    <Card>
      <CardHeader
        title='Distributed Products'
        action={
          <Typography component={Link} color='primary.main' className='font-medium'>
            Manage
          </Typography>
        }
      />
      <DistributedProductsTable distributedProducts={distributedProducts} />
      <CardContent className='flex justify-end'>
        <div>
          <div className='flex items-center gap-12'>
            <Typography color='text.primary' className='min-is-[120px]'>
              Total Quantity:
            </Typography>
            <Typography color='text.primary' className='font-medium'>
              {totalQuantity} boxes
            </Typography>
          </div>
          <div className='flex items-center gap-12'>
            <Typography color='text.primary' className='font-medium min-is-[120px]'>
              Total Value:
            </Typography>
            <Typography color='text.primary' className='font-medium'>
              ₵{totalValue.toFixed(2)}
            </Typography>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default DistributedProductsCard

