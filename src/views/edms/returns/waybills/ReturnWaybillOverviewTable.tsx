'use client'

// React Imports
import { useState, useMemo, useEffect } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import TablePagination from '@mui/material/TablePagination'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'

// Third-party Imports
import classnames from 'classnames'
import { rankItem } from '@tanstack/match-sorter-utils'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel
} from '@tanstack/react-table'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import { toast } from 'react-toastify'

// Type Imports
import type { ReturnWaybillType, ReturnWaybillStatusType, ReturnReasonType } from '@/types/apps/deliveryTypes'

// Component Imports
import Link from '@/components/Link'
import OptionMenu from '@core/components/option-menu'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Actions Imports
import { 
  getAllReturnWaybills, 
  deleteReturnWaybill, 
  markReturnWaybillInTransit,
  markReturnWaybillDelivered,
  markReturnWaybillProcessed
} from '@/libs/actions/returnwaybill.actions'

// Hook Imports
import { usePermissions } from '@/hooks/usePermissions'

type ReturnWaybillWithActions = ReturnWaybillType

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta({ itemRank })
  return itemRank.passed
}

const columnHelper = createColumnHelper<ReturnWaybillWithActions>()

const getStatusColor = (status: ReturnWaybillStatusType) => {
  switch (status) {
    case 'pending':
      return 'warning'
    case 'in_transit':
      return 'info'
    case 'delivered':
      return 'success'
    case 'processed':
      return 'primary'
    default:
      return 'secondary'
  }
}

const getReasonLabel = (reason: ReturnReasonType) => {
  switch (reason) {
    case 'rejected':
      return 'Rejected'
    case 'damaged':
      return 'Damaged'
    case 'wrong_delivery':
      return 'Wrong Delivery'
    case 'customer_return':
      return 'Customer Return'
    case 'other':
      return 'Other'
    default:
      return reason
  }
}

