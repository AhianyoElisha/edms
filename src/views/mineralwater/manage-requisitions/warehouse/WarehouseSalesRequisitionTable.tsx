'use client'

// React Imports
import { useEffect, useMemo, useState } from 'react'

// Next Imports
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { TextFieldProps } from '@mui/material/TextField'
import { format } from 'date-fns'


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
import type { CategoryType, InventoryListType } from '@/types/apps/ecommerceTypes'
import type { ThemeColor } from '@core/types'

// Component Imports
import OptionMenu from '@core/components/option-menu'

// Style Imports
import tableStyles from '@core/styles/table.module.css'
import { Divider } from '@mui/material'

declare module '@tanstack/table-core' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface FilterMeta {
    itemRank: RankingInfo
  }
}

type ProductCategoryType = {
  [key: string]: {
    icon: string
    color: ThemeColor
  }
}

// Vars
const productCategoryObj: ProductCategoryType = {
  Labels: { icon: 'ri-bookmark-line', color: 'error' },
  Tags: { icon: 'ri-price-tag-3-line', color: 'error' },
  'Shrink Caps': { icon: 'ri-home-6-line', color: 'info' },
  'Sachet Water Rolls': { icon: 'ri-file-paper-2-line', color: 'primary' },
  'Heat Shrink Caps': { icon: 'ri-capsule-line', color: 'success' },
  Stamps: { icon: 'ri-bank-card-line', color: 'warning' },
  'Bottles': { icon: 'ri-ink-bottle-line', color: 'secondary' }
}

type ReviewWithActionsType = InventoryListType & {
  actions?: string
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

type CategoryWithActionsType = CategoryType & {
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
const columnHelper = createColumnHelper<CategoryWithActionsType>()

const ProductionWarehouseRequisitionTable = ({ categoryData }: { categoryData?: CategoryType[] }) => {
  // States
  const [status, setStatus] = useState<InventoryListType['status']>('All')
  const [rowSelection, setRowSelection] = useState({})
  const [allData, setAllData] = useState(...[categoryData])
  const [data, setData] = useState(allData)
  const [globalFilter, setGlobalFilter] = useState('')

  // Hooks
  const  router  = useRouter()

  const columns = useMemo<ColumnDef<CategoryWithActionsType, any>[]>(
    () => [
      columnHelper.accessor('categoryTitle', {
        header: 'Categories of Available Products',
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            {/* @ts-ignore */}
            <img src={JSON.parse(row.original.images)?.[0]?.fileUrl} alt="image" width={38} height={38} className='rounded-md bg-actionHover' />
            <div className='flex flex-col items-start'>
              <Typography className='font-medium' color='text.primary'>
                {row.original.categoryTitle}
              </Typography>
              <Typography variant='body2'>{row.original.description}</Typography>
            </div>
          </div>
        )
      }),
      columnHelper.accessor('stockLimit', {
        header: 'Stock Limit',
        cell: ({ row }) => (
          <Typography>
            {row.original.stockLimit}
          </Typography>
        )
      }),
      columnHelper.accessor('requisitionRequest', {
        header: 'Pending Requisition',
        cell: ({ row }) => (
          <Typography>
            {row.original.requisitionRequest}
          </Typography>
        )
      }),
      columnHelper.accessor('totalProducts', {
        header: 'Total Products',
        cell: ({ row }) => <Typography>{row.original.totalProducts}</Typography>
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            <Chip
              label={row.original.status!.toString().charAt(0).toUpperCase() + row.original.status!.toString().slice(1)}
              variant='tonal'
              color={row.original.status === 'available' ? 'info' : 'error'}
              size='small'
            />
            {
              row.original.requisitionRequest! > 0 && (
            <Chip
              label={'Pending Requisition'}
              variant='tonal'
              color='warning'
              size='small'
            />
              )
            }
          </div>
        )
      }),
      columnHelper.accessor('actions', {
        header: 'Actions',
        cell: ({ row }) => (
          <OptionMenu
            iconButtonProps={{ size: 'medium' }}
            iconClassName='text-textSecondary text-[22px]'
            options={[
              {
                text: 'View',
                icon: 'ri-eye-line',
                linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' },
                menuItemProps: { onClick: () => router.push(`/production/warehouse-requisitions/${row.original.$id}`) }
              },
              // {
              //   text: 'Delete',
              //   icon: 'ri-delete-bin-7-line',
              //   menuItemProps: {
              //     onClick: () => setAllData(allData?.filter(review => review.$id !== row.original.$id)),
              //     className: 'flex items-center pli-4'
              //   }
              // }
            ]}
          />
        ),
        enableSorting: false
      })
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data]
  )

  const table = useReactTable({
    data: data as CategoryType[],
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

  useEffect(() => {
    const filteredData = allData?.filter(review => {
      // if (status !== 'All' && review.status !== status) return false

      return true
    })

    setData(filteredData)
  }, [status, allData, setData])

  return (
    <>
      <Typography className='mt-4' variant='h5'>Inventory Requisition From Stores</Typography>
      <Divider className='my-8' />
      <Card>
        <div className='flex justify-between flex-col items-start flex-wrap sm:flex-row sm:items-center gap-4 p-5'>
          <DebouncedInput
            value={globalFilter ?? ''}
            onChange={value => setGlobalFilter(String(value))}
            placeholder='Search Category'
            className='max-sm:is-full'
          />
          <div className='flex flex-col sm:flex-row items-center gap-4 max-sm:is-full'>
            <FormControl fullWidth size='small' className='sm:is-[140px] flex-auto is-full'>
              <Select
                fullWidth
                id='select-status'
                value={status}
                onChange={e => setStatus(e.target.value)}
                labelId='status-select'
              >
                <MenuItem value='All'>All</MenuItem>
                <MenuItem value='available'>Available</MenuItem>
                <MenuItem value='Pending'>Pending</MenuItem>
              </Select>
            </FormControl>
            <Button variant='contained' className='max-sm:is-full' startIcon={<i className='ri-upload-2-line' />}>
              Export
            </Button>
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
                    No data available
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
    </>
  )
}

export default ProductionWarehouseRequisitionTable
