'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

// Component Imports
import CompanyDialog from './CompanyDialog'

interface CompanyFieldProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  disabled?: boolean
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  size?: 'small' | 'medium'

  /** Offer "Add a new company" in the list (office screens; not the driver's form) */
  allowAdd?: boolean

  /** Called after a company is added from here, so the caller can refresh its options */
  onCompanyAdded?: (name: string) => void
}

const ADD_NEW = '__add_new_company__'

/**
 * Company picker. Lists the companies from the Companies page; a name cannot be
 * typed in freely, so the same client is never recorded under two spellings.
 * Where `allowAdd` is set, a new company can be added without leaving the form.
 */
const CompanyField = ({
  value,
  onChange,
  options,
  disabled,
  label = 'Company',
  placeholder,
  helperText,
  required,
  size = 'small',
  allowAdd,
  onCompanyAdded
}: CompanyFieldProps) => {
  const [typed, setTyped] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  // A name saved before companies became a fixed list stays visible until it is changed
  const known = value && !options.includes(value) ? [value, ...options] : options

  return (
    <>
      <Autocomplete
        options={allowAdd ? [...known, ADD_NEW] : known}
        value={value || null}
        onChange={(_, selected) => {
          if (selected === ADD_NEW) setDialogOpen(true)
          else onChange(selected || '')
        }}
        inputValue={typed}
        onInputChange={(_, text) => setTyped(text === ADD_NEW ? '' : text)}
        // "Add a new company" is always offered, whatever has been typed
        filterOptions={(all, state) => {
          const term = state.inputValue.trim().toLowerCase()

          return all.filter(option => option === ADD_NEW || !term || option.toLowerCase().includes(term))
        }}
        getOptionLabel={option => (option === ADD_NEW ? '' : option)}
        renderOption={(props, option) => (
          <li {...props} key={option}>
            {option === ADD_NEW ? (
              <Typography color='primary' className='flex items-center gap-2'>
                <i className='ri-add-line' />
                Add a new company{typed.trim() ? ` "${typed.trim()}"` : ''}…
              </Typography>
            ) : (
              option
            )}
          </li>
        )}
        disabled={disabled}
        noOptionsText='No companies yet'
        renderInput={params => (
          <TextField
            {...params}
            size={size}
            label={label}
            placeholder={placeholder}
            helperText={helperText}
            required={required}
          />
        )}
      />
      {allowAdd && (
        <CompanyDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          initialName={typed.trim()}
          onSaved={company => {
            onCompanyAdded?.(company.name)
            onChange(company.name)
          }}
        />
      )}
    </>
  )
}

export default CompanyField
