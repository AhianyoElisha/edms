'use client'

// React Imports
import { useEffect, useState } from 'react'

// Action Imports
import { getAllVehicles } from '@/libs/actions/vehicle.actions'

// Util Imports
import { vehicleDriverName } from '@/utils/fleetIdentity'

const EMPTY = new Map<string, string>()

// One fetch shared by every vehicle filter on the page
let pending: Promise<Map<string, string>> | null = null

const loadVehicleDrivers = () => {
  if (!pending) {
    pending = getAllVehicles()
      .then(vehicles => {
        const names = new Map<string, string>()

        vehicles.forEach(vehicle => {
          const driverName = vehicleDriverName(vehicle)

          if (driverName) names.set(vehicle.$id, driverName)
        })

        return names
      })
      .catch(() => {
        // Try again next time rather than remembering the failure
        pending = null

        return EMPTY
      })
  }

  return pending
}

/** Vehicle id → name of the driver assigned to it, for showing drivers beside vehicles in filters. */
export const useVehicleDrivers = () => {
  const [drivers, setDrivers] = useState(EMPTY)

  useEffect(() => {
    let active = true

    // Assignments change, so each page visit asks again
    pending = null
    loadVehicleDrivers().then(names => active && setDrivers(names))

    return () => {
      active = false
    }
  }, [])

  return drivers
}
