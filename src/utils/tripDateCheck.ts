/**
 * Catches a mistyped trip date before it is saved.
 *
 * A wrong year (2027 for 2026, 2926, 2023) puts a trip outside every monthly report
 * and invoice without anyone noticing. Trips are entered on the day or a few days
 * after, so a date far from today is almost always a slip of the keyboard.
 */

const DAY = 24 * 60 * 60 * 1000

/** Trips can be planned a little ahead, but not next year */
export const TRIP_DATE_MAX_DAYS_AHEAD = 7

/** Older than this cannot be saved; it has to be a wrong year */
export const TRIP_DATE_MAX_DAYS_BACK = 365

/** Older than this is allowed, with a prompt to check it */
export const TRIP_DATE_WARN_DAYS_BACK = 60

export type TripDateCheck = { level: 'error' | 'warning'; message: string } | null

export const checkTripDate = (value?: string | null, now: Date = new Date()): TripDateCheck => {
  if (!value) return null

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return { level: 'error', message: 'Enter a valid date and time.' }

  const days = (date.getTime() - now.getTime()) / DAY
  const year = date.getFullYear()

  if (days > TRIP_DATE_MAX_DAYS_AHEAD) {
    return {
      level: 'error',
      message:
        year !== now.getFullYear()
          ? `The year is ${year}. Check the date: a trip cannot be more than ${TRIP_DATE_MAX_DAYS_AHEAD} days ahead.`
          : `This is ${Math.round(days)} days from now. A trip cannot be more than ${TRIP_DATE_MAX_DAYS_AHEAD} days ahead.`
    }
  }

  if (days < -TRIP_DATE_MAX_DAYS_BACK) {
    return { level: 'error', message: `The year is ${year}. Check the date: it is more than a year ago.` }
  }

  if (days < -TRIP_DATE_WARN_DAYS_BACK) {
    return {
      level: 'warning',
      message: `This is ${Math.round(-days)} days ago. Check the month and year are right; you can still save it.`
    }
  }

  return null
}
