'use client'

// React Imports
import { useState, useMemo, useEffect, useCallback } from 'react'

// Next Imports
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import { styled } from '@mui/material/styles'
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
import type { UsersType } from '@/types/apps/userTypes'

// Component Imports
import OptionMenu from '@core/components/option-menu'
import CustomAvatar from '@core/components/mui/Avatar'
import AddUserDialog from '@components/dialogs/add-user-dialog'
import OpenDialogOnElementClick from '@components/dialogs/OpenDialogOnElementClick'

// Util Imports
import { getInitials } from '@/utils/getInitials'
import { getRolesList } from '@/libs/actions/roles.actions'

// Style Imports
import tableStyles from '@core/styles/table.module.css'
import { getUserList } from '@/libs/actions/customer.action'
import { toast } from 'react-toastify'
import { Users } from '@/types/apps/ecommerceTypes'

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

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value)
    }, debounce)

    return () => clearTimeout(timeout)
  }, [value])

  return <TextField {...props} value={value} onChange={e => setValue(e.target.value)} size='small' />
}

// Vars
const userRoleObj: UserRoleType = {
  admin: { icon: 'ri-vip-crown-line', color: 'error' },
  operations: { icon: 'ri-computer-line', color: 'warning' },
  driver: { icon: 'ri-truck-line', color: 'warning' },
  pickupagent: { icon: 'ri-edit-box-line', color: 'info' },
  productionrep: { icon: 'ri-pie-chart-2-line', color: 'success' },
  storesrep: { icon: 'ri-user-3-line', color: 'primary' }
}

const userStatusObj: UserStatusType = {
  active: 'success',
  pending: 'warning',
  inactive: 'secondary'
}

// Column Definitions
const columnHelper = createColumnHelper<UsersTypeWithAction>()

const UserListTable = ({ tableData, onRefresh }: { tableData?: UsersType[]; onRefresh?: () => void }) => {
  // States
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState<Users[]>([])
  const [filteredData, setFilteredData] = useState(data)
  const [globalFilter, setGlobalFilter] = useState('')
  const [role, setRole] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [availableRoles, setAvailableRoles] = useState<any[]>([])

  const router = useRouter()

  const fetchUserData = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await getUserList()
      setData(response?.rows as unknown as Users[])

      // Fetch roles for the dropdown
      const rolesResponse = await getRolesList()
      setAvailableRoles(rolesResponse?.documents || [])
      
      // Trigger refresh in parent component
      if (onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
      toast.error('Failed to fetch user data')
    } finally {
      setIsLoading(false)
    }
  }, [onRefresh])

  useEffect(() => {
    fetchUserData()
  }, [fetchUserData])

  // Hooks
  const { lang: locale } = useParams()

  const columns = useMemo<ColumnDef<UsersTypeWithAction, any>[]>(
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
      columnHelper.accessor('name', {
        header: 'User',
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            {getAvatar({ avatar: row.original.avatar!, fullName: row.original.name })}
            <div className='flex flex-col'>
              <Typography color='text.primary' className='font-medium'>
                {row.original.name}
              </Typography>
              <Typography variant='body2'>{row.original.email}</Typography>
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
              className={classnames('text-[22px]', userRoleObj[row.original.role?.name]?.icon || 'ri-user-line')}
              sx={{ color: `var(--mui-palette-${userRoleObj[row.original.role?.name]?.color || 'primary'}-main)` }}
            />
            <Typography color='text.primary' className='capitalize'>
              {row.original.role?.displayName}
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
      columnHelper.accessor('action', {
        header: 'Action',
        cell: ({ row }) => (
          <div className='flex items-center'>
            <OptionMenu
              iconClassName='text-textSecondary'
              options={[
                {
                  text: 'View',
                  icon: 'ri-eye-line',
                  menuItemProps: {
                    onClick: () => router.push(`/user/view/${row.original.$id}`),
                    className: 'flex items-center'
                  }
                },
                {
                  text: 'Delete',
                  icon: 'ri-delete-bin-7-line',
                  menuItemProps: {
                    className: 'flex items-center',
                    onClick: () => setData(data?.filter(user => user.$id !== row.original.$id))
                  }
                }
              ]}
            />
          </div>
        ),
        enableSorting: false
      })
    ],
    [data, filteredData]
  )

  const table = useReactTable({
    data: filteredData as Users[],
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

  const getAvatar = (params: Pick<UsersType, 'avatar' | 'fullName'>) => {
    const { avatar, fullName } = params

    if (avatar) {
      return <CustomAvatar src={avatar} size={34} />
    } else {
      return <CustomAvatar>{getInitials(fullName as string)}</CustomAvatar>
    }
  }

  useEffect(() => {
    const filteredData = data?.filter(user => {
      if (role && user.role !== role) return false
      return true
    })

    setFilteredData(filteredData)
  }, [role, data, setFilteredData])

  return (
    <>
      <Card>
        <CardContent className='flex justify-between flex-col items-start sm:flex-row sm:items-center max-sm:gap-4'>
          <Button
            variant='outlined'
            color='secondary'
            startIcon={<i className='ri-upload-2-line' />}
            className='max-sm:is-full'
          >
            Export
          </Button>
          <div className='flex flex-col !items-start max-sm:is-full sm:flex-row sm:items-center gap-4'>
            <DebouncedInput
              value={globalFilter ?? ''}
              className='max-sm:is-full min-is-[220px]'
              onChange={value => setGlobalFilter(String(value))}
              placeholder='Search User'
            />
            <FormControl size='small' className='max-sm:is-full'>
              <InputLabel id='user-role-select-label'>Select Role</InputLabel>
              <Select
                value={role}
                onChange={e => setRole(e.target.value)}
                label='Select Role'
                id='user-role-select'
                labelId='user-role-select-label'
                className='min-is-[150px]'
              >
                <MenuItem value=''>All Roles</MenuItem>
                {availableRoles.map((roleItem) => (
                  <MenuItem key={roleItem.$id} value={roleItem.name}>
                    {roleItem.displayName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant='contained'
              startIcon={<i className='ri-add-line' />}
              onClick={() => setAddUserOpen(true)}
              className='max-sm:is-full'
            >
              Add User
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
                    {isLoading ? 'Loading...' : 'No data available'}
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
          SelectProps={{
            inputProps: { 'aria-label': 'rows per page' }
          }}
          onPageChange={(_, page) => {
            table.setPageIndex(page)
          }}
          onRowsPerPageChange={e => table.setPageSize(Number(e.target.value))}
        />
      </Card>
      <AddUserDialog
        open={addUserOpen}
        setOpen={setAddUserOpen}
        onUpdate={fetchUserData}
      />
    </>
  )
}

export default UserListTable
