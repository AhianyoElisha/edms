'use client'

// React Imports
import { useCallback, useEffect, useMemo, useState } from 'react'

// Next Imports
import Link from 'next/link'

// MUI Imports
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'

// Third-party Imports
import { toast } from 'react-toastify'

// Component Imports
import EditShortageDialog from './EditShortageDialog'
import LossItemDialog from './LossItemDialog'
import { LossStatusChip, LossValue } from './LossBits'

// Action Imports
import {
  deleteManualLoss,
  getLossesForTrip,
  lossTotals,
  setLossStatus,
  syncTripLosses
} from '@/libs/actions/driverloss.actions'

// Hook Imports
import { useLossAccess } from './lossAccess'

// Type Imports
import type { DriverLossType } from '@/types/apps/deliveryTypes'

// Util Imports
import { formatPrice } from '@/utils/dateAndCurrency'

const stopName = (manifest: any) => {
  const location = manifest?.dropofflocation

  return location && typeof location === 'object' ? location.locationName || location.address || '' : ''
}

/**
 * A trip's Losses tab: the missing packages from its manifests and any losses the
 * office added, what each is worth, and the total charged to the driver.
 */
interface TripLossesProps {
  tripId: string
  manifests: any[]
  driverId?: string | null
  // A shortage changed, so the trip's manifests need reloading
  onManifestsChanged?: () => void
}

