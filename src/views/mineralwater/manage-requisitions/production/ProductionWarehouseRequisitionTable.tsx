'use client'

// React Imports
import { useCallback, useEffect, useMemo, useState } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
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
import { useAuth } from '@/contexts/AppwriteProvider'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import type { RankingInfo } from '@tanstack/match-sorter-utils'

// Type Imports
import type { CategoryType, InventoryListType, ProductionRequisition, StoreRequisition } from '@/types/apps/ecommerceTypes'
import type { ThemeColor } from '@core/types'

// Component Imports
import OptionMenu from '@core/components/option-menu'

// Style Imports
import tableStyles from '@core/styles/table.module.css'
import { Button, Checkbox, Chip, Divider } from '@mui/material'
import { formatDate, formatTime } from '@/utils/dateAndCurrency'
import { toast } from 'react-toastify'
import LoaderDark from '@/components/layout/shared/LoaderDark'
import { getProductionRequisitionList } from '@/libs/actions/production.actions'
import { approveProductionRequisition, denyProductionRequisition } from '@/libs/actions/warehouse.actions'

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

type ProductionCategoryWithActionsType = ProductionRequisition & {
  actions?: string
}



// Column Definitions
const columnHelper = createColumnHelper<ProductionCategoryWithActionsType>()

const ProductionWarehouseRequisitionTable = () => {
  // States
  const user = useAuth()
  const [rowSelection, setRowSelection] = useState({})
  const [allData, setAllData] = useState<ProductionRequisition[]>([])
  const [data, setData] = useState<ProductionRequisition[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const isAdmin = user?.user?.role?.name === 'admin'

  const fetchProductionData = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await getProductionRequisitionList()
      setAllData(response?.rows as unknown as ProductionRequisition[])
      setData(response?.rows as unknown as ProductionRequisition[])
    } catch (error) {
      console.error('Error fetching manufactured requisition data:', error)
      toast.error('Failed to fetch requisition data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProductionData()
  }, [fetchProductionData])

  const handleBulkAction = async (action: 'approve' | 'deny') => {
    try {
      setIsLoading(true)
      const selectedRows = Object.keys(rowSelection).map(index => data[parseInt(index)])
      
      for (const row of selectedRows) {
        if (action === 'approve') {
          await approveProductionRequisition(row.$id!, row.category.$id, user.user.$id)
        } else {
          await denyProductionRequisition(row.$id!, row.category.$id, user.user.$id)
        }
      }
      
      toast.success(`Successfully ${action}d ${selectedRows.length} requisitions`)
      setRowSelection({})
      await fetchProductionData()
    } catch (error) {
      console.error(`Error in bulk ${action}:`, error)
      toast.error(`Failed to ${action} requisitions`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequisitionAction = async (
    action: 'approve' | 'deny',
    requisitionId: string,
    categoryId: string
  ) => {
    try {
      setIsLoading(true)
      if (action === 'approve') {
        await approveProductionRequisition(requisitionId, categoryId, user.user.$id)
        toast.success('Requisition approved successfully')
      } else {
        await denyProductionRequisition(requisitionId, categoryId, user.user.$id)
        toast.success('Requisition rejected successfully')
      }
      await fetchProductionData()
    } catch (error) {
      console.error(`Error in ${action}:`, error)
      toast.error(`Failed to ${action} requisition`)
    } finally {
      setIsLoading(false)
    }
  }


  const columns = useMemo<ColumnDef<ProductionCategoryWithActionsType, any>[]>(() => {
    const baseColumns: ColumnDef<ProductionCategoryWithActionsType, any>[] = []

    // Only add checkbox column for admin users
    if (isAdmin) {
      baseColumns.push(
        columnHelper.display({
          id: 'select',
          header: ({ table }) => (
            <Checkbox
              checked={table.getIsAllRowsSelected()}
              indeterminate={table.getIsSomeRowsSelected()}
              onChange={table.getToggleAllRowsSelectedHandler()}
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              disabled={isLoading}
              onChange={row.getToggleSelectedHandler()}
            />
          ),
        })
      )
    }

    // Add standard columns
    baseColumns.push(
      columnHelper.accessor('category.title', {
        header: 'Categories of Requisition Products',
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            {/* @ts-ignore */}
            <img src={JSON.parse(row.original.category.images)?.[0]?.fileUrl} alt="image" width={38} height={38} className='rounded-md bg-actionHover' />
            <div className='flex flex-col items-start'>
              <Typography className='font-medium' color='text.primary'>
                {row.original.category.title}
              </Typography>
              <Typography variant='body2'>{row.original.description}</Typography>
            </div>
          </div>
        )
      }),
      columnHelper.accessor('requisitionist', {
        header: 'Requisitionist',
        cell: ({ row }) => (
          <div className='flex flex-col items-start'>
            <Typography className='font-medium' color='text.primary'>
              {
                // @ts-ignore
                row.original.requisitionist.name
              }
            </Typography>
            <Typography variant='body2' className='capitalize'>
              {
                // @ts-ignore
                row.original.requisitionist.role
              }
            </Typography>
          </div>
        )
      }),
      columnHelper.accessor('noOfBoxes', {
        header: 'Pending Requisition',
        cell: ({ row }) => (
          <Typography>
            {row.original.noOfBoxes}
          </Typography>
        )
      }),
      columnHelper.accessor('requisitionEvent', {
        header: 'Status',
        cell: ({ row }) =>
        <Chip
          label={row.original.requisitionEvent!.toString().charAt(0).toUpperCase() + row.original.requisitionEvent!.toString().slice(1)}
          variant='tonal'
          color={row.original.requisitionEvent === 'pending' ? 'warning' : 'info'}
          size='small'
        />
      }),
      columnHelper.accessor('$createdAt', {
        header: 'Created Date',
        cell: ({ row }) => {
          const dateString = row.original.$createdAt!;
          let formattedDate;

          try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
              throw new Error('Invalid date');
            }
            formattedDate = `${formatDate(date.toISOString())}, ${formatTime(date.toISOString())}`;
          } catch (error) {
            console.error('Error parsing date:', error);
            formattedDate = 'Invalid Date';
          }

          return <Typography>{formattedDate}</Typography>;
        }
      })
    )

    // Only add actions column for admin users
    if (isAdmin) {
      baseColumns.push(
        columnHelper.accessor('actions', {
          header: 'Actions',
          cell: ({ row }) => (
            <OptionMenu
              iconButtonProps={{ size: 'medium' }}
              iconClassName='text-textSecondary text-[22px]'
              options={[
                {
                  text: 'Accept',
                  icon: 'ri-checkbox-circle-line',
                  linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' },
                  menuItemProps: {
                    onClick: () => handleRequisitionAction('approve', row.original.$id!, row.original.category.$id)
                  }
                },
                {
                  text: 'Deny',
                  icon: 'ri-delete-bin-7-line',
                  menuItemProps: {
                    onClick: () => handleRequisitionAction('deny', row.original.$id!, row.original.category.$id),
                    className: 'flex items-center pli-4'
                  }
                }
              ]}
            />
          ),
          enableSorting: false
        })
      )
    }

    return baseColumns
  }, [isAdmin, handleRequisitionAction, isLoading])

  const table = useReactTable({
    data: data as ProductionRequisition[],
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
    enableRowSelection: isAdmin, // Only enable row selection for admin users
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

  const selectedRowCount = Object.keys(rowSelection).length

  return (
    <>
      <Typography className='mt-4' variant='h4'>Requisitions Made From Warehouse</Typography>
      <Divider className='my-8' />
      <Card>
        <div className='flex justify-between flex-col items-start flex-wrap sm:flex-row sm:items-center gap-4 p-5'>
          {isAdmin && selectedRowCount > 0 && (
            <div className='flex gap-4'>
              <Button
                variant='contained'
                color='primary'
                disabled={isLoading}
                onClick={() => handleBulkAction('approve')}
              >
                Approve Selected ({selectedRowCount})
              </Button>
              <Button
                variant='contained'
                color='error'
                disabled={isLoading}
                onClick={() => handleBulkAction('deny')}
              >
                Deny Selected ({selectedRowCount})
              </Button>
            </div>
          )}
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
                    { isLoading ? <LoaderDark /> : 'No requisitions available' }
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
