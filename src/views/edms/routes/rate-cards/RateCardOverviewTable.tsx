'use client'

// React Imports
import { useState, useMemo, useEffect } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import TablePagination from '@mui/material/TablePagination'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'

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

// Type Imports
import type { RateCardType, VolumePrice } from '@/types/apps/deliveryTypes'

// Component Imports
import Link from '@/components/Link'
import OptionMenu from '@core/components/option-menu'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Actions Imports
import { 
  getAllRateCards, 
  deleteRateCard, 
  deactivateRateCard, 
  updateRateCard,
  getUniqueClients 
} from '@/libs/actions/ratecard.actions'

// Hook Imports
import { usePermissions } from '@/hooks/usePermissions'

type RateCardWithActions = RateCardType

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta({ itemRank })
  return itemRank.passed
}

const columnHelper = createColumnHelper<RateCardWithActions>()

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount)
}

// Helper to render volume prices in a compact format
const VolumePricesSummary = ({ volumePrices }: { volumePrices: VolumePrice[] | string }) => {
  const prices = typeof volumePrices === 'string' ? JSON.parse(volumePrices) : volumePrices
  if (!prices || prices.length === 0) return <Typography color='text.secondary'>No prices set</Typography>

  const smallTruckPrices = prices.filter((vp: VolumePrice) => vp.volume <= 18)
  const bigTruckPrices = prices.filter((vp: VolumePrice) => vp.volume > 18)

  return (
    <Tooltip
      title={
        <Box sx={{ p: 1 }}>
          <Typography variant='subtitle2' sx={{ mb: 1 }}>Small Truck (10-18 CBM)</Typography>
          {smallTruckPrices.map((vp: VolumePrice) => (
            <Typography key={vp.volume} variant='body2'>
              {vp.volume} CBM: {formatCurrency(vp.rate)}
            </Typography>
          ))}
          <Typography variant='subtitle2' sx={{ mt: 1, mb: 1 }}>Big Truck (37-75 CBM)</Typography>
          {bigTruckPrices.map((vp: VolumePrice) => (
            <Typography key={vp.volume} variant='body2'>
              {vp.volume} CBM: {formatCurrency(vp.rate)}
            </Typography>
          ))}
        </Box>
      }
      placement='left'
      arrow
    >
      <Box sx={{ cursor: 'pointer' }}>
        <Typography variant='body2' color='text.primary'>
          Small: {formatCurrency(smallTruckPrices[0]?.rate || 0)} - {formatCurrency(smallTruckPrices[smallTruckPrices.length - 1]?.rate || 0)}
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Big: {formatCurrency(bigTruckPrices[0]?.rate || 0)} - {formatCurrency(bigTruckPrices[bigTruckPrices.length - 1]?.rate || 0)}
        </Typography>
      </Box>
    </Tooltip>
  )
}

