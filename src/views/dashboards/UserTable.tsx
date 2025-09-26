'use client'

// React Imports
import { useState, useMemo, useEffect, useCallback } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import { styled } from '@mui/material/styles'

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
import type { UsersType } from '@/types/apps/userTypes'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'

// Util Imports
import { getInitials } from '@/utils/getInitials'

// Style Imports
import tableStyles from '@core/styles/table.module.css'
import { Users } from '@/types/apps/ecommerceTypes'
import { Checkbox } from '@mui/material'
import { getUserList } from '@/libs/actions/customer.action'
import { getRolesList } from '@/libs/actions/roles.actions'
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

type UsersTypeWithAction = Users & {
  action?: string
}

type UserRoleType = {
  [key: string]: { icon: string; color: string }
}

type UserStatusType = {
  [key: string]: ThemeColor
}

// Styled Components
const Icon = styled('i')({})

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

// Vars
const userRoleObj: UserRoleType = new Proxy(
  {
    admin: { icon: 'ri-vip-crown-line', color: 'error' },
    sachetrep: { icon: 'ri-computer-line', color: 'warning' },
    marketingrep: { icon: 'ri-truck-line', color: 'warning' },
    warehouserep: { icon: 'ri-edit-box-line', color: 'info' },
    productionrep: { icon: 'ri-pie-chart-2-line', color: 'success' },
    storesrep: { icon: 'ri-user-3-line', color: 'primary' }
  } as UserRoleType,
  {
    get(target, prop: string) {
      return prop in target
        ? target[prop]
        : { icon: 'ri-user-line', color: 'secondary' } // Fallback
    }
  }
)

const userStatusObj: UserStatusType = {
  active: 'success',
  pending: 'warning',
  inactive: 'secondary'
}




// Column Definitions
const columnHelper = createColumnHelper<UsersTypeWithAction>()

const UserListTable = ({ tableData }: { tableData: Users[] | undefined }) => {
  
  // States
  const [role, setRole] = useState<Users['role']>('')
  const [filteredData, setFilteredData] = useState(tableData)
  const [isLoading, setIsLoading] = useState(false)
  
  // States
  const [rowSelection, setRowSelection] = useState({})
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [data, setData] = useState<Users[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  
  const fetchUserData = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await getUserList()
      setData(response?.rows as unknown as Users[])

    } catch (error) {
      console.error('Error fetching customer  data:', error)
      toast.error('Failed to fetch customer data')
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  useEffect(() => {
    fetchUserData()
  }, [fetchUserData])

  
  const columns = useMemo<ColumnDef<UsersTypeWithAction, any>[]>(
    () => [
      columnHelper.accessor('name', {
        header: 'User',
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            {getAvatar({ avatar: '', fullName: row.original.name })}
            <div className='flex flex-col'>
              <Typography color='text.primary' className='font-medium'>
                {row.original.name}
              </Typography>
              <Typography variant='body2'>{row.original.name}</Typography>
            </div>
          </div>
        )
      }),
      columnHelper.accessor('email', {
        header: 'Email',
        cell: ({ row }) => <Typography>{row.original.email}</Typography>
      }),
      columnHelper.accessor('role', {
        header: 'Role',
        cell: ({ row }) => (
          <div className='flex items-center gap-2'>
            <Icon
              className={userRoleObj[row.original.role?.name].icon}
              sx={{ color: `var(--mui-palette-${userRoleObj[row.original.role?.name].color}-main)`, fontSize: '1.375rem' }}
            />
            <Typography color='text.primary' className='capitalize'>
              {row.original.role?.name || 'Guest'}
            </Typography>
          </div>
        )
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            <Chip
              variant='tonal'
              label={row.original.status}
              size='small'
              color={userStatusObj[row.original.status]}
              className='capitalize'
            />
          </div>
        )
      }),
      // columnHelper.accessor('action', {
      //   header: 'Actions',
      //   cell: ({ row }) => (
      //     <div className='flex items-center gap-0.5'>
      //       <IconButton size='small' onClick={() => setData(data?.filter(product => product.$id !== row.original.$id))}>
      //         <i className='ri-delete-bin-7-line text-textSecondary' />
      //       </IconButton>
      //       <IconButton size='small'>
      //         <Link href={''} className='flex'>
      //           <i className='ri-eye-line text-textSecondary' />
      //         </Link>
      //       </IconButton>
      //       <OptionMenu
      //         iconClassName='text-textSecondary'
      //         options={[
      //           {
      //             text: 'Download',
      //             icon: 'ri-download-line',
      //             menuItemProps: { className: 'flex items-center' }
      //           },
      //           {
      //             text: 'Edit',
      //             icon: 'ri-edit-box-line',
      //             linkProps: { className: 'flex items-center' }
      //           }
      //         ]}
      //       />
      //     </div>
      //   ),
      //   enableSorting: false
      // })
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, filteredData]
  )

  const table = useReactTable({
    data: data as Users[],
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

  const getAvatar = (params: Pick<UsersType, 'avatar' | 'fullName'>) => {
    const { avatar, fullName } = params

    if (avatar) {
      return <CustomAvatar src={avatar} skin='light' size={34} />
    } else {
      return (
        <CustomAvatar skin='light' size={34}>
          {getInitials(fullName as string)}
        </CustomAvatar>
      )
    }
  }

  return (
    <>
      <Card>
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
                    {isLoading? <LoaderDark/> :`No data available`}
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {table
                  .getRowModel()
                  .rows.slice(0, 7)
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
      </Card>
    </>
  )
}

export default UserListTable
