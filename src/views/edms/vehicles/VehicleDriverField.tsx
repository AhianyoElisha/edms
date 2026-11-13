'use client'

// React Imports
import { useEffect, useMemo, useState } from 'react'

// MUI Imports
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

// Actions
import { getLogisticsList, getUserList } from '@/libs/actions/customer.action'

// Utils
import { vehicleDriverId } from '@/utils/fleetIdentity'

type Props = {
  /** Selected driver's user id ('' for none) */
  value: string
  onChange: (driverId: string) => void

  /** The vehicle being edited, so its own driver is not reported as "on another vehicle" */
  vehicleId?: string

  /** Reload the lists whenever this turns true (the drawer opening) */
  open?: boolean
  error?: string
  label?: string
}

/**
 * Picks the driver assigned to a vehicle.
 *
 * Lists current drivers only (people removed from the system are left out) and says
 * which vehicle each one is on. Picking a driver who is on another vehicle is fine:
 * saving moves them, and the field says so before the user commits.
 */
const VehicleDriverField = ({ value, onChange, vehicleId, open = true, error, label = 'Assigned Driver' }: Props) => {
  const [drivers, setDrivers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return

    let cancelled = false

    const load = async () => {
      setLoading(true)

      try {
        const [users, fleet] = await Promise.all([getUserList(), getLogisticsList()])

        if (cancelled) return
        setDrivers((users?.rows || []).filter((u: any) => u.role?.name === 'driver'))
        setVehicles(fleet?.rows || [])
      } catch (e) {
        console.error('Error loading drivers:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [open])

  // driver id -> the other vehicle they are assigned to
  const vehicleByDriver = useMemo(() => {
    const map = new Map<string, any>()

    vehicles.forEach(v => {
      const id = vehicleDriverId(v)

      if (id && v.$id !== vehicleId) map.set(id, v)
    })

    return map
  }, [vehicles, vehicleId])

  const selected = drivers.find(d => d.$id === value) || null
  const movingFrom = selected ? vehicleByDriver.get(selected.$id) : null

  // The saved driver is no longer a current driver (removed from the system)
  const staleDriver = !!value && !loading && drivers.length > 0 && !selected

  return (
    <Autocomplete
      value={selected}
      onChange={(_, next) => onChange(next?.$id || '')}
      options={drivers}
      loading={loading}
      getOptionLabel={option => option.name || 'Unnamed driver'}
      isOptionEqualToValue={(option, current) => option.$id === current.$id}
      renderOption={(props, option) => {
        const current = vehicleByDriver.get(option.$id)

        return (
          <li {...props} key={option.$id}>
            <div>
              <Typography variant='body1'>{option.name}</Typography>
              <Typography variant='caption' color='text.secondary'>
                {current ? `Currently on ${current.vehicleNumber}` : 'No vehicle assigned'}
                {option.phone ? ` · ${option.phone}` : ''}
              </Typography>
            </div>
          </li>
        )
      }}
      renderInput={params => (
        <TextField
          {...params}
          label={label}
          placeholder='Select a driver'
          error={!!error}
          helperText={
            error ||
            (movingFrom
              ? `${selected?.name} is currently on ${movingFrom.vehicleNumber}. Saving moves them to this vehicle.`
              : staleDriver
                ? 'The driver saved on this vehicle is no longer in the system. Pick the current driver.'
                : 'Leave empty if nobody is assigned. A driver can be on one vehicle at a time.')
          }
          FormHelperTextProps={movingFrom || staleDriver ? { sx: { color: 'warning.main' } } : undefined}
        />
      )}
    />
  )
}

export default VehicleDriverField
