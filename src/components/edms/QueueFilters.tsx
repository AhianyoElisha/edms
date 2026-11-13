'use client'

// React Imports
import { useCallback, useMemo } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Autocomplete from '@mui/material/Autocomplete'
import InputAdornment from '@mui/material/InputAdornment'
import { DatePicker } from '@mui/x-date-pickers-pro'
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers-pro'

// Third-party Imports
import dayjs from 'dayjs'

// Hook Imports
import { useUrlFilters, useUrlDateFilter } from '@/hooks/useUrlFilters'

export type QueueFilterOption = { id: string; label: string }

/**
 * One dropdown filter: `param` is its name in the URL, `pick` reads the value off a
 * row as an id (what rows are matched on) and a label (what the user sees).
 */
export type QueueFilterDef<Row> = {
  param: string
  label: string
  pick: (row: Row) => QueueFilterOption | null
}

/**
 * Dropdown and date-range filters for a review queue, kept in the URL so a filtered
 * queue survives a reload and can be shared.
 *
 * Returns the filtered rows plus everything `QueueFilterBar` needs to draw itself.
 */
export function useQueueFilters<Row>(rows: Row[], defs: QueueFilterDef<Row>[], dateOf: (row: Row) => string | undefined | null) {
  const { searchParams, setParam, setParams } = useUrlFilters()

  const selectedKey = defs.map(def => searchParams.get(def.param) || '').join('|')
  const dateFromParam = searchParams.get('dateFrom') || ''
  const dateToParam = searchParams.get('dateTo') || ''

  const commitDateFrom = useCallback((value: string) => setParam('dateFrom', value), [setParam])
  const commitDateTo = useCallback((value: string) => setParam('dateTo', value), [setParam])
  const fromDate = useUrlDateFilter(dateFromParam, commitDateFrom)
  const toDate = useUrlDateFilter(dateToParam, commitDateTo)

  // Only values that occur in the queue are offered, each with how many rows it has
  const options = useMemo(
    () =>
      defs.map(def => {
        const seen = new Map<string, QueueFilterOption & { count: number }>()

        rows.forEach(row => {
          const option = def.pick(row)

          if (!option) return

          const existing = seen.get(option.id)

          if (existing) existing.count++
          else seen.set(option.id, { ...option, count: 1 })
        })

        return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows]
  )

  const filtered = useMemo(() => {
    let result = rows
    const selected = selectedKey.split('|')

    defs.forEach((def, index) => {
      if (selected[index]) result = result.filter(row => def.pick(row)?.id === selected[index])
    })

    if (fromDate.applied || toDate.applied) {
      const from = fromDate.applied?.startOf('day')
      const to = toDate.applied?.endOf('day')

      result = result.filter(row => {
        const when = dayjs(dateOf(row))

        return (!from || !when.isBefore(from)) && (!to || !when.isAfter(to))
      })
    }

    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, selectedKey, fromDate.applied, toDate.applied])

  const activeCount = selectedKey.split('|').filter(Boolean).length + (dateFromParam ? 1 : 0) + (dateToParam ? 1 : 0)

  const clear = useCallback(
    () => setParams({ ...Object.fromEntries(defs.map(def => [def.param, null])), dateFrom: null, dateTo: null }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setParams]
  )

  return {
    filtered,
    activeCount,
    clear,

    /** Changes whenever any filter changes; handy for resetting a page number */
    key: `${selectedKey}|${dateFromParam}|${dateToParam}`,
    bar: { defs, options, searchParams, setParam, fromDate, toDate }
  }
}

type BarProps = {
  bar: ReturnType<typeof useQueueFilters<any>>['bar']
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string

  /** Rows after filters and search / rows in the whole queue */
  shown: number
  total: number
  noun: string
  anyActive: boolean
  onClear: () => void
}

/** The search box, date range and dropdowns of a review queue. */
export const QueueFilterBar = ({ bar, search, onSearchChange, searchPlaceholder, shown, total, noun, anyActive, onClear }: BarProps) => (
  <LocalizationProvider dateAdapter={AdapterDayjs}>
    <Grid container spacing={4}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          size='small'
          placeholder={searchPlaceholder}
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position='start'>
                <i className='ri-search-line' />
              </InputAdornment>
            )
          }}
        />
      </Grid>
      <Grid item xs={6} md={3}>
        <DatePicker
          label='Logged from'
          value={bar.fromDate.value}
          onChange={bar.fromDate.onChange}
          slotProps={{ textField: { size: 'small', fullWidth: true } }}
        />
      </Grid>
      <Grid item xs={6} md={3}>
        <DatePicker
          label='Logged to'
          value={bar.toDate.value}
          onChange={bar.toDate.onChange}
          slotProps={{ textField: { size: 'small', fullWidth: true } }}
        />
      </Grid>
      {bar.defs.map((def, index) => {
        const options = bar.options[index]
        const selectedId = bar.searchParams.get(def.param) || ''

        return (
          <Grid item xs={12} sm={6} md={4} key={def.param}>
            <Autocomplete
              size='small'
              options={options}
              // A filter that arrived by link may point at something no longer in the queue
              value={
                options.find(o => o.id === selectedId) ||
                (selectedId ? { id: selectedId, label: 'Not in the queue', count: 0 } : null)
              }
              onChange={(_, option) => bar.setParam(def.param, option?.id || '')}
              getOptionLabel={option => option.label}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <span className='flex-1'>{option.label}</span>
                  <Typography variant='caption' color='text.secondary'>
                    {option.count}
                  </Typography>
                </li>
              )}
              renderInput={params => <TextField {...params} label={def.label} placeholder={`All ${options.length}`} />}
              noOptionsText='Nothing in the queue'
            />
          </Grid>
        )
      })}
      {anyActive && (
        <Grid item xs={12} className='flex items-center gap-3'>
          <Typography variant='body2' color='text.secondary'>
            Showing {shown} of {total} {noun}
          </Typography>
          <Button size='small' variant='text' onClick={onClear} startIcon={<i className='ri-filter-off-line' />}>
            Clear filters
          </Button>
        </Grid>
      )}
    </Grid>
  </LocalizationProvider>
)
