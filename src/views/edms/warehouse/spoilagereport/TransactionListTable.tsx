'use client'

// React Imports
import { useCallback, useEffect, useMemo, useState, useRef } from 'react'

// Next Imports
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Button, { ButtonProps } from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import {ButtonGroup, ClickAwayListener, Grow, Paper, Popper, MenuList, MenuItem} from '@mui/material'
import Divider from '@mui/material/Divider'
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
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import type { RankingInfo } from '@tanstack/match-sorter-utils'

// Type Imports
import type { ThemeColor } from '@core/types'
import type { DamagedItemDetailType, DistributedItemDetailType, InventoryListType, ManufacturedProductListType, ProductDetailsType, ProductionCategoryType, ReturnItemDetailType, TransactionItemDetailType } from '@/types/apps/ecommerceTypes'

// Component Imports
import TableFilters from './TableFilters'
import OptionMenu from '@core/components/option-menu'

// Util Imports

// Style Imports
import tableStyles from '@core/styles/table.module.css'
import { formatDate, formatTime } from '@/utils/dateAndCurrency'
import OpenDialogOnElementClick from '@/components/dialogs/OpenDialogOnElementClick'
import ProductionExportDialog from '@/components/dialogs/production-dialog'
import { getManufacturedProductList, getProductionCategoryList } from '@/libs/actions/production.actions'
import { toast } from 'react-toastify'
import LoaderDark from '@/components/layout/shared/LoaderDark'
import DistributionExportDialog from '@/components/dialogs/distribution-dialog'
import { getDistributionProductList, getTransactionProductList } from '@/libs/actions/distribution.actions'
import { getDamagedProductList, getReturnedProductList } from '@/libs/actions/warehouse.actions'

declare module '@tanstack/table-core' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface FilterMeta {
    itemRank: RankingInfo
  }
}

type TransactionWithActionsType = DamagedItemDetailType & {
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

// Column Definitions
const columnHelper = createColumnHelper<TransactionWithActionsType>()

const TransactionListTable = () => {

  // States
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState<DamagedItemDetailType[]>([])
  const [filteredData, setFilteredData] = useState(data)
  const [globalFilter, setGlobalFilter] = useState<ProductionCategoryType['title']>('')
  const [globalFilteredData, setGlobalFilteredData] = useState<ProductionCategoryType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [categoryData, setCategoryData] = useState<ProductionCategoryType[]>([])
  const [open, setOpen] = useState<boolean>(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const handleToggle = (): void => {
    setOpen((prevOpen: boolean) => !prevOpen);
  };

  const handleClose = (event: Event | React.SyntheticEvent): void => {
    if (
      anchorRef.current &&
      anchorRef.current.contains(event.target as HTMLElement)
    ) {
      return;
    }
    setOpen(false);
  };

  // Hooks
  const { lang: locale } = useParams()
  const  router  = useRouter()
  

  const fetchInventoryData = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await getDamagedProductList()
      setData(response?.documents as unknown as DamagedItemDetailType[])
      const category = await getProductionCategoryList(false, true)
      setCategoryData(category?.productionList?.documents as unknown as ProductionCategoryType[])
    } catch (error) {
      console.error('Error fetching transaction data:', error)
      toast.error('Failed to fetch transaction data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInventoryData()
  }, [fetchInventoryData])


  const columns = useMemo<ColumnDef<TransactionWithActionsType, any>[]>(
    () => [
      columnHelper.accessor('category', {
        header: 'Category',
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            {/* @ts-ignore */}
            <img src={JSON.parse(row.original.category.images)?.[0]?.fileUrl} alt="image" width={38} height={38} className='rounded-md bg-actionHover' />
            <div className='flex flex-col items-start'>
              <Typography className='font-medium' color='text.primary'>
                {
                //@ts-ignore
                  row.original.category.title
                }
              </Typography>
              <Typography variant='body2'>{
                //@ts-ignore
                row.original.category.description
              }</Typography>
            </div>
          </div>
        )
      }),
      columnHelper.accessor('$createdAt', {
        header: 'Damaged Date',
        cell: ({ row }) => {
          const dateString = row.original.damageDate!;
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
      columnHelper.accessor('quantity', {
        header: 'QTY(Packages) Damaged or Leaked',
        cell: ({ row }) => <Typography>{
        // @ts-ignore
          row.original.quantity
        }</Typography>
      }),
      columnHelper.accessor('creator', {
        header: 'Recorded By',
        cell: ({ row }) => <Typography>{
        // @ts-ignore
          row.original.creator?.name
        }</Typography>
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
      columnHelper.accessor('actions', {
        header: 'Actions',
        cell: ({ row }) => (
          <div className='flex items-center'>
            <OptionMenu
              iconButtonProps={{ size: 'medium' }}
              iconClassName='text-textSecondary text-[22px]'
              options={[
                // { text: 'Details', 
                //   icon: 'ri-stack-line',
                //   menuItemProps: { onClick: () => router.push(`/distribution/${row.original.$id}`) }
                // },
                // { text: 'Download', icon: 'ri-download-line' },
                // {
                //   text: 'Delete',
                //   icon: 'ri-delete-bin-7-line',
                //   menuItemProps: { onClick: () => setData(data?.filter(inventoryItem => inventoryItem.$id !== row.original.$id)) }
                // },
              ]}
            />
          </div>
        ),
        enableSorting: false
      })
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, filteredData]
  )

  const table = useReactTable({
    data: filteredData as DamagedItemDetailType[],
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
      <Typography className='mt-4' variant='h3'>All Damaged and Spoiled Products(Leakages) Report</Typography>
      <Divider className='my-8' />
      <Card>
        <CardHeader title='Filters' />
        <TableFilters setData={setFilteredData} damagedProductsData={data} categoryData={categoryData}/>
        <Divider />
        <div className='flex justify-end flex-col items-end sm:flex-row sm:items-center gap-y-4 p-5'>
          {/* <DebouncedInput
            value={globalFilter ?? ''}
            onChange={value => setGlobalFilter(String(value))}
            placeholder='Search Product'
            className='max-sm:is-full'
          /> */}
          <div className='flex items-center max-sm:flex-col gap-4 max-sm:is-full is-auto'>
            <OpenDialogOnElementClick 
              element={Button} 
              elementProps={buttonProps} 
              dialog={DistributionExportDialog} 
              dialogProps={{ tableData: filteredData }} 
            />
            <Button
              variant='contained'
              component={Link}
              href={'/warehouse/spoilagereport'}
              startIcon={<i className='ri-add-line' />}
              className='max-sm:is-full is-auto'
            >
              Add Damaged Product
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
    </>
  )
}

export default TransactionListTable
