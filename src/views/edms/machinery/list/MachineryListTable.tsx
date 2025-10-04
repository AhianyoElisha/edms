'use client'

// React Imports
import { useCallback, useEffect, useMemo, useState } from 'react'

// Next Imports
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Button, { ButtonProps } from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Checkbox from '@mui/material/Checkbox'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
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
import { format } from 'date-fns'

// Type Imports
import type { ThemeColor } from '@core/types'
import type { CategoryType, InventoryListType, MachineryCategoryType, MachineryListType } from '@/types/apps/ecommerceTypes'

// Component Imports
import TableFilters from './TableFilters'
import OptionMenu from '@core/components/option-menu'

// Util Imports

// Style Imports
import tableStyles from '@core/styles/table.module.css'
import OpenDialogOnElementClick from '@/components/dialogs/OpenDialogOnElementClick'
import InventoryExportDialog from '@/components/dialogs/stores-dialog'
import { toast } from 'react-toastify'
import LoaderDark from '@/components/layout/shared/LoaderDark'
import { bulkDeleteMachineryItems, deleteMachineryItem, getMachineryCategoryList, getMachineryList } from '@/libs/actions/machinery.actions'

declare module '@tanstack/table-core' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface FilterMeta {
    itemRank: RankingInfo
  }
}

type ProductWithActionsType = MachineryListType & {
  actions?: string
}

type ProductCategoryType = {
  [key: string]: {
    icon: string
    color: ThemeColor
  }
}