const TripLosses = ({ tripId, manifests, driverId, onManifestsChanged }: TripLossesProps) => {
  const { canManage, actorName, isLoading: accessLoading } = useLossAccess()

  const [losses, setLosses] = useState<DriverLossType[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [shortageManifest, setShortageManifest] = useState<any | null>(null)
  const [editing, setEditing] = useState<DriverLossType | null>(null)
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      // The office's view also catches up shortages saved before the sheet existed
      setLosses(canManage ? await syncTripLosses(tripId, actorName) : await getLossesForTrip(tripId))
    } catch (error: any) {
      console.error('Error loading trip losses:', error)
      toast.error('Could not load the losses for this trip')
    } finally {
      setLoading(false)
    }
  }, [tripId, canManage, actorName])

  useEffect(() => {
    // Wait for permissions: the office's load also syncs, a driver's only reads
    if (!accessLoading) load()
  }, [load, accessLoading])

  const totals = useMemo(() => lossTotals(losses, []), [losses])

  // Manifests with a shortage now, or with rows from one (all found since)
  const shortageGroups = useMemo(
    () =>
      manifests
        .map(manifest => ({
          manifest,
          rows: losses.filter(row => row.source === 'shortage' && row.manifestId === manifest.$id)
        }))
        .filter(group => group.rows.length > 0 || (group.manifest.shortageCount || 0) > 0),
    [manifests, losses]
  )

  // Shortage rows whose manifest is no longer on the trip
  const orphanRows = losses.filter(
    row => row.source === 'shortage' && !manifests.some(manifest => manifest.$id === row.manifestId)
  )

  const manualRows = losses.filter(row => row.source === 'manual')

  const run = async (row: DriverLossType, action: () => Promise<unknown>, message: string) => {
    try {
      setBusyId(row.$id)
      await action()
      toast.success(message)
      await load()
    } catch (error: any) {
      toast.error(error?.message || 'Could not update the loss')
    } finally {
      setBusyId(null)
    }
  }

  const rowActions = (row: DriverLossType) => {
    if (!canManage) return null

    const busy = busyId === row.$id

    return (
      <div className='flex items-center justify-end gap-1'>
        {busy && <CircularProgress size={16} />}
        {row.status === 'owed' && (
          <Tooltip title={row.value === null || row.value === undefined ? 'Enter price' : 'Edit'}>
            <IconButton size='small' onClick={() => setEditing(row)} disabled={busy}>
              <i className='ri-price-tag-3-line' />
            </IconButton>
          </Tooltip>
        )}
        {row.status === 'owed' && (
          <Tooltip title='Write off (driver does not pay)'>
            <IconButton
              size='small'
              onClick={() => run(row, () => setLossStatus(row.$id, 'waived', actorName), 'Loss written off')}
              disabled={busy}
            >
              <i className='ri-hand-heart-line' />
            </IconButton>
          </Tooltip>
        )}
        {row.status === 'waived' && (
          <Tooltip title='Charge the driver again'>
            <IconButton
              size='small'
              onClick={() => run(row, () => setLossStatus(row.$id, 'owed', actorName), 'Loss charged again')}
              disabled={busy}
            >
              <i className='ri-arrow-go-back-line' />
            </IconButton>
          </Tooltip>
        )}
        {row.source === 'manual' && (
          <Tooltip title='Delete (entered by mistake)'>
            <IconButton
              size='small'
              color='error'
              onClick={() => run(row, () => deleteManualLoss(row.$id), 'Loss deleted')}
              disabled={busy}
            >
              <i className='ri-delete-bin-line' />
            </IconButton>
          </Tooltip>
        )}
      </div>
    )
  }

  const rowsTable = (rows: DriverLossType[]) => (
    <TableContainer component={Paper} variant='outlined'>
      <Table size='small'>
        <TableHead>
          <TableRow>
            <TableCell>Item</TableCell>
            <TableCell align='right'>Value</TableCell>
            <TableCell>Status</TableCell>
            {canManage && <TableCell align='right' />}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.$id} hover>
              <TableCell>
                <Typography variant='body2' className={row.status === 'owed' ? '' : 'line-through'}>
                  {row.description || 'Missing package'}
                </Typography>
                {row.notes && (
                  <Typography variant='caption' color='text.secondary' className='block'>
                    {row.notes}
                  </Typography>
                )}
              </TableCell>
              <TableCell align='right'>
                <LossValue loss={row} />
              </TableCell>
              <TableCell>
                <LossStatusChip loss={row} />
              </TableCell>
              {canManage && <TableCell align='right'>{rowActions(row)}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )

  if (loading) {
    return (
      <div className='flex items-center justify-center gap-3 py-12'>
        <CircularProgress size={24} />
        <Typography color='text.secondary'>Loading losses…</Typography>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-center gap-4'>
        <div className='flex-1 min-is-[200px]'>
          <Typography variant='h6'>{formatPrice(totals.owed)} charged to the driver on this trip</Typography>
          <Typography variant='body2' color='text.secondary'>
            {totals.itemsOwed} item{totals.itemsOwed === 1 ? '' : 's'} owed
            {totals.itemsFound > 0 ? ` • ${totals.itemsFound} found` : ''}
          </Typography>
        </div>
        {canManage && driverId && (
          <Button variant='outlined' component={Link} href={`/edms/losses/${driverId}`} startIcon={<i className='ri-file-list-2-line' />}>
            Driver&apos;s loss sheet
          </Button>
        )}
        {canManage && (
          <Button variant='contained' onClick={() => setAdding(true)} startIcon={<i className='ri-add-line' />} disabled={!driverId}>
            Add loss
          </Button>
        )}
      </div>

      {totals.itemsNeedingPrice > 0 && (
        <Alert severity='warning'>
          {totals.itemsNeedingPrice} item{totals.itemsNeedingPrice === 1 ? ' has' : 's have'} no price yet
          {canManage ? ' - use the price tag to enter what each is worth.' : ' and count as nothing until the office prices them.'}
        </Alert>
      )}

      {shortageGroups.length === 0 && manualRows.length === 0 && orphanRows.length === 0 && (
        <div className='flex flex-col items-center gap-2 py-10'>
          <i className='ri-checkbox-circle-line text-5xl text-success' />
          <Typography>No losses on this trip</Typography>
          <Typography variant='body2' color='text.secondary' className='text-center'>
            Shortages confirmed in Manifest Review appear here, one line per missing package.
          </Typography>
        </div>
      )}

      {shortageGroups.map(({ manifest, rows }) => (
        <div key={manifest.$id} className='flex flex-col gap-2'>
          <div className='flex flex-wrap items-center gap-2'>
            <Typography className='font-medium'>
              Manifest {manifest.manifestNumber}
              {stopName(manifest) ? ` · ${stopName(manifest)}` : ''}
            </Typography>
            <Chip
              size='small'
              variant='tonal'
              color={(manifest.shortageCount || 0) > 0 ? 'error' : 'success'}
              label={(manifest.shortageCount || 0) > 0 ? `${manifest.shortageCount} short` : 'All found'}
            />
            <div className='flex-1' />
            {canManage && !rows.length && (manifest.shortageCount || 0) > 0 && (
              <Typography variant='caption' color='text.secondary'>
                Not reviewed yet - goes on the sheet once the manifest is verified
              </Typography>
            )}
            {canManage && rows.length > 0 && (
              <Button size='small' variant='outlined' onClick={() => setShortageManifest(manifest)} startIcon={<i className='ri-search-eye-line' />}>
                Items found / change shortage
              </Button>
            )}
          </div>
          {rows.length > 0 && rowsTable(rows)}
        </div>
      ))}

      {orphanRows.length > 0 && (
        <div className='flex flex-col gap-2'>
          <Typography className='font-medium'>Missing packages from a manifest no longer on this trip</Typography>
          {rowsTable(orphanRows)}
        </div>
      )}

      {manualRows.length > 0 && (
        <div className='flex flex-col gap-2'>
          <Typography className='font-medium'>Other losses</Typography>
          {rowsTable(manualRows)}
        </div>
      )}

      <EditShortageDialog
        open={Boolean(shortageManifest)}
        onClose={() => setShortageManifest(null)}
        manifest={shortageManifest}
        actorName={actorName}
        onSaved={() => {
          load()
          onManifestsChanged?.()
        }}
      />
      <LossItemDialog
        open={adding || Boolean(editing)}
        onClose={() => {
          setAdding(false)
          setEditing(null)
        }}
        loss={editing}
        tripId={tripId}
        actorName={actorName}
        onSaved={load}
      />
    </div>
  )
}

export default TripLosses
