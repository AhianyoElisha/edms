/**
 * Who had a vehicle, and when.
 *
 * Every time a vehicle's driver changes, the outgoing driver's period is closed and a
 * new one is opened, so the question "who was driving this on the 3rd?" has an answer
 * long after the vehicle has passed to someone else.
 */

export type VehicleAssignment = {
  $id: string
  vehicleId: string
  vehicleNumber?: string
  driverId: string
  driverName?: string

  /** ISO date the driver took the vehicle */
  startedAt: string

  /** ISO date they handed it over; empty while they still have it */
  endedAt?: string | null

  /** 'recorded' = logged when the change was made, 'trips' = worked out from old trips */
  source?: string
  changedBy?: string
}

const time = (value?: string | null) => (value ? new Date(value).getTime() : NaN)

/** The period covering `date` for a vehicle, if any. */
export const assignmentOn = (assignments: VehicleAssignment[], vehicleId: string, date: string) => {
  const at = time(date)

  if (!vehicleId || Number.isNaN(at)) return null

  let found: VehicleAssignment | null = null

  for (const assignment of assignments) {
    if (assignment.vehicleId !== vehicleId) continue

    const start = time(assignment.startedAt)
    const end = time(assignment.endedAt)

    if (at < start || (!Number.isNaN(end) && at >= end)) continue

    // Should periods overlap, the one that started last is the handover that counts
    if (!found || start > time(found.startedAt)) found = assignment
  }

  return found
}

/** A vehicle's periods, newest first. */
export const assignmentsOf = (assignments: VehicleAssignment[], vehicleId: string) =>
  assignments.filter(a => a.vehicleId === vehicleId).sort((a, b) => time(b.startedAt) - time(a.startedAt))

/** "AW 3773-26", "aw3773 - 26" and "AW-3773-26" are the same plate. */
export const normalizePlate = (value?: string | null) => (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
