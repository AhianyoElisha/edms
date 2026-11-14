'use client'

// React Imports
import { useEffect, useState } from 'react'

// MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'

// Third-party Imports
import { toast } from 'react-toastify'

// Action Imports
import { createCompany, updateCompany } from '@/libs/actions/company.actions'
import type { CompanyType } from '@/libs/actions/company.actions'

type Props = {
  open: boolean
  onClose: () => void

  /** The company being edited; leave out to add a new one */
  company?: CompanyType | null

  /** Pre-fills the name when adding from a picker where it was already typed */
  initialName?: string
  onSaved?: (company: CompanyType) => void
}

const blank = { name: '', code: '', contactPerson: '', contactPhone: '', contactEmail: '', notes: '', invoiceCutoffDay: '', isActive: true }

// "Imperial Health Sciences" -> IHS, "Jumia" -> JUM
const suggestCode = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean)

  if (words.length === 0) return ''

  const code = words.length === 1 ? words[0].slice(0, 3) : words.map(word => word[0]).join('').slice(0, 5)

  return code.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * Add or edit a company. Used by the Companies page and by the company pickers,
 * so a new client can be added from wherever it first comes up.
 */
const CompanyDialog = ({ open, onClose, company, initialName, onSaved }: Props) => {
  const [form, setForm] = useState(blank)
  const [codeTouched, setCodeTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    setError(null)
    setCodeTouched(!!company)
    setForm(
      company
        ? {
            name: company.name || '',
            code: company.code || '',
            contactPerson: company.contactPerson || '',
            contactPhone: company.contactPhone || '',
            contactEmail: company.contactEmail || '',
            notes: company.notes || '',
            invoiceCutoffDay: company.invoiceCutoffDay ? String(company.invoiceCutoffDay) : '',
            isActive: company.isActive !== false
          }
        : { ...blank, name: initialName || '', code: suggestCode(initialName || '') }
    )
  }, [open, company, initialName])

  const set = (field: keyof typeof blank, value: string | boolean) => setForm(prev => ({ ...prev, [field]: value }))

  const handleName = (name: string) =>
    setForm(prev => ({ ...prev, name, code: codeTouched ? prev.code : suggestCode(name) }))

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      setError('Enter the company name and a short code.')

      return
    }

    try {
      setSaving(true)
      setError(null)

      const saved = company ? await updateCompany(company.$id, form) : await createCompany(form)

      toast.success(company ? 'Company updated' : `${saved.name} added`)
      onSaved?.(saved)
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Could not save the company')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth='sm' fullWidth>
      <DialogTitle>{company ? 'Edit Company' : 'Add a Company'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={4} className='pbs-2'>
          {error && (
            <Grid item xs={12}>
              <Alert severity='error'>{error}</Alert>
            </Grid>
          )}
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              required
              autoFocus
              label='Company Name'
              placeholder='e.g. Jumia'
              value={form.name}
              onChange={e => handleName(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              required
              label='Code'
              placeholder='e.g. JUM'
              value={form.code}
              onChange={e => {
                setCodeTouched(true)
                set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
              }}
              helperText='Short and unique'
              inputProps={{ maxLength: 10 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label='Contact Person'
              value={form.contactPerson}
              onChange={e => set('contactPerson', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label='Contact Phone'
              value={form.contactPhone}
              onChange={e => set('contactPhone', e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              type='email'
              label='Contact Email'
              value={form.contactEmail}
              onChange={e => set('contactEmail', e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              label='Notes'
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              type='number'
              label='First invoice covers trips up to day'
              placeholder='e.g. 14'
              value={form.invoiceCutoffDay}
              onChange={e => set('invoiceCutoffDay', e.target.value)}
              inputProps={{ min: 1, max: 28 }}
              helperText='Only for a company that invoices twice a month: trips up to this day go on the first invoice, the rest on the second. Leave empty for one invoice a month.'
            />
          </Grid>
          {company && (
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={form.isActive} onChange={e => set('isActive', e.target.checked)} />}
                label={form.isActive ? 'Active: can be picked on new rate cards and manifests' : 'Inactive: hidden from the pickers'}
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving} color='secondary'>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving} variant='contained'>
          {saving ? 'Saving…' : company ? 'Save Changes' : 'Add Company'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CompanyDialog
