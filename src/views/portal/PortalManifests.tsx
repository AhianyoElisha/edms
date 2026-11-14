'use client'

// React Imports
import { useCallback, useEffect, useMemo, useState } from 'react'

// Next Imports
import { useSearchParams } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
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
import { useUrlFilters } from '@/hooks/useUrlFilters'

// Action Imports
import { portalGetManifestPhoto, portalListManifests } from '@/libs/actions/portal.actions'
import type { PortalManifest } from '@/libs/actions/portal.actions'
import { getPortalToken } from '@/libs/portalClient'

// Util Imports
import { formatDate, formatDateTime, manifestStatus } from './portalFormat'

const STATUSES = ['pending', 'loaded', 'in_transit', 'delivered']

type Photo = { title: string; src: string | null; loading: boolean; error?: string }

const ManifestsTable = () => {
  const searchParams = useSearchParams()
  const { setParam } = useUrlFilters()
  const tripFilter = searchParams.get('trip') || ''

  const [manifests, setManifests] = useState<PortalManifest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [photo, setPhoto] = useState<Photo | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setManifests(await portalListManifests(await getPortalToken()))
    } catch (e: any) {
      setError(e?.message || 'Could not load your manifests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()

    return manifests.filter(
      manifest =>
        (!tripFilter || manifest.tripId === tripFilter) &&
        // "Delivered" covers both of our finished states
        (!status || manifest.status === status || (status === 'delivered' && manifest.status === 'completed')) &&
        (!term ||
          [manifest.manifestNumber, manifest.tripNumber, manifest.dropoff].some(value =>
            (value || '').toLowerCase().includes(term)
          ))
    )
  }, [manifests, search, status, tripFilter])

  useEffect(() => {
    setPage(0)
  }, [search, status, tripFilter])

  const paged = visible.slice(page * rowsPerPage, (page + 1) * rowsPerPage)
  const tripNumber = tripFilter ? manifests.find(m => m.tripId === tripFilter)?.tripNumber : ''

  // Photos are fetched one at a time, on request, through the server
  const showPhoto = async (manifest: PortalManifest, kind: 'manifest' | 'delivery') => {
    const title = `${kind === 'manifest' ? 'Manifest' : 'Proof of delivery'} · ${manifest.manifestNumber}`

    setPhoto({ title, src: null, loading: true })

    try {
      const src = await portalGetManifestPhoto(await getPortalToken(), manifest.$id, kind)

      setPhoto({ title, src, loading: false, error: src ? undefined : 'No photo on file' })
    } catch (e: any) {
      setPhoto({ title, src: null, loading: false, error: e?.message || 'Could not load the photo' })
    }
  }

  return (
    <Card>
      <CardContent className='flex flex-wrap items-center gap-4'>
        <TextField
          size='small'
          placeholder='Search manifest, trip or drop-off…'
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
          <MenuItem value=''>All manifests</MenuItem>
          {STATUSES.map(value => (
            <MenuItem key={value} value={value}>
              {manifestStatus(value).label}
            </MenuItem>
          ))}
        </TextField>
        <Typography variant='body2' color='text.secondary' className='flex-1'>
          {loading ? '' : `${visible.length} of ${manifests.length} manifests`}
        </Typography>
        <Button variant='outlined' size='small' startIcon={<i className='ri-refresh-line' />} onClick={load}>
          Refresh
        </Button>
      </CardContent>

      {tripFilter && (
        <CardContent className='pbs-0'>
          <Alert
            severity='info'
            action={
              <Button size='small' onClick={() => setParam('trip', '')}>
                Show all
              </Button>
            }
          >
            Showing the manifests of trip {tripNumber || 'selected'} only.
          </Alert>
        </CardContent>
      )}

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
          <i className='ri-file-list-3-line text-5xl text-textSecondary' />
          <Typography variant='h6'>{manifests.length === 0 ? 'No manifests yet' : 'No manifests match'}</Typography>
        </CardContent>
      ) : (
        <>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Manifest</TableCell>
                  <TableCell>Trip</TableCell>
                  <TableCell>Drop-off</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align='right'>Packages</TableCell>
                  <TableCell align='right'>Delivered</TableCell>
                  <TableCell align='right'>Short</TableCell>
                  <TableCell align='right'>Extra</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Delivered at</TableCell>
                  <TableCell align='right'>Photos</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paged.map(manifest => {
                  const state = manifestStatus(manifest.status)

                  return (
                    <TableRow key={manifest.$id} hover>
                      <TableCell>
                        <Typography className='font-medium' color='text.primary'>
                          {manifest.manifestNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>{manifest.tripNumber || '—'}</TableCell>
                      <TableCell>{manifest.dropoff || '—'}</TableCell>
                      <TableCell>{formatDate(manifest.manifestDate)}</TableCell>
                      <TableCell align='right'>{manifest.packageCount || '—'}</TableCell>
                      <TableCell align='right'>{manifest.packageCount ? manifest.deliveredCount : '—'}</TableCell>
                      <TableCell align='right'>
                        {manifest.shortageCount > 0 ? (
                          <Typography color='error' component='span'>
                            {manifest.shortageCount}
                          </Typography>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell align='right'>{manifest.surplusCount > 0 ? `+${manifest.surplusCount}` : '—'}</TableCell>
                      <TableCell>
                        <Chip size='small' variant='tonal' label={state.label} color={state.color as any} />
                      </TableCell>
                      <TableCell>{formatDateTime(manifest.deliveryTime)}</TableCell>
                      <TableCell align='right'>
                        {manifest.hasManifestPhoto && (
                          <Tooltip title='Manifest photo'>
                            <IconButton size='small' onClick={() => showPhoto(manifest, 'manifest')}>
                              <i className='ri-file-image-line' />
                            </IconButton>
                          </Tooltip>
                        )}
                        {manifest.hasDeliveryPhoto && (
                          <Tooltip title='Proof of delivery'>
                            <IconButton size='small' onClick={() => showPhoto(manifest, 'delivery')}>
                              <i className='ri-camera-line' />
                            </IconButton>
                          </Tooltip>
                        )}
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

      <Dialog open={!!photo} onClose={() => setPhoto(null)} maxWidth='md' fullWidth>
        <DialogTitle>{photo?.title}</DialogTitle>
        <DialogContent className='flex justify-center'>
          {photo?.loading ? (
            <CircularProgress className='m-8' />
          ) : photo?.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.src} alt={photo.title} className='max-is-full max-bs-[75vh] object-contain' />
          ) : (
            <Typography color='text.secondary' className='p-8'>
              {photo?.error}
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

const PortalManifests = () => {
  const { isCompany } = usePermissions()

  return (
    <PortalShell title='My Manifests' subtitle='Manifests carried for your company, with delivery status and photos.'>
      {isCompany && <ManifestsTable />}
    </PortalShell>
  )
}

export default PortalManifests