const ReturnWaybillOverviewTable = () => {
  const { hasPermission } = usePermissions()
  // Hooks
  const router = useRouter()
  
  // States
  const [waybillData, setWaybillData] = useState<ReturnWaybillWithActions[]>([])
  const [loading, setLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [reasonFilter, setReasonFilter] = useState<string>('all')
  
  // Dialog states
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false)
  const [selectedWaybillId, setSelectedWaybillId] = useState<string | null>(null)
  const [receivedBy, setReceivedBy] = useState('')

  // Load return waybills
  useEffect(() => {
    const loadWaybills = async () => {
      try {
        setLoading(true)
        const filters: any = {}
        
        if (statusFilter !== 'all') {
          filters.status = statusFilter
        }
        if (reasonFilter !== 'all') {
          filters.returnReason = reasonFilter
        }
        
        const waybills = await getAllReturnWaybills(Object.keys(filters).length > 0 ? filters : undefined)
        setWaybillData(waybills)
      } catch (error) {
        console.error('Error loading return waybills:', error)
      } finally {
        setLoading(false)
      }
    }

    loadWaybills()
  }, [statusFilter, reasonFilter])

  const handleMarkInTransit = async (waybillId: string) => {
    try {
      await markReturnWaybillInTransit(waybillId)
      setWaybillData(prevData =>
        prevData.map(waybill =>
          waybill.$id === waybillId ? { ...waybill, status: 'in_transit' } : waybill
        )
      )
      toast.success('Return waybill marked as in transit')
    } catch (error) {
      console.error('Error marking waybill in transit:', error)
      toast.error('Failed to update status')
    }
  }

  const handleOpenDeliveryDialog = (waybillId: string) => {
    setSelectedWaybillId(waybillId)
    setReceivedBy('')
    setDeliveryDialogOpen(true)
  }

  const handleConfirmDelivery = async () => {
    if (!selectedWaybillId || !receivedBy.trim()) {
      toast.error('Please enter the name of the receiver')
      return
    }

    try {
      await markReturnWaybillDelivered(selectedWaybillId, receivedBy.trim())
      setWaybillData(prevData =>
        prevData.map(waybill =>
          waybill.$id === selectedWaybillId 
            ? { ...waybill, status: 'delivered', receivedBy: receivedBy.trim(), deliveredAt: new Date().toISOString() } 
            : waybill
        )
      )
      toast.success('Return waybill marked as delivered')
      setDeliveryDialogOpen(false)
    } catch (error) {
      console.error('Error marking waybill delivered:', error)
      toast.error('Failed to update status')
    }
  }

  const handleMarkProcessed = async (waybillId: string) => {
    try {
      await markReturnWaybillProcessed(waybillId)
      setWaybillData(prevData =>
        prevData.map(waybill =>
          waybill.$id === waybillId ? { ...waybill, status: 'processed' } : waybill
        )
      )
      toast.success('Return waybill marked as processed')
    } catch (error) {
      console.error('Error marking waybill processed:', error)
      toast.error('Failed to update status')
    }
  }

  const handleDeleteWaybill = async (waybillId: string) => {
    if (confirm('Are you sure you want to delete this return waybill?')) {
      try {
        await deleteReturnWaybill(waybillId)
        setWaybillData(prevData => prevData.filter(waybill => waybill.$id !== waybillId))
        toast.success('Return waybill deleted')
      } catch (error) {
        console.error('Error deleting waybill:', error)
        toast.error('Failed to delete waybill')
      }
    }
  }

  const getStatusActions = (waybill: ReturnWaybillType) => {
    const actions: any[] = []

    if (waybill.status === 'pending') {
      actions.push({
        text: 'Mark In Transit',
        icon: 'ri-truck-line',
        linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' },
        menuItemProps: { onClick: () => handleMarkInTransit(waybill.$id) }
      })
    }

    if (waybill.status === 'in_transit') {
      actions.push({
        text: 'Mark Delivered',
        icon: 'ri-checkbox-circle-line',
        linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' },
        menuItemProps: { onClick: () => handleOpenDeliveryDialog(waybill.$id) }
      })
    }

    if (waybill.status === 'delivered') {
      actions.push({
        text: 'Mark Processed',
        icon: 'ri-check-double-line',
        linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' },
        menuItemProps: { onClick: () => handleMarkProcessed(waybill.$id) }
      })
    }

    return actions
  }

  const columns = useMemo<ColumnDef<ReturnWaybillWithActions, any>[]>(
    () => [
      columnHelper.accessor('waybillNumber', {
        header: 'Waybill Number',
        cell: ({ row }) => (
          <div className='flex flex-col'>
            <Typography className='font-medium' color='text.primary'>
              {row.original.waybillNumber}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {new Date(row.original.returnDate).toLocaleDateString()}
            </Typography>
          </div>
        )
      }),
      columnHelper.accessor('trip', {
        header: 'Trip',
        cell: ({ row }) => {
          const trip = row.original.trip
          return (
            <Typography color='text.primary'>
              {typeof trip === 'object' && trip?.tripNumber ? trip.tripNumber : trip || 'N/A'}
            </Typography>
          )
        }
      }),
      columnHelper.accessor('dropofflocation', {
        header: 'From (Dropoff)',
        cell: ({ row }) => {
          const location = row.original.dropofflocation
          return (
            <Typography color='text.primary'>
              {typeof location === 'object' && location?.locationName ? location.locationName : 'N/A'}
            </Typography>
          )
        }
      }),
      columnHelper.accessor('pickuplocation', {
        header: 'To (Pickup)',
        cell: ({ row }) => {
          const location = row.original.pickuplocation
          return (
            <Typography color='text.primary'>
              {typeof location === 'object' && location?.locationName ? location.locationName : 'N/A'}
            </Typography>
          )
        }
      }),
      columnHelper.accessor('packageCount', {
        header: 'Packages',
        cell: ({ row }) => (
          <Typography color='text.primary'>
            {row.original.packageCount} pkg(s)
          </Typography>
        )
      }),
      columnHelper.accessor('returnReason', {
        header: 'Reason',
        cell: ({ row }) => (
          <Chip
            label={getReasonLabel(row.original.returnReason)}
            color='default'
            size='small'
            variant='tonal'
          />
        )
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: ({ row }) => (
          <Chip
            label={row.original.status.replace('_', ' ').toUpperCase()}
            color={getStatusColor(row.original.status)}
            size='small'
            variant='tonal'
          />
        )
      }),
      columnHelper.accessor('receivedBy', {
        header: 'Received By',
        cell: ({ row }) => (
          <Typography color='text.primary'>
            {row.original.receivedBy || '-'}
          </Typography>
        )
      }),
      columnHelper.accessor('$id', {
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => {
          const statusActions = getStatusActions(row.original)
          
          return (
            <div className='flex items-center gap-2'>
              <Button
                variant='outlined'
                size='small'
                onClick={() => router.push(`/edms/returns/waybills/${row.original.$id}`)}
              >
                View
              </Button>
              <OptionMenu
                iconButtonProps={{ size: 'medium' }}
                iconClassName='text-textSecondary text-[22px]'
                options={[
                  ...(hasPermission('deliveries.edit') ? [{
                    text: 'Edit',
                    icon: 'ri-edit-box-line',
                    href: `/edms/returns/waybills/${row.original.$id}/edit`,
                    linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' }
                  }] : []),
                  ...statusActions,
                  ...(hasPermission('deliveries.delete') ? [{
                    text: 'Delete',
                    icon: 'ri-delete-bin-7-line',
                    linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4 text-error' },
                    menuItemProps: { onClick: () => handleDeleteWaybill(row.original.$id) }
                  }] : [])
                ]}
              />
            </div>
          )
        }
      })
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router]
  )

  const table = useReactTable({
    data: waybillData,
    columns,
    filterFns: {
      fuzzy: fuzzyFilter
    },
    state: {
      globalFilter
    },
    globalFilterFn: fuzzyFilter,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  return (
    <>
      <Card>
        <CardContent className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <div className='flex flex-wrap items-center gap-2'>
            <TextField
              select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className='min-w-[130px]'
              size='small'
            >
              <MenuItem value='all'>All Status</MenuItem>
              <MenuItem value='pending'>Pending</MenuItem>
              <MenuItem value='in_transit'>In Transit</MenuItem>
              <MenuItem value='delivered'>Delivered</MenuItem>
              <MenuItem value='processed'>Processed</MenuItem>
            </TextField>
            <TextField
              select
              value={reasonFilter}
              onChange={e => setReasonFilter(e.target.value)}
              className='min-w-[150px]'
              size='small'
            >
              <MenuItem value='all'>All Reasons</MenuItem>
              <MenuItem value='rejected'>Rejected</MenuItem>
              <MenuItem value='damaged'>Damaged</MenuItem>
              <MenuItem value='wrong_delivery'>Wrong Delivery</MenuItem>
              <MenuItem value='customer_return'>Customer Return</MenuItem>
              <MenuItem value='other'>Other</MenuItem>
            </TextField>
            <TextField
              value={globalFilter ?? ''}
              onChange={e => setGlobalFilter(e.target.value)}
              placeholder='Search Waybills...'
              size='small'
              className='min-w-[200px]'
            />
          </div>
          {hasPermission('deliveries.create') && (
            <Button
              variant='contained'
              component={Link}
              href='/edms/returns/waybills/create'
              startIcon={<i className='ri-add-line' />}
            >
              Create Return Waybill
            </Button>
          )}
        </CardContent>

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
            {loading ? (
              <tbody>
                <tr>
                  <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                    <Typography className='py-10'>Loading return waybills...</Typography>
                  </td>
                </tr>
              </tbody>
            ) : table.getFilteredRowModel().rows.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                    <Typography className='py-10'>No return waybills found</Typography>
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} className={classnames({ selected: row.getIsSelected() })}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                ))}
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

      {/* Delivery Confirmation Dialog */}
      <Dialog open={deliveryDialogOpen} onClose={() => setDeliveryDialogOpen(false)}>
        <DialogTitle>Confirm Delivery</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label='Received By *'
            placeholder='Enter name of receiver'
            value={receivedBy}
            onChange={e => setReceivedBy(e.target.value)}
            className='mt-4'
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeliveryDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelivery} variant='contained'>
            Confirm Delivery
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default ReturnWaybillOverviewTable
