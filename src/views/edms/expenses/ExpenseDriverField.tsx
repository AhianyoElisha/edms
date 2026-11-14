'use client'

// React Imports
import { useEffect, useMemo, useState } from 'react'

// MUI Imports
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'

// Third-party Imports
import dayjs from 'dayjs'

// Action Imports
import { getUserList } from '@/libs/actions/user.actions'
import { getVehicleAssignments } from '@/libs/actions/vehicleassignment.actions'

// Util Imports
import { assignmentOn } from '@/utils/vehicleCustody'
import type { VehicleAssignment } from '@/utils/vehicleCustody'

export type ExpenseDriver = { id: string; name: string }

type Props = {
  vehicleId: string

  /** ISO date of the expense; empty while the date is being typed */
  expenseDate: string
  value: ExpenseDriver | null

  /** True until someone picks a driver by hand; while true the field follows the vehicle and date */
  auto: boolean
  onChange: (driver: ExpenseDriver | null, auto: boolean) => void
  disabled?: boolean
}

/**
 * The driver an expense was for. Filled in with whoever had the vehicle on the
 * expense date - not whoever has it today - and saved on the expense, so it does not
 * move when the vehicle is handed to another driver.
 */
const ExpenseDriverField = ({ vehicleId, expenseDate, value, auto, onChange, disabled }: Props) => {
  const [drivers, setDrivers] = useState<ExpenseDriver[]>([])
  const [assignments, setAssignments] = useState<VehicleAssignment[] | null>(null)

  useEffect(() => {
    getUserList()
      .then(response =>
        setDrivers(
          (((response as any)?.rows || (response as any)?.documents || []) as any[])
            .filter((user: any) => user.role?.name === 'driver' && user.status !== 'deleted')
            .map((user: any) => ({ id: user.$id, name: user.name || 'Unnamed driver' }))
            .sort((a: ExpenseDriver, b: ExpenseDriver) => a.name.localeCompare(b.name))
        )
      )
      .catch(error => console.error('Error loading drivers:', error))

    getVehicleAssignments().then(setAssignments)
  }, [])

  const held = useMemo(
    () => (assignments && vehicleId ? assignmentOn(assignments, vehicleId, expenseDate) : null),
    [assignments, vehicleId, expenseDate]
  )

  // Follow the vehicle and date until a driver is chosen by hand
  useEffect(() => {
    // A half-typed date says nothing about the driver, so leave the field as it is
    if (!auto || !assignments || !expenseDate) return

    const suggested = held ? { id: held.driverId, name: held.driverName || 'Unnamed driver' } : null

    if ((suggested?.id || '') !== (value?.id || '')) onChange(suggested, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, assignments, held, expenseDate])

  // A driver who has since been removed still has to show on their old expenses
  const options = useMemo(
    () => (value && !drivers.some(d => d.id === value.id) ? [value, ...drivers] : drivers),
    [drivers, value]
  )

  const day = dayjs(expenseDate).format('D MMM YYYY')

  const helperText = !vehicleId
    ? 'Optional. Pick a vehicle and this fills in with whoever had it on the expense date.'
    : !assignments || !expenseDate
      ? ''
      : !held
        ? `Nobody is recorded as having this vehicle on ${day}. Pick the driver if the expense was for one.`
        : value?.id === held.driverId
          ? `Had this vehicle on ${day}. Change it if the expense was for someone else.`
          : `${held.driverName || 'Another driver'} had this vehicle on ${day}.`

  return (
    <Autocomplete
      fullWidth
      disabled={disabled}
      options={options}
      value={value}
      onChange={(_, selected) => onChange(selected, false)}
      getOptionLabel={option => option.name}
      isOptionEqualToValue={(option, selected) => option.id === selected.id}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          {option.name}
        </li>
      )}
      renderInput={params => <TextField {...params} label='Driver' placeholder='Search driver…' helperText={helperText} />}
      noOptionsText='No driver matches'
    />
  )
}

export default ExpenseDriverField
