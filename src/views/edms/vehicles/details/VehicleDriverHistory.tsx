'use client'

// React Imports
import { useEffect, useMemo, useState } from 'react'

// Next Imports
import Link from 'next/link'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

// Third-party Imports
import dayjs from 'dayjs'

// Action Imports
import { getAllExpenses } from '@/libs/actions/expense.actions'
import { getVehicleAssignments } from '@/libs/actions/vehicleassignment.actions'

// Type Imports
import type { ExpenseType } from '@/types/apps/deliveryTypes'

// Util Imports
import { assignmentsOf, normalizePlate } from '@/utils/vehicleCustody'
import type { VehicleAssignment } from '@/utils/vehicleCustody'

type Props = {
  vehicleId: string
  vehicleNumber?: string

  /** Changes when the vehicle is edited, so a new driver shows up straight away */
  refreshKey?: unknown
}

const formatDay = (value?: string | null) => (value ? dayjs(value).format('D MMM YYYY') : '')
const money = (value: number) =>
  new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 }).format(value)

const expensesLink = (vehicleNumber: string | undefined, from?: string | null, to?: string | null) => {
  const params = new URLSearchParams()

  if (vehicleNumber) params.set('vehicle', vehicleNumber)
  if (from) params.set('dateFrom', dayjs(from).format('YYYY-MM-DD'))
  if (to) params.set('dateTo', dayjs(to).format('YYYY-MM-DD'))

  return `/edms/expenses?${params.toString()}`
}

/**
 * Who has had this vehicle and when, with what was spent on it during each
 * driver's time. Expenses stay with the period they fall in when the vehicle
 * moves to a new driver.
 */
const VehicleDriverHistory = ({ vehicleId, vehicleNumber, refreshKey }: Props) => {
  const [periods, setPeriods] = useState<VehicleAssignment[]>([])
  const [expenses, setExpenses] = useState<ExpenseType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    Promise.all([getVehicleAssignments(vehicleId), getAllExpenses().catch(() => [] as ExpenseType[])])
      .then(([assignments, allExpenses]) => {
        if (!active) return

        const plate = normalizePlate(vehicleNumber)

        setPeriods(assignmentsOf(assignments, vehicleId))

        // Linked to the vehicle, or naming its plate in the description as most do
        setExpenses(
          allExpenses.filter(
            expense =>
              expense.vehicleId === vehicleId ||
              (plate.length >= 5 && normalizePlate(`${expense.description || ''} ${expense.vendor || ''}`).includes(plate))
          )
        )
      })
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [vehicleId, vehicleNumber, refreshKey])

  const rows = useMemo(() => {
    const remaining = new Set(expenses)

    const withTotals = periods.map(period => {
      const start = new Date(period.startedAt).getTime()
      const end = period.endedAt ? new Date(period.endedAt).getTime() : Infinity

      const inPeriod = expenses.filter(expense => {
        const at = new Date(expense.expenseDate).getTime()

        return remaining.has(expense) && at >= start && at < end
      })

      inPeriod.forEach(expense => remaining.delete(expense))

      return { period, count: inPeriod.length, total: inPeriod.reduce((sum, expense) => sum + (expense.amount || 0), 0) }
    })

    const outside = [...remaining]

    return { withTotals, outsideCount: outside.length, outsideTotal: outside.reduce((sum, e) => sum + (e.amount || 0), 0) }
  }, [periods, expenses])

  return (
    <Card>
      <CardHeader
        title='Driver History'
        subheader='Who has had this vehicle, and what was spent on it during their time'
      />
      {loading ? (
        <CardContent>
          <Typography color='text.secondary'>Loading driver history...</Typography>
        </CardContent>
      ) : periods.length === 0 && rows.outsideCount === 0 ? (
        <CardContent>
          <Typography color='text.secondary'>
            No driver has been recorded for this vehicle yet. The history starts the next time a driver is assigned.
          </Typography>
        </CardContent>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Driver</TableCell>
                <TableCell>From</TableCell>
                <TableCell>To</TableCell>
                <TableCell align='right'>Expenses</TableCell>
                <TableCell align='right'>Amount</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.withTotals.map(({ period, count, total }) => (
                <TableRow key={period.$id} hover>
                  <TableCell>
                    <Typography variant='body2' className='font-medium'>
                      {period.driverName || 'Unnamed driver'}
                    </Typography>
                    {period.source === 'trips' ? (
                      <Typography variant='caption' color='text.secondary'>
                        From trip records
                      </Typography>
                    ) : period.changedBy ? (
                      <Typography variant='caption' color='text.secondary'>
                        Assigned by {period.changedBy}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell>{formatDay(period.startedAt)}</TableCell>
                  <TableCell>
                    {period.endedAt ? formatDay(period.endedAt) : <Chip label='Current' color='success' size='small' variant='tonal' />}
                  </TableCell>
                  <TableCell align='right'>{count}</TableCell>
                  <TableCell align='right'>{count ? money(total) : '-'}</TableCell>
                  <TableCell align='right'>
                    {count > 0 && (
                      <Button
                        size='small'
                        component={Link}
                        href={expensesLink(vehicleNumber, period.startedAt, period.endedAt)}
                      >
                        View
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {rows.outsideCount > 0 && (
                <TableRow hover>
                  <TableCell colSpan={3}>
                    <Typography variant='body2' color='text.secondary'>
                      No driver recorded on the expense date
                    </Typography>
                  </TableCell>
                  <TableCell align='right'>{rows.outsideCount}</TableCell>
                  <TableCell align='right'>{money(rows.outsideTotal)}</TableCell>
                  <TableCell align='right'>
                    <Button size='small' component={Link} href={expensesLink(vehicleNumber)}>
                      View all
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Card>
  )
}

export default VehicleDriverHistory