type productStatusType = {
  [key: string]: {
    title: string
    color: ThemeColor
  }
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


const productStatusObj: productStatusType = {
  paid: { title: 'Paid', color: 'success' },
  credit: { title: 'On Credit', color: 'error' },
  partial: { title: 'Partial Payment', color: 'warning' },
  postdated: { title: 'Post Dated Cheque', color: 'info' }
}

// Column Definitions
const columnHelper = createColumnHelper<ProductWithActionsType>()

const MachineryListTable = () => {
  // States
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState<MachineryListType[]>([])
  const [filteredData, setFilteredData] = useState(data)
  const [globalFilter, setGlobalFilter] = useState<MachineryListType['productBrand']>('')
  const [globalFilteredData, setGlobalFilteredData] = useState<MachineryListType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [categoryData, setCategoryData] = useState<MachineryCategoryType[]>([])
  
  // Hooks
  const { lang: locale } = useParams()
  const router = useRouter()
  
  // Check if any rows are selected
  const hasSelected = Object.keys(rowSelection).length > 0
  
  const fetchMachineryData = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await getMachineryList()
      setData(response?.rows as unknown as MachineryListType[])
      const category = await getMachineryCategoryList(false, true)
      setCategoryData(category?.machineryList?.documents as unknown as MachineryCategoryType[])
    } catch (error) {
      console.error('Error fetching machinery data:', error)
      toast.error('Failed to fetch machinery data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMachineryData()
  }, [fetchMachineryData])

  // Function to handle single item deletion
  const handleDeleteItem = async () => {
    if (!itemToDelete) return
    
    setIsDeleting(true)
    try {
      await deleteMachineryItem(itemToDelete)
      setData(prevData => prevData.filter(item => item.$id !== itemToDelete))
      toast.success('Machinery item deleted successfully')
    } catch (error) {
      console.error('Error deleting machinery item:', error)
      toast.error('Failed to delete machinery item')
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setItemToDelete(null)
    }
  }

  // Function to handle bulk deletion
  const handleBulkDelete = async () => {
    const selectedIds = Object.keys(rowSelection).map(
      index => data[parseInt(index)].$id
    )
    
    if (selectedIds.length === 0) return
    
    setIsDeleting(true)
    try {
      const result = await bulkDeleteMachineryItems(selectedIds)
      console.log(result)
      
      if (result) {
        // setData(prevData => prevData.filter(item => !result.success.includes(item.$id)))
        toast.success(`Successfully deleted ${result.success.length} machinery items`)
        await fetchMachineryData()
      }
      
      // Clear selection after bulk delete
      setRowSelection({})
    } catch (error) {
      console.error('Error performing bulk delete:', error)
      toast.error('Failed to perform bulk delete operation')
    } finally {
      setIsDeleting(false)
      setBulkDeleteDialogOpen(false)
    }
  }

  const columns = useMemo<ColumnDef<ProductWithActionsType, any>[]>(
  
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            indeterminate={table.getIsSomeRowsSelected()}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            disabled={isDeleting}
          />
        ),
        enableSorting: false
      },
      columnHelper.accessor('productBrand', {
        header: 'Machinery Company',
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            <img src={JSON.parse(row.original.images)[0].fileUrl} alt="" width={38} height={38} className='rounded-md bg-actionHover' />
            <div className='flex flex-col'>
              <Typography className='font-medium' color='text.primary'>
                {row.original.productBrand}
              </Typography>
              <Typography variant='body2'>{row.original.productBrand}</Typography>
            </div>
          </div>
        )
      }),
      columnHelper.accessor('category', {
        header: 'Category',
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            {/* @ts-ignore */}
            <Typography color='text.primary'>{row.original.category?.categoryTitle}</Typography>
          </div>
        )
      }),
      columnHelper.accessor('$createdAt', {
        header: 'Created Date',
        cell: ({ row }) => {
          const dateString = row.original.$createdAt;
          let formattedDate;

          try {
            // Attempt to parse the date string
            const date = new Date(dateString);

            // Check if the date is valid
            if (isNaN(date.getTime())) {
              throw new Error('Invalid date');
            }

            // Format the date
            formattedDate = format(date, 'MMM dd, yyyy'); // e.g., "Sep 23, 2024"
          } catch (error) {
            console.error('Error parsing date:', error);
            formattedDate = 'Invalid Date';
          }

          return <Typography>{formattedDate}</Typography>;
        }
      }),
      columnHelper.accessor('purchaseDate', {
        header: 'Purchase Date',
        cell: ({ row }) => {
          const dateString = row.original.purchaseDate;
          let formattedDate;

          try {
            // Attempt to parse the date string
            const date = new Date(dateString);

            // Check if the date is valid
            if (isNaN(date.getTime())) {
              throw new Error('Invalid date');
            }

            // Format the date
            formattedDate = format(date, 'MMM dd, yyyy'); // e.g., "Sep 23, 2024"
          } catch (error) {
            console.error('Error parsing date:', error);
            formattedDate = 'Invalid Date';
          }

          return <Typography>{formattedDate}</Typography>;
        }
      }),
      columnHelper.accessor('totalPrice', {
        header: 'Total Price',
        cell: ({ row }) => {
          const formattedPrice = new Intl.NumberFormat('en-GH', {
            style: 'currency',
            currency: 'GHS',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(row.original.totalPrice)
          
          return <Typography>{formattedPrice}</Typography>
        }
      }),
      columnHelper.accessor('packageQuantity', {
        header: 'QTY(Boxes)',
        cell: ({ row }) => <Typography>{row.original.packageQuantity}</Typography>
      }),
      columnHelper.accessor('paymentStatus', {
        header: 'Status',
        cell: ({ row }) => (
          <Chip
            label={productStatusObj[row.original.paymentStatus].title}
            variant='tonal'
            color={productStatusObj[row.original.paymentStatus].color}
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
                  text: 'Details', 
                  icon: 'ri-stack-line',
                  menuItemProps: { onClick: () => router.push(`/machinery/${row.original.$id}`) }
                },
                {
                  text: 'Delete',
                  icon: 'ri-delete-bin-7-line',
                  menuItemProps: { 
                    onClick: () => {
                      setItemToDelete(row.original.$id)
                      setDeleteDialogOpen(true)
                    }
                  }
                },
              ]}
            />
          </div>
        ),
        enableSorting: false
      })
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, filteredData, router, isDeleting]
  )

  const table = useReactTable({
    data: filteredData as MachineryListType[],
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

  // Add an effect to update globalFilteredData when the table's filtered data changes
  useEffect(() => {
    setGlobalFilteredData(table.getFilteredRowModel().rows.map(row => row.original))
  }, [table.getFilteredRowModel().rows])

  // Vars
  const buttonProps: ButtonProps = {
    variant: 'outlined',
    children: 'Export',
    className: 'max-sm:is-full is-auto',
    color: 'secondary',
    startIcon: <i className='ri-upload-2-line' />
  }

  // Get selected rows for bulk actions
  const selectedRows = Object.keys(rowSelection).length


  return (
    <>
      <Typography className='mt-4' variant='h4'>Machinery Report List</Typography>
      <Divider className='my-8' />
      <Card>
        <CardHeader title='Filters' />
        <TableFilters setData={setFilteredData} productData={data} categoryData={categoryData as unknown as MachineryCategoryType[]} />
        <Divider />
        <div className='flex justify-between flex-col items-start sm:flex-row sm:items-center gap-y-4 p-5'>
          <div className='flex items-center gap-4'>
            <DebouncedInput
              value={globalFilter ?? ''}
              onChange={value => setGlobalFilter(String(value))}
              placeholder='Search Product Company'
              className='max-sm:is-full'
            />
            {hasSelected && (
              <Button
                variant='outlined'
                color='error'
                startIcon={<i className='ri-delete-bin-7-line' />}
                onClick={() => setBulkDeleteDialogOpen(true)}
                disabled={isDeleting}
              >
                Delete Selected ({selectedRows})
              </Button>
            )}
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
            <Button
              variant='contained'
              component={Link}
              href={'/machinery/add'}
              startIcon={<i className='ri-add-line' />}
              className='max-sm:is-full is-auto'
            >
              Add Machinery Item
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

      {/* Confirmation Dialog for Single Item Deletion */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this machinery item? This action will also update the category's total product count.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button onClick={handleDeleteItem} color="error" disabled={isDeleting} autoFocus>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for Bulk Deletion */}
      <Dialog
        open={bulkDeleteDialogOpen}
        onClose={() => setBulkDeleteDialogOpen(false)}
        aria-labelledby="bulk-delete-dialog-title"
        aria-describedby="bulk-delete-dialog-description"
      >
        <DialogTitle id="bulk-delete-dialog-title">Confirm Bulk Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText id="bulk-delete-dialog-description">
            Are you sure you want to delete {selectedRows} selected machinery items? This action will also update the respective categories' total product counts.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteDialogOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button onClick={handleBulkDelete} color="error" disabled={isDeleting} autoFocus>
            {isDeleting ? 'Deleting...' : 'Delete Selected'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default MachineryListTable