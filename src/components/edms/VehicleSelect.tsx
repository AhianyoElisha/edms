'use client'

// React Imports
import { useMemo } from 'react'
import type { Ref } from 'react'

// MUI Imports
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

// Util Imports
import { matchesVehicleSearch, vehicleDriverName, vehicleLabel } from '@/utils/fleetIdentity'

type VehicleRow = {
  $id: string
  vehicleNumber?: string
  vehicleType?: string
  brand?: string
  model?: string
  driver?: any
}

type Props<V extends VehicleRow> = {
  vehicles: V[]

  /** Id of the chosen vehicle, or '' */
  value: string
  onChange: (vehicleId: string, vehicle: V | null) => void
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  loading?: boolean
  size?: 'small' | 'medium'
  error?: boolean
  helperText?: string
  noOptionsText?: string
  inputRef?: Ref<HTMLInputElement>
}

/**
 * The one vehicle picker used across the app. Each vehicle is listed with the driver
 * assigned to it, and typing a driver's name finds their vehicle just as typing the
 * number plate does.
 */
const VehicleSelect = <V extends VehicleRow>({
  vehicles,
  value,
  onChange,
  label = 'Vehicle',
  placeholder = 'Search by vehicle number or driver…',
  required,
  disabled,
  loading,
  size,
  error,
  helperText,
  noOptionsText = 'No vehicle matches',
  inputRef
}: Props<V>) => {
  // In plate order, so a vehicle sits in the same place every time
  const options = useMemo(
    () =>
      [...vehicles].sort((a, b) =>
        (a.vehicleNumber || '').localeCompare(b.vehicleNumber || '', undefined, { numeric: true })
      ),
    [vehicles]
  )

  return (
    <Autocomplete
      fullWidth
      size={size}
      disabled={disabled}
      loading={loading}
      options={options}
      value={options.find(v => v.$id === value) || null}
      onChange={(_, selected) => onChange(selected?.$id || '', selected)}
      getOptionLabel={v => vehicleLabel(v.vehicleNumber, vehicleDriverName(v))}
      isOptionEqualToValue={(option, selected) => option.$id === selected.$id}
      filterOptions={(all, state) =>
        all.filter(v =>
          matchesVehicleSearch(state.inputValue, {
            vehicleNumber: v.vehicleNumber,
            driverName: vehicleDriverName(v),
            extra: [v.brand, v.model].filter(Boolean).join(' ')
          })
        )
      }
      renderOption={(props, vehicle) => {
        const driverName = vehicleDriverName(vehicle)
        const makeModel = [vehicle.brand, vehicle.model].filter(Boolean).join(' ')

        return (
          <li {...props} key={vehicle.$id}>
            <div>
              <Typography variant='body1'>{vehicle.vehicleNumber || 'Unnamed vehicle'}</Typography>
              <Typography variant='caption' color={driverName ? 'text.primary' : 'text.secondary'}>
                {driverName ? `Driver: ${driverName}` : 'No driver assigned'}
                {makeModel ? ` · ${makeModel}` : ''}
              </Typography>
            </div>
          </li>
        )
      }}
      renderInput={params => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          required={required}
          error={error}
          helperText={helperText}
          inputRef={inputRef}
        />
      )}
      noOptionsText={noOptionsText}
    />
  )
}

export default VehicleSelect
