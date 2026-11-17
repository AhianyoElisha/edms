'use client'

// React Imports
import { useCallback, useEffect, useMemo, useState } from 'react'

// Next Imports
import Link from 'next/link'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import CircularProgress from '@mui/material/CircularProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

// Third-party Imports
import { toast } from 'react-toastify'

// Component Imports
import GenericTableExportDialog from '@/components/dialogs/generic-table-export-dialog'
import type { ExportColumn } from '@/components/dialogs/generic-table-export-dialog'

// Action Imports
import { getLossSheet } from '@/libs/actions/driverloss.actions'
import type { DriverLossSummary } from '@/libs/actions/driverloss.actions'

// Util Imports
import { formatPrice } from '@/utils/dateAndCurrency'

const day = (value: string | null) => (value ? new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

const StatCard = ({ label, value, hint, color }: { label: string; value: string; hint?: string; color?: string }) => (
  <Card>
    <CardContent>
      <Typography variant='body2' color='text.secondary'>
        {label}
      </Typography>
      <Typography variant='h5' color={color}>
        {value}
      </Typography>
      {hint && (
        <Typography variant='caption' color='text.secondary'>
          {hint}
        </Typography>
      )}
    </CardContent>
  </Card>
)

/**
 * Every driver's losses at a glance: what they have been charged, what they have
 * paid back, and what is left. Opens onto each driver's ledger.
 */
const LossSheet = () => {
  const [rows, setRows] = useState<DriverLossSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [owingOnly, setOwingOnly] = useState(true)
  const [exportOpen, setExportOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setRows(await getLossSheet())
    } catch (error) {
      console.error('Error loading loss sheet:', error)
      toast.error('Could not load the loss sheet')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const visible = useMemo(
    () =>
      rows.filter(
        row =>
          (!owingOnly || row.balance > 0 || row.itemsNeedingPrice > 0) &&
          (!search.trim() || row.driverName.toLowerCase().includes(search.trim().toLowerCase()))
      ),
    [rows, owingOnly, search]
  )

  const totals = useMemo(
    () => ({
      owed: rows.reduce((sum, row) => sum + row.owed, 0),
      paid: rows.reduce((sum, row) => sum + row.paid, 0),
      balance: rows.reduce((sum, row) => sum + Math.max(0, row.balance), 0),
      needingPrice: rows.reduce((sum, row) => sum + row.itemsNeedingPrice, 0),
      owing: rows.filter(row => row.balance > 0).length
    }),
    [rows]
  )

  const exportColumns: ExportColumn[] = [
    { header: 'Driver', accessor: row => row.driverName, width: 60, excelWidth: 26 },
    { header: 'Items owed', accessor: row => row.itemsOwed, align: 'right', width: 24, excelWidth: 12 },
    { header: 'Price needed', accessor: row => row.itemsNeedingPrice, align: 'right', width: 24, excelWidth: 12 },
    { header: 'Losses (GH₵)', accessor: row => row.owed.toFixed(2), align: 'right', width: 30, excelWidth: 14 },
    { header: 'Paid (GH₵)', accessor: row => row.paid.toFixed(2), align: 'right', width: 30, excelWidth: 14 },
    { header: 'Balance (GH₵)', accessor: row => row.balance.toFixed(2), align: 'right', width: 30, excelWidth: 14 }
  ]

  return (
    <div className='flex flex-col gap-6'>
      <Grid container spacing={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label='Total losses charged' value={formatPrice(totals.owed)} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label='Paid back' value={formatPrice(totals.paid)} color='success.main' />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label='Still owed'
            value={formatPrice(totals.balance)}
            hint={`${totals.owing} driver${totals.owing === 1 ? '' : 's'} owing`}
            color={totals.balance > 0 ? 'error.main' : undefined}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label='Items without a price'
            value={String(totals.needingPrice)}
            hint='Count as nothing until priced'
            color={totals.needingPrice > 0 ? 'warning.main' : undefined}
          />
        </Grid>
      </Grid>

      <Card>
        <CardContent className='flex flex-wrap items-center gap-4'>
          <TextField
            size='small'
            placeholder='Search drivers…'
            value={search}
            onChange={e => setSearch(e.target.value)}
            className='min-is-[220px]'
          />
          <FormControlLabel
            control={<Switch checked={owingOnly} onChange={e => setOwingOnly(e.target.checked)} />}
            label='Only drivers with something outstanding'
          />
          <div className='flex-1' />
          <Button variant='outlined' startIcon={<i className='ri-refresh-line' />} onClick={load} disabled={loading}>
            Refresh
          </Button>
          <Button
            variant='outlined'
            startIcon={<i className='ri-download-2-line' />}
            onClick={() => setExportOpen(true)}
            disabled={visible.length === 0}
          >
            Export
          </Button>
        </CardContent>

        {loading ? (
          <CardContent className='flex items-center justify-center gap-3 py-12'>
            <CircularProgress size={24} />
            <Typography color='text.secondary'>Loading the loss sheet…</Typography>
          </CardContent>
        ) : visible.length === 0 ? (
          <CardContent className='flex flex-col items-center gap-2 py-12'>
            <i className='ri-checkbox-circle-line text-5xl text-success' />
            <Typography>{rows.length === 0 ? 'No losses recorded yet' : 'No driver matches'}</Typography>
            <Typography variant='body2' color='text.secondary' className='text-center'>
              Shortages confirmed in Manifest Review, and losses added on a trip&apos;s Losses tab, show up here.
            </Typography>
          </CardContent>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Driver</TableCell>
                  <TableCell align='right'>Items owed</TableCell>
                  <TableCell align='right'>Losses</TableCell>
                  <TableCell align='right'>Paid</TableCell>
                  <TableCell align='right'>Balance</TableCell>
                  <TableCell>Last payment</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.map(row => (
                  <TableRow key={row.driverId} hover>
                    <TableCell>
                      <Typography component={Link} href={`/edms/losses/${row.driverId}`} color='primary' className='font-medium'>
                        {row.driverName}
                      </Typography>
                      {row.itemsNeedingPrice > 0 && (
                        <Chip
                          size='small'
                          variant='outlined'
                          color='warning'
                          className='ml-2'
                          label={`${row.itemsNeedingPrice} need${row.itemsNeedingPrice === 1 ? 's' : ''} a price`}
                        />
                      )}
                    </TableCell>
                    <TableCell align='right'>{row.itemsOwed}</TableCell>
                    <TableCell align='right'>{formatPrice(row.owed)}</TableCell>
                    <TableCell align='right'>{formatPrice(row.paid)}</TableCell>
                    <TableCell align='right'>
                      <Typography
                        className='font-medium'
                        color={row.balance > 0 ? 'error.main' : row.balance < 0 ? 'success.main' : 'text.primary'}
                      >
                        {row.balance < 0 ? `${formatPrice(-row.balance)} credit` : formatPrice(row.balance)}
                      </Typography>
                    </TableCell>
                    <TableCell>{day(row.lastPaymentDate)}</TableCell>
                    <TableCell align='right'>
                      <Button size='small' component={Link} href={`/edms/losses/${row.driverId}`}>
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <GenericTableExportDialog
        open={exportOpen}
        setOpen={setExportOpen}
        title='Driver Loss Sheet'
        data={visible}
        columns={exportColumns}
        summaryItems={[
          { label: 'Total losses', value: formatPrice(totals.owed) },
          { label: 'Paid back', value: formatPrice(totals.paid) },
          { label: 'Still owed', value: formatPrice(totals.balance) }
        ]}
        fileName='driver-loss-sheet'
      />
    </div>
  )
}

export default LossSheet
