/**
 * A trip number alone (TRP-261126-0013) says nothing about which trip it is, so
 * wherever a trip number is shown it is followed by what does: the route, and the
 * vehicle (which tells apart two trips on the same route on the same day).
 *
 * Accepts a trip in any of the shapes the app holds one in: with `route` / `vehicle`
 * expanded to objects, or with the names already flattened onto it.
 */

type TripLike = {
  tripNumber?: string | null
  $id?: string
  route?: unknown
  vehicle?: unknown
  routeName?: string | null
  vehicleNumber?: string | null
} | null | undefined

const field = (value: unknown, key: string): string => {
  if (value && typeof value === 'object' && typeof (value as any)[key] === 'string') return (value as any)[key].trim()

  return ''
}

/** The trip's route name, or '' when it is not known */
export const tripRouteName = (trip: TripLike): string => (trip ? field(trip.route, 'routeName') || (trip.routeName || '').trim() : '')

/** The trip's vehicle number, or '' when it is not known */
export const tripVehicleNumber = (trip: TripLike): string =>
  trip ? field(trip.vehicle, 'vehicleNumber') || (trip.vehicleNumber || '').trim() : ''

/** "GH-Primary-Tema (Route A) · GR 841-10": what identifies the trip, or '' */
export const tripSubtitle = (trip: TripLike): string => [tripRouteName(trip), tripVehicleNumber(trip)].filter(Boolean).join(' · ')

/** "TRP-261126-0008 — GH-Primary-Tema (Route A) · GR 841-10", for text-only places (exports, pickers, messages) */
export const tripLabel = (trip: TripLike, fallback = 'Trip'): string => {
  const number = trip?.tripNumber || fallback
  const subtitle = tripSubtitle(trip)

  return subtitle ? `${number} — ${subtitle}` : number
}

/** The relationship fields to add to an Appwrite Query.select under `prefix` (e.g. 'trip.') */
export const tripLabelSelect = (prefix = '') => [`${prefix}route.routeName`, `${prefix}vehicle.vehicleNumber`]
