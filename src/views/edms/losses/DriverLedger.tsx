'use client'

// React Imports
import { tripLabel as tripLabelText } from '@/utils/tripLabel'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'

// Next Imports
import Link from 'next/link'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
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
import PaymentDialog from './PaymentDialog'
import LossItemDialog from './LossItemDialog'
import { LossStatusChip, LossValue } from './LossBits'

// Action Imports
import {
  deleteLossPayment,
  getDriverNames,
  getLossesForDriver,
  getPaymentsForDriver,
  getTripInfo,
  lossTotals,
  needsPrice,
  owedValue,
  paymentMethodLabel
} from '@/libs/actions/driverloss.actions'
import type { LossTripInfo } from '@/libs/actions/driverloss.actions'

// Hook Imports
import { useLossAccess } from './lossAccess'

// Type Imports
import type { DriverLossPaymentType, DriverLossType } from '@/types/apps/deliveryTypes'

// Util Imports
import { formatPrice } from '@/utils/dateAndCurrency'

const day = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

type View = 'items' | 'payments' | 'statement'

interface StatementLine {
  date: string
  entry: string
  trip: string
  charge: number
  payment: number
  balance: number
}

/**
 * One driver's loss sheet: every lost item by trip, every payment, and a running
 * statement of what they owe. The office records payments here; a driver sees the
 * same page for themselves, read-only.
 */
