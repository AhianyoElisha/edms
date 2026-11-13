'use client'

// React Imports
import { useEffect, useState } from 'react'

// MUI Imports
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'

// Action Imports
import { getCompanies } from '@/libs/actions/company.actions'
import type { CompanyType } from '@/libs/actions/company.actions'

type Props = {
  /** Selected company id ('' for all) */
  value: string
  onChange: (companyId: string) => void
}

/** "All companies / one company" dropdown for list pages. Loads the companies itself. */
const CompanyFilterSelect = ({ value, onChange }: Props) => {
  const [companies, setCompanies] = useState<CompanyType[]>([])

  useEffect(() => {
    getCompanies()
      .then(setCompanies)
      .catch(error => console.error('Error loading companies:', error))
  }, [])

  return (
    <TextField
      select
      size='small'
      label='Company'
      // Until the list arrives the saved id has no matching option; show "all" meanwhile
      value={companies.some(company => company.$id === value) ? value : ''}
      onChange={e => onChange(e.target.value)}
      sx={{ minWidth: 180 }}
      SelectProps={{ displayEmpty: true }}
      InputLabelProps={{ shrink: true }}
    >
      <MenuItem value=''>All companies</MenuItem>
      {companies.map(company => (
        <MenuItem key={company.$id} value={company.$id}>
          {company.name}
        </MenuItem>
      ))}
    </TextField>
  )
}

export default CompanyFilterSelect
