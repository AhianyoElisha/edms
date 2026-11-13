'use client'

// React Imports
import { useCallback, useEffect, useMemo, useState } from 'react'

// Next Imports
import Link from 'next/link'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

// Third-party Imports
import { toast } from 'react-toastify'

// Component Imports
import CompanyDialog from '@/components/edms/CompanyDialog'

// Hook Imports
import { usePermissions } from '@/hooks/usePermissions'

// Action Imports
import { getCompanies, getCompanyUsage } from '@/libs/actions/company.actions'
import type { CompanyType } from '@/libs/actions/company.actions'

type Usage = Record<string, { rateCards: number; trips: number; manifests: number }>

/**
 * The companies whose goods are carried. Rate cards, trips and manifests each
 * belong to one of these, which is what the Company filters work from.
 */
const CompaniesView = () => {
  const { hasPermission } = usePermissions()
  const canManage = hasPermission('ratecards.manage')

  const [companies, setCompanies] = useState<CompanyType[]>([])
  const [usage, setUsage] = useState<Usage>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<{ open: boolean; company: CompanyType | null }>({ open: false, company: null })

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setCompanies(await getCompanies())

      // The counts are a nicety; the list is usable without them
      getCompanyUsage()
        .then(setUsage)
        .catch(error => console.error('Error loading company usage:', error))
    } catch (error: any) {
      console.error('Error loading companies:', error)
      toast.error(error?.message || 'Could not load the companies')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) return companies

    return companies.filter(company =>
      [company.name, company.code, company.contactPerson, company.contactPhone, company.contactEmail]
        .filter(Boolean)
        .some(value => (value as string).toLowerCase().includes(term))
    )
  }, [companies, search])

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h4 className='text-2xl font-semibold'>Companies</h4>
          <p className='text-textSecondary'>
            The companies whose goods you carry. Each rate card, trip and manifest belongs to one of them.
          </p>
        </div>
        {canManage && (
          <Button
            variant='contained'
            startIcon={<i className='ri-add-line' />}
            onClick={() => setDialog({ open: true, company: null })}
          >
            Add Company
          </Button>
        )}
      </div>

      <Card>
        <CardContent>
          <TextField
            size='small'
            placeholder='Search companies…'
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ minWidth: 260 }}
          />
        </CardContent>
        {loading ? (
          <CardContent className='flex justify-center py-12'>
            <CircularProgress />
          </CardContent>
        ) : visible.length === 0 ? (
          <CardContent className='flex flex-col items-center gap-2 py-12'>
            <i className='ri-building-line text-5xl text-textSecondary' />
            <Typography variant='h6'>{companies.length === 0 ? 'No companies yet' : 'No company matches that search'}</Typography>
            {companies.length === 0 && canManage && (
              <Button variant='outlined' onClick={() => setDialog({ open: true, company: null })}>
                Add the first company
              </Button>
            )}
          </CardContent>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Company</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell align='right'>Rate cards</TableCell>
                  <TableCell align='right'>Trips</TableCell>
                  <TableCell align='right'>Manifests</TableCell>
                  <TableCell>Status</TableCell>
                  {canManage && <TableCell align='right'>Edit</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.map(company => {
                  const counts = usage[company.$id]

                  return (
                    <TableRow key={company.$id} hover>
                      <TableCell>
                        <Typography className='font-medium' color='text.primary'>
                          {company.name}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                          Code: {company.code}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{company.contactPerson || '—'}</Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {[company.contactPhone, company.contactEmail].filter(Boolean).join(' · ')}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>{counts ? counts.rateCards : '…'}</TableCell>
                      <TableCell align='right'>
                        {counts ? (
                          <Link href={`/edms/trips?company=${company.$id}`} className='text-primary'>
                            {counts.trips}
                          </Link>
                        ) : (
                          '…'
                        )}
                      </TableCell>
                      <TableCell align='right'>
                        {counts ? (
                          <Link href={`/edms/manifests?company=${company.$id}`} className='text-primary'>
                            {counts.manifests}
                          </Link>
                        ) : (
                          '…'
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size='small'
                          variant='tonal'
                          label={company.isActive !== false ? 'Active' : 'Inactive'}
                          color={company.isActive !== false ? 'success' : 'secondary'}
                        />
                      </TableCell>
                      {canManage && (
                        <TableCell align='right'>
                          <Tooltip title='Edit company'>
                            <IconButton size='small' onClick={() => setDialog({ open: true, company })}>
                              <i className='ri-edit-box-line' />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <CompanyDialog
        open={dialog.open}
        company={dialog.company}
        onClose={() => setDialog({ open: false, company: null })}
        onSaved={load}
      />
    </div>
  )
}

export default CompaniesView
