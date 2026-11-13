'use client'

// MUI Imports
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'

interface CompanyFieldProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  disabled?: boolean
  label?: string
  placeholder?: string
  helperText?: string
}

/**
 * Company picker for a manifest: suggests the clients that already have rate
 * cards, but takes any typed name so a newly onboarded company is never blocked
 * on someone setting it up first.
 */
const CompanyField = ({
  value,
  onChange,
  options,
  disabled,
  label = 'Company',
  placeholder,
  helperText
}: CompanyFieldProps) => (
  <Autocomplete
    freeSolo
    options={options}
    value={value || null}
    onChange={(_, selected) => onChange(selected || '')}
    // 'reset' fires when MUI syncs the text box to `value`; reacting to it would
    // wipe a pre-filled name on first render.
    onInputChange={(_, typed, reason) => {
      if (reason !== 'reset') onChange(typed)
    }}
    disabled={disabled}
    renderInput={params => (
      <TextField {...params} size='small' label={label} placeholder={placeholder} helperText={helperText} />
    )}
  />
)

export default CompanyField
