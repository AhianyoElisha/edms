'use client'

// React Imports
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// Next Imports
import { useSearchParams } from 'next/navigation'

// Third-party Imports
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'

type ParamUpdates = Record<string, string | null | undefined>

/**
 * List filters live in the URL so a filtered view survives a reload and can be shared.
 *
 * Write them with `setParams`, never with `router.replace`:
 *  - `router.replace` asks the server to re-render the route for every change, so a
 *    filter took 250-400 ms to land. `history.replaceState` updates the URL (and
 *    `useSearchParams`) with no request.
 *  - It reads the address bar at call time, so two updates in a row build on each
 *    other. Building from the `searchParams` of the last render made the second
 *    update overwrite the first (that is why "Clear Dates" cleared nothing).
 */
export function useUrlFilters() {
  const searchParams = useSearchParams()

  const setParams = useCallback((updates: ParamUpdates) => {
    const params = new URLSearchParams(window.location.search)

    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value)
      else params.delete(key)
    })

    const next = params.toString()

    if (next === window.location.search.replace(/^\?/, '')) return

    window.history.replaceState(null, '', next ? `${window.location.pathname}?${next}` : window.location.pathname)
  }, [])

  const setParam = useCallback((key: string, value: string) => setParams({ [key]: value }), [setParams])

  return { searchParams, setParam, setParams }
}

/**
 * A text filter that is typed locally and written to the URL once typing pauses.
 *
 * Binding the input straight to the URL value drops characters: the URL updates a
 * moment after each keystroke, and until it does the input is re-rendered with the
 * old text, so the next key lands on stale content.
 *
 * Returns `[inputValue, onInputChange]`. Keep filtering by the URL value.
 */
export function useDebouncedUrlText(urlValue: string, commit: (value: string) => void, delay = 300) {
  const [value, setValue] = useState(urlValue)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  // Values we wrote ourselves and have not yet seen come back through the URL
  const inFlight = useRef<string[]>([])

  // Latest URL value for the timer callback, without re-creating `onChange` on every URL change
  const urlValueRef = useRef(urlValue)

  urlValueRef.current = urlValue

  useEffect(() => {
    const index = inFlight.current.lastIndexOf(urlValue)

    if (index !== -1) {
      // Our own write (or an older one of ours) arriving: the input is already ahead of it
      inFlight.current = inFlight.current.slice(index + 1)

      return
    }

    // Changed from outside: back/forward, a link, or a "clear filters" button
    inFlight.current = []
    clearTimeout(timer.current)
    setValue(urlValue)
  }, [urlValue])

  useEffect(() => () => clearTimeout(timer.current), [])

  const onChange = useCallback(
    (next: string) => {
      setValue(next)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        if (next === urlValueRef.current) return
        inFlight.current.push(next)
        commit(next)
      }, delay)
    },
    [commit, delay]
  )

  return [value, onChange] as const
}

// A half-typed year reads as a real date (typing "2" gives year 0002); don't filter on those
const MIN_YEAR = 2000
const MAX_YEAR = 2100

/**
 * A date filter stored in the URL as YYYY-MM-DD.
 *
 *  - `applied` is the date to filter by. It keeps the same object until the URL value
 *    changes. Creating it during render (`dayjs(searchParams.get(...))`) made every
 *    render look like a filter change, which recomputed the rows, reset the table and
 *    rendered again without end, freezing the page as soon as a date was set.
 *  - `value`/`onChange` drive the picker. Typing goes into local state and reaches the
 *    URL only once it is a complete, sensible date.
 */
export function useUrlDateFilter(urlValue: string, commit: (value: string) => void) {
  const applied = useMemo<Dayjs | null>(() => {
    if (!urlValue) return null
    const parsed = dayjs(urlValue)

    return parsed.isValid() ? parsed : null
  }, [urlValue])

  const [value, setValue] = useState<Dayjs | null>(applied)

  useEffect(() => {
    setValue(applied)
  }, [applied])

  const onChange = useCallback(
    (next: Dayjs | null) => {
      setValue(next)

      if (next === null) {
        commit('')
      } else if (next.isValid() && next.year() >= MIN_YEAR && next.year() <= MAX_YEAR) {
        commit(next.format('YYYY-MM-DD'))
      }
    },
    [commit]
  )

  return { applied, value, onChange }
}
