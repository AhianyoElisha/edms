'use client'

// React Imports
import { useCallback, useEffect, useMemo, useState } from 'react'

// Next Imports
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import Button, { ButtonProps } from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { TextFieldProps } from '@mui/material/TextField'
import { formatDate, formatTime } from '@/utils/dateAndCurrency'

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
import type { CategoryType, InventoryListType, RequisitionHistory } from '@/types/apps/ecommerceTypes'
import type { ThemeColor } from '@core/types'

// Component Imports
import OptionMenu from '@core/components/option-menu'

// Style Imports
import tableStyles from '@core/styles/table.module.css'
import CustomAvatar from '@/@core/components/mui/Avatar'
import { CardHeader, Divider } from '@mui/material'
import { toast } from 'react-toastify'
import { get } from 'http'
import { getInventoryCategoryList } from '@/libs/actions/stores.actions'
import LoaderDark from '@/components/layout/shared/LoaderDark'
import TableFilters from './TableFilters'
import OpenDialogOnElementClick from '@/components/dialogs/OpenDialogOnElementClick'
import RequisitionHistoryExportDialog from '@/components/dialogs/requisition-history-dialog'

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

type productStatusType = {
  [key: string]: {
    title: string
    color: ThemeColor
  }
}
const productStatusObj: productStatusType = {
  stores: { title: 'Stores', color: 'warning' },
  production: { title: 'Production', color: 'success' },
  warehouse: { title: 'Warehouse', color: 'error' }
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

type RequisitionHistoryWithActionsType = RequisitionHistory & {
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
const columnHelper = createColumnHelper<RequisitionHistoryWithActionsType>()

const RequisitionHistoryTable = () => {
  // States
  const [status, setStatus] = useState<InventoryListType['status']>('All')
  const [rowSelection, setRowSelection] = useState({})
  const [allData, setAllData] = useState<RequisitionHistory[]>([])
  const [data, setData] = useState(allData)
  const [filteredData, setFilteredData] = useState(data)
  const [globalFilteredData, setGlobalFilteredData] = useState<RequisitionHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState<RequisitionHistory['category']>('')

  // Hooks
  const router = useRouter()

    const fetchHistoryData = useCallback(async () => {
      try {
        setIsLoading(true)
        const response = await getInventoryCategoryList(true, false)
        setAllData(response?.requisitionList?.rows as unknown as RequisitionHistory[])
        setData(response?.requisitionList?.rows as unknown as RequisitionHistory[])
      } catch (error) {
        console.error('Error fetching inventory requisition data:', error)
        toast.error('Failed to fetch requisition data')
      } finally {
        setIsLoading(false)
      }
    }, [])
  
    useEffect(() => {
      fetchHistoryData()
    }, [fetchHistoryData])

  const columns = useMemo<ColumnDef<RequisitionHistoryWithActionsType, any>[]>(
    () => [
      columnHelper.accessor('category', {
        header: 'Categories of Requisitions',
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            {/* @ts-ignore */}
            <div className='flex flex-col items-start'>
              <Typography className='font-medium' color='text.primary'>
                {row.original.category}
              </Typography>
              <Typography variant='body2'>{row.original.description}</Typography>
            </div>
          </div>
        )
      }),
      columnHelper.accessor('requisitionType', {
        header: 'Action Performed',
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            <CustomAvatar src={''} size={34} />
            <div className='flex flex-col items-start'>
              <Typography
                component={Link}
                href={'/'}
                color='primary'
                className='font-medium'
              >
                {
                  // @ts-ignore
                  row.original.requisitionist.name
                }
              </Typography>
              <Typography variant='body2'>
                {
                  // @ts-ignore
                  row.original.requisitionist.role?.displayName || 'Unknown role'
                }
              </Typography>
              <Typography className='capitalize-first'>
                {
                `${row.original.requisitionEvent} 
                  ${row.original.requisitionType.includes('category') ? `${row.original.category}` : row.original.requisitionEvent.includes('spent') ? `GH₵ ${row.original.noOfBoxes}` : `${row.original.noOfBoxes} box(es) or package(s)`}
                  ${row.original.requisitionType.includes('category') ? '' : row.original.requisitionEvent.includes('spent') ? ` on ${row.original.requisitionType} `: ` of ${row.original.category} `}
                  ${row.original.requisitionEvent.includes('added') 
                    ? 'to' 
                    : row.original.requisitionEvent.includes('created') 
                    ? 'in' 
                    : row.original.requisitionEvent.includes('distributed') 
                      ? 'into'
                    : row.original.requisitionEvent.includes('spent') ? ''
                      : 'from'} 
                  ${row.original.requisitionEvent.includes('spent') ? row.original.category : row.original.requisitionType}`
              } 
              </Typography>
            </div>
          </div>
        )
      }),
      columnHelper.accessor('$createdAt', {
        header: 'Created Date',
        cell: ({ row }) => {
          const dateString = row.original.$createdAt!;
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
      // columnHelper.accessor('actions', {
      //   header: 'Actions',
      //   cell: ({ row }) => (
      //     <OptionMenu
      //       iconButtonProps={{ size: 'medium' }}
      //       iconClassName='text-textSecondary text-[22px]'
      //       options={[
      //         {
      //           text: 'View',
      //           icon: 'ri-eye-line',
      //           linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' },
      //           menuItemProps: { onClick: () => router.push(`/requisitions/history/${row.original.$id}`) }
      //         },

      //       ]}
      //     />
      //   ),
      //   enableSorting: true
      // })
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data]
  )

  const table = useReactTable({
    data: filteredData as RequisitionHistory[],
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

  return (
    <>
      <Typography className='mt-4' variant='h3'>Requisition History</Typography>
      <Divider className='my-8' />
      <Card>
        <CardHeader title='Filters' />
        <TableFilters setData={setFilteredData} historyData={data} />
        <Divider />
        <div className='flex justify-between flex-col items-start sm:flex-row sm:items-center gap-y-4 p-5'>
          <DebouncedInput
            value={globalFilter ?? ''}
            onChange={value => setGlobalFilter(String(value))}
            placeholder='Search Requisition Category'
            className='max-sm:is-full'
          />
          <div className='flex items-center max-sm:flex-col gap-4 max-sm:is-full is-auto'>
            <OpenDialogOnElementClick 
              element={Button} 
              elementProps={buttonProps} 
              dialog={RequisitionHistoryExportDialog} 
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
    </>
  )
}

export default RequisitionHistoryTable
