'use client'

// React Imports
import { useEffect, useMemo, useState } from 'react'

// MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import CircularProgress from '@mui/material/CircularProgress'

// Third-party Imports
import { toast } from 'react-toastify'

// Action Imports
import { updateManifestShortage } from '@/libs/actions/manifest.actions'
import { getLossesForManifest, needsPrice } from '@/libs/actions/driverloss.actions'

// Type Imports
import type { DriverLossType } from '@/types/apps/deliveryTypes'

// Util Imports
import { formatPrice } from '@/utils/dateAndCurrency'

interface EditShortageDialogProps {
  open: boolean
  onClose: () => void
  manifest: { $id: string; manifestNumber?: string; shortageCount?: number | null; packageCount?: number | null } | null
  actorName?: string
  onSaved?: () => void
}

/**
 * Change a verified manifest's shortage - usually because missing packages were
 * found. The driver's loss sheet follows the new figure.
 *
 * When the count comes down and the missing packages carry different prices, the
 * office ticks which ones were found, so the right amount comes off.
 */
const EditShortageDialog = ({ open, onClose, manifest, actorName, onSaved }: EditShortageDialogProps) => {
  const current = manifest?.shortageCount || 0

  const [count, setCount] = useState(String(current))
  const [rows, setRows] = useState<DriverLossType[]>([])
  const [found, setFound] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !manifest) return

    setCount(String(manifest.shortageCount || 0))
    setFound([])
    setLoading(true)

    getLossesForManifest(manifest.$id)
      .then(all => setRows(all.filter(row => row.source === 'shortage' && row.status === 'owed')))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [open, manifest])

  const next = count.trim() === '' ? NaN : Number(count)
  const valid = Number.isInteger(next) && next >= 0
  const clearing = valid ? Math.max(0, current - next) : 0

  // Only ask which ones were found when it changes the amount: unpriced rows go
  // first and rows of equal value are interchangeable.
  const mustChoose = useMemo(() => {
    if (clearing === 0) return false

    const unpriced = rows.filter(needsPrice).length

    if (clearing <= unpriced) return false

    const priced = rows.filter(row => !needsPrice(row))

    return new Set(priced.map(row => Number(row.value))).size > 1
  }, [clearing, rows])

  const toggle = (id: string) =>
    setFound(prev => (prev.includes(id) ? prev.filter(x => x !== id) : prev.length < clearing ? [...prev, id] : prev))

  const handleSave = async () => {
    if (!manifest || !valid) return

    if (mustChoose && found.length !== clearing) {
      toast.error(`Tick the ${clearing} package${clearing === 1 ? '' : 's'} that ${clearing === 1 ? 'was' : 'were'} found`)

      return
    }

    try {
      setSaving(true)
      await updateManifestShortage(manifest.$id, next, { foundIds: found, by: actorName })
      toast.success(
        next < current
          ? `${clearing} package${clearing === 1 ? '' : 's'} marked found`
          : 'Shortage updated'
      )
      onSaved?.()
      onClose()
    } catch (error: any) {
      toast.error(error?.message || 'Could not update the shortage')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth='xs'>
      <DialogTitle>Change shortage{manifest?.manifestNumber ? ` - ${manifest.manifestNumber}` : ''}</DialogTitle>
      <DialogContent dividers className='flex flex-col gap-4'>
        <Typography variant='body2' color='text.secondary'>
          Currently {current} package{current === 1 ? '' : 's'} short. When missing packages turn up, lower the number:
          the driver is cleared for them on the loss sheet.
        </Typography>

        <TextField
          type='number'
          label='Packages still missing'
          value={count}
          onChange={e => {
            setCount(e.target.value)
            setFound([])
          }}
          inputProps={{ min: 0 }}
          error={count !== '' && !valid}
          helperText={
            valid && next < current
              ? `${clearing} package${clearing === 1 ? '' : 's'} will be marked found`
              : valid && next > current
                ? `${next - current} more package${next - current === 1 ? '' : 's'} will be charged (price needed)`
                : ' '
          }
          autoFocus
          fullWidth
        />

        {loading && <CircularProgress size={20} />}

        {mustChoose && !loading && (
          <div>
            <Alert severity='info' className='mb-2'>
              These were priced differently. Tick the {clearing} that {clearing === 1 ? 'was' : 'were'} found.
            </Alert>
            {rows.map(row => (
              <FormControlLabel
                key={row.$id}
                className='flex'
                control={<Checkbox checked={found.includes(row.$id)} onChange={() => toggle(row.$id)} />}
                label={`${row.description || 'Missing package'} - ${needsPrice(row) ? 'price needed' : formatPrice(Number(row.value))}`}
              />
            ))}
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant='outlined' onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant='contained'
          onClick={handleSave}
          disabled={!valid || next === current || saving}
          startIcon={saving ? <CircularProgress size={16} color='inherit' /> : undefined}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default EditShortageDialog
