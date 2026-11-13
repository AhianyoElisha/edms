/**
 * Helpers for telling whether two vehicle or people records are the same thing
 * written differently ("gt 596-22", "GT596 22", "GT 596-22 " are one plate).
 */

/** Comparison key for a number plate: letters and digits only, upper case. */
export const vehicleKey = (vehicleNumber?: string | null) =>
  (vehicleNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

/** How a plate is stored: upper case, single spaces, no padding. */
export const formatVehicleNumber = (vehicleNumber?: string | null) =>
  (vehicleNumber || '').toUpperCase().replace(/\s+/g, ' ').trim()

/** Comparison key for a person's name: case, punctuation and word order ignored. */
export const personNameKey = (name?: string | null) =>
  (name || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ')

/** Comparison key for a phone number: digits only, with +233 / 0 prefixes dropped. */
export const phoneKey = (phone?: string | null) =>
  (phone || '')
    .replace(/\D/g, '')
    .replace(/^233/, '')
    .replace(/^0+/, '')

export const emailKey = (email?: string | null) => (email || '').toLowerCase().trim()

/** The driver linked to a vehicle row, whether the relationship was expanded or not. */
export const vehicleDriverId = (vehicle: any): string | null => {
  const driver = vehicle?.driver

  if (!driver) return null

  return typeof driver === 'object' ? driver.$id || null : driver
}
