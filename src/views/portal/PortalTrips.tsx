'use client'

// React Imports
import { useCallback, useEffect, useMemo, useState } from 'react'

// Next Imports
import Link from 'next/link'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TablePagination from '@mui/material/TablePagination'

// Component Imports
import PortalShell from './PortalShell'

// Hook Imports
import { usePermissions } from '@/hooks/usePermissions'

// Action Imports
import { portalListTrips } from '@/libs/actions/portal.actions'
import type { PortalTrip } from '@/libs/actions/portal.actions'
import { getPortalToken } from '@/libs/portalClient'

// Util Imports
import { formatDate, tripStatus } from './portalFormat'

const STATUSES = ['awaiting_manifests', 'planned', 'in_progress', 'completed', 'cancelled']

const TripsTable = () => {
  const [trips, setTrips] = useState<PortalTrip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setTrips(await portalListTrips(await getPortalToken()))
    } catch (e: any) {
      setError(e?.message || 'Could not load your trips')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()

    return trips.filter(
      trip =>
        (!status || trip.status === status) &&
        (!term ||
          [trip.tripNumber, trip.route, trip.vehicle, trip.driver].some(value => (value || '').toLowerCase().includes(term)))
    )
  }, [trips, search, status])

  useEffect(() => {
    setPage(0)
  }, [search, status])

  const paged = visible.slice(page * rowsPerPage, (page + 1) * rowsPerPage)

  return (
    <Card>
      <CardContent className='flex flex-wrap items-center gap-4'>
        <TextField
          size='small'
          placeholder='Search trip, route, vehicle or driver…'
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ minWidth: 280 }}
        />
        <TextField
          select
          size='small'
          label='Status'
          value={status}
          onChange={e => setStatus(e.target.value)}
          sx={{ minWidth: 180 }}
          SelectProps={{ displayEmpty: true }}
          InputLabelProps={{ shrink: true }}
        >
          <MenuItem value=''>All trips</MenuItem>
          {STATUSES.map(value => (
            <MenuItem key={value} value={value}>
              {tripStatus(value).label}
            </MenuItem>
          ))}
        </TextField>
        <Typography variant='body2' color='text.secondary' className='flex-1'>
          {loading ? '' : `${visible.length} of ${trips.length} trips`}
        </Typography>
        <Button variant='outlined' size='small' startIcon={<i className='ri-refresh-line' />} onClick={load}>
          Refresh
        </Button>
      </CardContent>

      {loading ? (
        <CardContent className='flex justify-center py-12'>
          <CircularProgress />
        </CardContent>
      ) : error ? (
        <CardContent className='flex flex-col items-center gap-3 py-12'>
          <Typography color='error'>{error}</Typography>
          <Button variant='outlined' onClick={load}>
            Try again
          </Button>
        </CardContent>
      ) : visible.length === 0 ? (
        <CardContent className='flex flex-col items-center gap-2 py-12'>
          <i className='ri-truck-line text-5xl text-textSecondary' />
          <Typography variant='h6'>{trips.length === 0 ? 'No trips yet' : 'No trips match'}</Typography>
        </CardContent>
      ) : (
        <>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Trip</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Route</TableCell>
                  <TableCell>Vehicle</TableCell>
                  <TableCell>Driver</TableCell>
                  <TableCell align='right'>Stops</TableCell>
                  <TableCell align='right'>Packages</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paged.map(trip => {
                  const state = tripStatus(trip.status)

                  return (
                    <TableRow key={trip.$id} hover>
                      <TableCell>
                        <Typography
                          component={Link}
                          href={`/portal/manifests?trip=${trip.$id}`}
                          color='primary'
                          className='font-medium'
                        >
                          {trip.tripNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDate(trip.tripDate)}</TableCell>
                      <TableCell>{trip.route || '—'}</TableCell>
                      <TableCell>{trip.vehicle || '—'}</TableCell>
                      <TableCell>{trip.driver || '—'}</TableCell>
                      <TableCell align='right'>{trip.manifestCount}</TableCell>
                      <TableCell align='right'>{trip.totalPackages || '—'}</TableCell>
                      <TableCell>
                        <Chip size='small' variant='tonal' label={state.label} color={state.color as any} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component='div'
            count={visible.length}
            page={Math.min(page, Math.max(0, Math.ceil(visible.length / rowsPerPage) - 1))}
            onPageChange={(_, next) => setPage(next)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={e => {
              setRowsPerPage(parseInt(e.target.value, 10))
              setPage(0)
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </>
      )}
    </Card>
  )
}

const PortalTrips = () => {
  const { isCompany } = usePermissions()

  return (
    <PortalShell title='My Trips' subtitle='Trips carried for your company. Click a trip to see its manifests.'>
      {isCompany && <TripsTable />}
    </PortalShell>
  )
}

export default PortalTrips