const DriverLedger = ({ driverId }: { driverId: string }) => {
  const { canManage, isDriver, actorName } = useLossAccess()

  const [driverName, setDriverName] = useState('')
  const [losses, setLosses] = useState<DriverLossType[]>([])
  const [payments, setPayments] = useState<DriverLossPaymentType[]>([])
  const [trips, setTrips] = useState<Record<string, LossTripInfo>>({})
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('items')
  const [showCleared, setShowCleared] = useState(false)
  const [paying, setPaying] = useState(false)
  const [editing, setEditing] = useState<DriverLossType | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)

      const [names, driverLosses, driverPayments] = await Promise.all([
        getDriverNames([driverId]),
        getLossesForDriver(driverId),
        getPaymentsForDriver(driverId)
      ])

      setDriverName(names[driverId] || 'Unknown driver')
      setLosses(driverLosses)
      setPayments(driverPayments)
      setTrips(await getTripInfo(Array.from(new Set(driverLosses.map(loss => loss.tripId)))))
    } catch (error) {
      console.error('Error loading driver ledger:', error)
      toast.error('Could not load this loss sheet')
    } finally {
      setLoading(false)
    }
  }, [driverId])

  useEffect(() => {
    load()
  }, [load])

  const totals = useMemo(() => lossTotals(losses, payments), [losses, payments])

  const tripLabel = (tripId: string) => trips[tripId]?.tripNumber || 'Trip'

  // Lost items grouped by trip, newest trip first
  const tripGroups = useMemo(() => {
    const shown = showCleared ? losses : losses.filter(loss => loss.status === 'owed')
    const groups = new Map<string, DriverLossType[]>()

    shown.forEach(loss => groups.set(loss.tripId, [...(groups.get(loss.tripId) || []), loss]))

    return Array.from(groups.entries())
      .map(([tripId, rows]) => ({ tripId, rows, date: trips[tripId]?.tripDate || rows[0]?.lossDate || '' }))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [losses, showCleared, trips])

  // Priced items still owed and every payment, oldest first, with a running balance
  const statement = useMemo<StatementLine[]>(() => {
    const entries = [
      ...losses
        .filter(loss => owedValue(loss) > 0)
        .map(loss => ({
          date: loss.lossDate || loss.$createdAt,
          entry: loss.description || 'Missing package',
          trip: tripLabelText(trips[loss.tripId]),
          charge: owedValue(loss),
          payment: 0
        })),
      ...payments.map(payment => ({
        date: payment.paidAt,
        entry: `Payment - ${paymentMethodLabel(payment.method)}${payment.reference ? ` (${payment.reference})` : ''}`,
        trip: '',
        charge: 0,
        payment: Number(payment.amount) || 0
      }))
    ].sort((a, b) => a.date.localeCompare(b.date) || b.charge - a.charge)

    let balance = 0

    return entries.map(entry => {
      balance = Math.round((balance + entry.charge - entry.payment) * 100) / 100

      return { ...entry, balance }
    })
  }, [losses, payments, trips])

  const handleDeletePayment = async (payment: DriverLossPaymentType) => {
    try {
      setDeletingId(payment.$id)
      await deleteLossPayment(payment.$id)
      toast.success('Payment removed')
      await load()
    } catch (error: any) {
      toast.error(error?.message || 'Could not remove the payment')
    } finally {
      setDeletingId(null)
    }
  }

  const exportColumns: ExportColumn[] = [
    { header: 'Date', accessor: row => day(row.date), width: 28, excelWidth: 14 },
    { header: 'Entry', accessor: row => row.entry, width: 70, excelWidth: 36 },
    { header: 'Trip', accessor: row => row.trip, width: 60, excelWidth: 44 },
    { header: 'Charged (GH₵)', accessor: row => (row.charge ? row.charge.toFixed(2) : ''), align: 'right', width: 28, excelWidth: 14 },
    { header: 'Paid (GH₵)', accessor: row => (row.payment ? row.payment.toFixed(2) : ''), align: 'right', width: 28, excelWidth: 14 },
    { header: 'Balance (GH₵)', accessor: row => row.balance.toFixed(2), align: 'right', width: 28, excelWidth: 14 }
  ]

  if (loading) {
    return (
      <Card>
        <CardContent className='flex items-center justify-center gap-3 py-16'>
          <CircularProgress size={24} />
          <Typography color='text.secondary'>Loading the loss sheet…</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className='flex flex-col gap-6'>
      <Card>
        <CardContent className='flex flex-wrap items-center gap-4'>
          <div className='flex-1 min-is-[200px]'>
            <Typography variant='h5'>{isDriver ? 'My losses' : driverName}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {totals.itemsOwed} item{totals.itemsOwed === 1 ? '' : 's'} owed
              {totals.itemsFound > 0 ? ` • ${totals.itemsFound} found and cleared` : ''}
              {payments.length > 0 ? ` • ${payments.length} payment${payments.length === 1 ? '' : 's'}` : ''}
            </Typography>
          </div>
          {!isDriver && (
            <Button variant='text' component={Link} href='/edms/losses' startIcon={<i className='ri-arrow-left-line' />}>
              All drivers
            </Button>
          )}
          <Button variant='outlined' startIcon={<i className='ri-download-2-line' />} onClick={() => setExportOpen(true)} disabled={statement.length === 0}>
            Statement
          </Button>
          {canManage && (
            <Button variant='contained' startIcon={<i className='ri-money-dollar-circle-line' />} onClick={() => setPaying(true)}>
              Record payment
            </Button>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={4}>
        {[
          { label: 'Losses charged', value: formatPrice(totals.owed) },
          { label: 'Paid so far', value: formatPrice(totals.paid), color: 'success.main' },
          {
            label: totals.balance < 0 ? 'In credit' : 'Left to pay',
            value: formatPrice(Math.abs(totals.balance)),
            color: totals.balance > 0 ? 'error.main' : 'success.main'
          }
        ].map(stat => (
          <Grid item xs={12} sm={4} key={stat.label}>
            <Card>
              <CardContent>
                <Typography variant='body2' color='text.secondary'>
                  {stat.label}
                </Typography>
                <Typography variant='h4' color={stat.color}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {totals.itemsNeedingPrice > 0 && (
        <Alert severity='warning'>
          {totals.itemsNeedingPrice} item{totals.itemsNeedingPrice === 1 ? ' has' : 's have'} no price yet and{' '}
          {totals.itemsNeedingPrice === 1 ? 'is' : 'are'} not in the total.
          {canManage ? ' Use the price tag next to each one.' : ''}
        </Alert>
      )}

      <Card>
        <Tabs value={view} onChange={(_, next) => setView(next)} variant='scrollable' allowScrollButtonsMobile>
          <Tab value='items' label={`Lost items (${totals.itemsOwed})`} icon={<i className='ri-box-3-line' />} iconPosition='start' />
          <Tab value='payments' label={`Payments (${payments.length})`} icon={<i className='ri-wallet-3-line' />} iconPosition='start' />
          <Tab value='statement' label='Statement' icon={<i className='ri-file-list-2-line' />} iconPosition='start' />
        </Tabs>

        {view === 'items' && (
          <>
            <CardContent className='pbe-0'>
              <FormControlLabel
                control={<Switch checked={showCleared} onChange={e => setShowCleared(e.target.checked)} />}
                label='Show found and written-off items'
              />
            </CardContent>
            {tripGroups.length === 0 ? (
              <CardContent className='flex flex-col items-center gap-2 py-10'>
                <i className='ri-checkbox-circle-line text-5xl text-success' />
                <Typography>Nothing owed</Typography>
              </CardContent>
            ) : (
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell align='right'>Value</TableCell>
                      <TableCell>Status</TableCell>
                      {canManage && <TableCell />}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tripGroups.map(group => (
                      <Fragment key={group.tripId}>
                        <TableRow className='bg-actionHover'>
                          <TableCell colSpan={canManage ? 4 : 3}>
                            <div className='flex flex-wrap items-center gap-2'>
                              <Typography component={Link} href={`/edms/trips/${group.tripId}`} color='primary' className='font-medium'>
                                {tripLabel(group.tripId)}
                              </Typography>
                              <Typography variant='body2' color='text.secondary'>
                                {day(group.date)}
                                {trips[group.tripId]?.routeName ? ` • ${trips[group.tripId].routeName}` : ''}
                                {trips[group.tripId]?.vehicleNumber ? ` • ${trips[group.tripId].vehicleNumber}` : ''}
                              </Typography>
                              <div className='flex-1' />
                              <Typography variant='body2' className='font-medium'>
                                {formatPrice(group.rows.reduce((sum, row) => sum + owedValue(row), 0))}
                              </Typography>
                            </div>
                          </TableCell>
                        </TableRow>
                        {group.rows.map(row => (
                          <TableRow key={row.$id} hover>
                            <TableCell className='pis-8'>
                              <Typography variant='body2' className={row.status === 'owed' ? '' : 'line-through'}>
                                {row.description || 'Missing package'}
                              </Typography>
                              {row.notes && (
                                <Typography variant='caption' color='text.secondary' className='block'>
                                  {row.notes}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align='right'>
                              <LossValue loss={row} />
                            </TableCell>
                            <TableCell>
                              <LossStatusChip loss={row} />
                            </TableCell>
                            {canManage && (
                              <TableCell align='right'>
                                {row.status === 'owed' && (
                                  <Tooltip title={needsPrice(row) ? 'Enter price' : 'Edit'}>
                                    <IconButton size='small' onClick={() => setEditing(row)}>
                                      <i className='ri-price-tag-3-line' />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {canManage && (
              <CardContent>
                <Typography variant='caption' color='text.secondary'>
                  To clear a missing package that was found, or to write a loss off, open the trip&apos;s Losses tab.
                </Typography>
              </CardContent>
            )}
          </>
        )}

        {view === 'payments' &&
          (payments.length === 0 ? (
            <CardContent className='flex flex-col items-center gap-2 py-10'>
              <i className='ri-wallet-3-line text-5xl text-textSecondary' />
              <Typography>No payments yet</Typography>
            </CardContent>
          ) : (
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>How</TableCell>
                    <TableCell>Reference</TableCell>
                    <TableCell align='right'>Amount</TableCell>
                    {!isDriver && <TableCell>Recorded by</TableCell>}
                    {canManage && <TableCell />}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.map(payment => (
                    <TableRow key={payment.$id} hover>
                      <TableCell>{day(payment.paidAt)}</TableCell>
                      <TableCell>{paymentMethodLabel(payment.method)}</TableCell>
                      <TableCell>
                        {payment.reference || '—'}
                        {payment.notes && (
                          <Typography variant='caption' color='text.secondary' className='block'>
                            {payment.notes}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align='right' className='font-medium'>
                        {formatPrice(Number(payment.amount))}
                      </TableCell>
                      {!isDriver && <TableCell>{payment.recordedBy || '—'}</TableCell>}
                      {canManage && (
                        <TableCell align='right'>
                          <Tooltip title='Remove (recorded by mistake)'>
                            <IconButton
                              size='small'
                              color='error'
                              onClick={() => handleDeletePayment(payment)}
                              disabled={deletingId === payment.$id}
                            >
                              {deletingId === payment.$id ? <CircularProgress size={16} /> : <i className='ri-delete-bin-line' />}
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ))}

        {view === 'statement' &&
          (statement.length === 0 ? (
            <CardContent className='flex flex-col items-center gap-2 py-10'>
              <Typography>Nothing to show yet</Typography>
              <Typography variant='body2' color='text.secondary'>
                Priced losses and payments appear here in date order.
              </Typography>
            </CardContent>
          ) : (
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Entry</TableCell>
                    <TableCell>Trip</TableCell>
                    <TableCell align='right'>Charged</TableCell>
                    <TableCell align='right'>Paid</TableCell>
                    <TableCell align='right'>Balance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {statement.map((line, index) => (
                    <TableRow key={index} hover>
                      <TableCell>{day(line.date)}</TableCell>
                      <TableCell>{line.entry}</TableCell>
                      <TableCell>{line.trip || '—'}</TableCell>
                      <TableCell align='right'>{line.charge ? formatPrice(line.charge) : ''}</TableCell>
                      <TableCell align='right' className='text-success'>
                        {line.payment ? formatPrice(line.payment) : ''}
                      </TableCell>
                      <TableCell align='right' className='font-medium'>
                        {formatPrice(line.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ))}
      </Card>

      {canManage && (
        <PaymentDialog
          open={paying}
          onClose={() => setPaying(false)}
          driverId={driverId}
          driverName={driverName}
          balance={totals.balance}
          actorName={actorName}
          onSaved={load}
        />
      )}
      {canManage && (
        <LossItemDialog open={Boolean(editing)} onClose={() => setEditing(null)} loss={editing} actorName={actorName} onSaved={load} />
      )}

      <GenericTableExportDialog
        open={exportOpen}
        setOpen={setExportOpen}
        title={`Loss Statement - ${driverName}`}
        data={statement}
        columns={exportColumns}
        summaryItems={[
          { label: 'Driver', value: driverName },
          { label: 'Losses charged', value: formatPrice(totals.owed) },
          { label: 'Paid so far', value: formatPrice(totals.paid) },
          { label: totals.balance < 0 ? 'In credit' : 'Left to pay', value: formatPrice(Math.abs(totals.balance)) },
          ...(totals.itemsNeedingPrice > 0
            ? [{ label: 'Items not yet priced', value: String(totals.itemsNeedingPrice) }]
            : [])
        ]}
        fileName={`loss-statement-${driverName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
      />
    </div>
  )
}

export default DriverLedger