const RateCardOverviewTable = () => {
  // States
  const [rateCardData, setRateCardData] = useState<RateCardWithActions[]>([])
  const [loading, setLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [clients, setClients] = useState<{ code: string; name: string }[]>([])

  // Permissions
  const { hasPermission } = usePermissions()

  // Load clients for filter
  useEffect(() => {
    const loadClients = async () => {
      try {
        const uniqueClients = await getUniqueClients()
        setClients(uniqueClients)
      } catch (error) {
        console.error('Error loading clients:', error)
      }
    }
    loadClients()
  }, [])

  // Load rate cards
  useEffect(() => {
    const loadRateCards = async () => {
      try {
        setLoading(true)
        const filters: any = {}
        
        if (statusFilter !== 'all') {
          filters.isActive = statusFilter === 'active'
        }
        if (clientFilter !== 'all') {
          filters.clientCode = clientFilter
        }
        
        const rateCards = await getAllRateCards(Object.keys(filters).length > 0 ? filters : undefined)
        setRateCardData(rateCards)
      } catch (error) {
        console.error('Error loading rate cards:', error)
      } finally {
        setLoading(false)
      }
    }

    loadRateCards()
  }, [statusFilter, clientFilter])

  const handleToggleStatus = async (rateCardId: string, isActive: boolean) => {
    try {
      if (isActive) {
        await deactivateRateCard(rateCardId)
      } else {
        await updateRateCard(rateCardId, { isActive: true })
      }
      
      // Update local state
      setRateCardData(prevData =>
        prevData.map(rateCard =>
          rateCard.$id === rateCardId ? { ...rateCard, isActive: !isActive } : rateCard
        )
      )
    } catch (error) {
      console.error('Error toggling rate card status:', error)
    }
  }

  const handleDeleteRateCard = async (rateCardId: string) => {
    if (confirm('Are you sure you want to delete this rate card?')) {
      try {
        await deleteRateCard(rateCardId)
        
        // Remove from local state
        setRateCardData(prevData => prevData.filter(rateCard => rateCard.$id !== rateCardId))
      } catch (error) {
        console.error('Error deleting rate card:', error)
      }
    }
  }

  const columns = useMemo<ColumnDef<RateCardWithActions, any>[]>(
    () => [
      columnHelper.accessor('clientCode', {
        header: 'Client',
        cell: ({ row }) => (
          <div className='flex items-center gap-2'>
            <div className='flex flex-col'>
              <Typography className='font-medium' color='text.primary'>
                {row.original.clientCode}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {row.original.clientName}
              </Typography>
            </div>
          </div>
        )
      }),
      columnHelper.accessor('routeCode', {
        header: 'Route',
        cell: ({ row }) => (
          <div className='flex flex-col'>
            <Typography color='text.primary' className='font-medium'>
              {row.original.routeCode}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {row.original.routeDescription}
            </Typography>
          </div>
        )
      }),
      columnHelper.accessor('volumePrices', {
        header: 'Volume Prices',
        cell: ({ row }) => (
          <VolumePricesSummary volumePrices={row.original.volumePrices} />
        )
      }),
      columnHelper.accessor('effectiveFrom', {
        header: 'Effective Period',
        cell: ({ row }) => {
          const from = new Date(row.original.effectiveFrom).toLocaleDateString()
          const to = row.original.effectiveTo 
            ? new Date(row.original.effectiveTo).toLocaleDateString() 
            : 'No End Date'
          return (
            <div className='flex flex-col'>
              <Typography variant='body2' color='text.primary'>
                From: {from}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                To: {to}
              </Typography>
            </div>
          )
        }
      }),
      columnHelper.accessor('isActive', {
        header: 'Status',
        cell: ({ row }) => (
          <Chip
            label={row.original.isActive ? 'Active' : 'Inactive'}
            color={row.original.isActive ? 'success' : 'secondary'}
            size='small'
            variant='tonal'
          />
        )
      }),
      columnHelper.accessor('$id', {
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => (
          <div className='flex items-center'>
            <OptionMenu
              iconButtonProps={{ size: 'medium' }}
              iconClassName='text-textSecondary text-[22px]'
              options={[
                {
                  text: 'View Details',
                  icon: 'ri-eye-line',
                  href: `/edms/routes/rate-cards/${row.original.$id}`,
                  linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' }
                },
                ...(hasPermission('ratecards.edit') ? [{
                  text: 'Edit',
                  icon: 'ri-edit-box-line',
                  href: `/edms/routes/rate-cards/${row.original.$id}/edit`,
                  linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' }
                }] : []),
                ...(hasPermission('ratecards.create') ? [{
                  text: 'Duplicate',
                  icon: 'ri-file-copy-line',
                  href: `/edms/routes/rate-cards/create?duplicate=${row.original.$id}`,
                  linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' }
                }] : []),
                {
                  text: row.original.isActive ? 'Deactivate' : 'Activate',
                  icon: row.original.isActive ? 'ri-close-circle-line' : 'ri-checkbox-circle-line',
                  linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4' },
                  menuItemProps: { onClick: () => handleToggleStatus(row.original.$id, row.original.isActive) }
                },
                ...(hasPermission('ratecards.delete') ? [{
                  text: 'Delete',
                  icon: 'ri-delete-bin-7-line',
                  linkProps: { className: 'flex items-center gap-2 is-full plb-1.5 pli-4 text-error' },
                  menuItemProps: { onClick: () => handleDeleteRateCard(row.original.$id) }
                }] : [])
              ]}
            />
          </div>
        )
      })
    ],
    []
  )

  const table = useReactTable({
    data: rateCardData,
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
    <Card>
      <CardContent className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
        <div className='flex flex-wrap items-center gap-2'>
          <TextField
            select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className='min-w-[130px]'
            size='small'
          >
            <MenuItem value='all'>All Status</MenuItem>
            <MenuItem value='active'>Active</MenuItem>
            <MenuItem value='inactive'>Inactive</MenuItem>
          </TextField>
          <TextField
            select
            value={clientFilter}
            onChange={e => setClientFilter(e.target.value)}
            className='min-w-[150px]'
            size='small'
          >
            <MenuItem value='all'>All Clients</MenuItem>
            {clients.map(client => (
              <MenuItem key={client.code} value={client.code}>
                {client.code} - {client.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            value={globalFilter ?? ''}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder='Search Rate Cards...'
            size='small'
            className='min-w-[200px]'
          />
        </div>
        {hasPermission('ratecards.create') && (
          <Button
            variant='contained'
            component={Link}
            href='/edms/routes/rate-cards/create'
            startIcon={<i className='ri-add-line' />}
          >
            Add Rate Card
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
                  <Typography className='py-10'>Loading rate cards...</Typography>
                </td>
              </tr>
            </tbody>
          ) : table.getFilteredRowModel().rows.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                  <Typography className='py-10'>No rate cards found</Typography>
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
        rowsPerPageOptions={[5, 10, 25, 40, 50, 100]}
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
  )
}

export default RateCardOverviewTable
