'use client'

// React Imports
import { useCallback, useEffect, useMemo, useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import Button, { ButtonProps } from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { TextFieldProps } from '@mui/material/TextField'
import { CategoryType } from '@/types/apps/ecommerceTypes'
import OpenDialogOnElementClick from '@/components/dialogs/OpenDialogOnElementClick'


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

// Component Imports
import AddCategoryDrawer from './AddCategoryDrawer'
import OptionMenu from '@core/components/option-menu'

// Style Imports
import tableStyles from '@core/styles/table.module.css'
import InventoryCategoryExportDialog from '@/components/dialogs/stores-dialog/category'
import EditCategoryDrawer from './EditCategoryDrawer'
import { Divider } from '@mui/material'
import { getInventoryCategoryList } from '@/libs/actions/stores.actions'
import { toast } from 'react-toastify'
import LoaderDark from '@/components/layout/shared/LoaderDark'

declare module '@tanstack/table-core' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface FilterMeta {
    itemRank: RankingInfo
  }
}



type CategoryWithActionsType = CategoryType & {
  actions?: string
}

type Props = {
  categoryData?: CategoryType[]
  onSuccessfulSubmit?: () => Promise<void>
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
const columnHelper = createColumnHelper<CategoryWithActionsType>()

const ProductCategoryTable = () => {
  // States
  const [addCategoryOpen, setAddCategoryOpen] = useState(false)
  const [editCategoryOpen, setEditCategoryOpen] = useState<{ open: boolean; data: CategoryType | null }>({ open: false, data: null })
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState<CategoryType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)



  const fetchInventoryData = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await getInventoryCategoryList(false, false)
      setData(response?.inventoryList?.documents as unknown as CategoryType[])
    } catch (error) {
      console.error('Error fetching inventory requisition data:', error)
      toast.error('Failed to fetch requisition data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInventoryData()
  }, [fetchInventoryData])


  const columns = useMemo<ColumnDef<CategoryWithActionsType, any>[]>(
    () => [
      columnHelper.accessor('categoryTitle', {
        header: 'Categories',
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
      columnHelper.accessor('usdRate', {
        header: 'USD$/GH₵ Rate',
        cell: ({ row }) => (
          <Typography>
            {row.original.usdRate}
          </Typography>
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
      // @ts-ignore
      columnHelper.accessor('qtyPerBox', {
        header: 'Qty/Package',
        cell: ({ row }) => (
          <Typography>
            {
              // @ts-ignore
              row.original.qtyPerBox
            }
          </Typography>
        )
      }),
      columnHelper.accessor('pricePerBox', {
        header: 'Price/Package',
        cell: ({ row }) => (
          <Typography>
            {
              // @ts-ignore
              row.original.pricePerBox
            }
          </Typography>
        )
      }),
      columnHelper.accessor('totalProducts', {
        header: 'Total Products',
        cell: ({ row }) => <Typography>{row.original.totalProducts}</Typography>
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
                  menuItemProps: { onClick: () => setEditCategoryOpen({ open: true, data: row.original })}
                },
              ]}
            />
          </div>
        ),
        enableSorting: false
      })
    ],
    []
  )

  const table = useReactTable({
    data,
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

  // Vars
  const buttonProps: ButtonProps = {
    variant: 'outlined',
    children: 'Export',
    className: 'max-sm:is-full is-auto',
    color: 'secondary',
    startIcon: <i className='ri-upload-2-line' />
  }

  return (
    <>
      <Typography className='mt-4' variant='h4'>Inventory Categories</Typography>
      <Divider className='my-8' />
      <Card>
        <div className='flex items-start justify-between max-sm:flex-col sm:items-center gap-y-4 p-5'>
          <DebouncedInput
            value={globalFilter ?? ''}
            onChange={value => setGlobalFilter(String(value))}
            placeholder='Search Categories'
            className='max-sm:is-full'
          />
          <div className='flex items-center max-sm:flex-col gap-4 max-sm:is-full'>
            <OpenDialogOnElementClick 
              element={Button} 
              elementProps={buttonProps} 
              dialog={InventoryCategoryExportDialog} 
              dialogProps={{ tableData: data }} 
            />
            <Button
              variant='contained'
              className='max-sm:is-full is-auto'
              onClick={() => setAddCategoryOpen(true)}
              startIcon={<i className='ri-add-line' />}
            >
              Add Category
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
          rowsPerPageOptions={[10, 15, 25]}
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
      <AddCategoryDrawer
        open={addCategoryOpen}
        setData={setData}
        handleClose={() => setAddCategoryOpen(!addCategoryOpen)}
        onSuccess={fetchInventoryData}
      />
      <EditCategoryDrawer
        open={editCategoryOpen.open}
        categoryData={editCategoryOpen.data!}
        handleClose={() => setEditCategoryOpen({ open: false, data: null })}
        onSuccess={fetchInventoryData}
      />
    </>
  )
}

export default ProductCategoryTable
