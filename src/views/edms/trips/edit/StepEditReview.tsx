'use client'

// React Imports
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// MUI Imports
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

// Type Imports
import type { WizardStepProps } from '../types'

// Actions
import { updateTripWithManifests } from '@/libs/actions/trip.actions'

// Third-party Imports
import { toast } from 'react-toastify'

const StepEditReview = ({ handlePrev, wizardData, tripData }: WizardStepProps & { tripData: any }) => {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { tripDetails, manifests } = wizardData

  const existingManifests: any[] = tripData.manifests || []
  const submittedIds = new Set(manifests.map(m => m.$id).filter(Boolean))
  const removedManifests = existingManifests.filter(m => !submittedIds.has(m.$id))
  const newManifests = manifests.filter(m => !m.$id)
  const keptManifests = manifests.filter(m => m.$id)

  const getTotalPackages = () => manifests.reduce((sum, m) => sum + (m.packageCount || 0), 0)

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      setError(null)

      const result = await updateTripWithManifests(tripData.$id, wizardData)

      if (result.success) {
        toast.success(`Trip ${tripData.tripNumber} updated successfully`, {
          position: 'top-right',
          autoClose: 5000
        })
        router.push(`/edms/trips/${tripData.$id}`)
        router.refresh()
      } else {
        throw new Error(result.error || 'Failed to update trip')
      }
    } catch (err: any) {
      console.error('Error updating trip:', err)
      setError(err.message || 'An error occurred while updating the trip')
      setSubmitting(false)
    }
  }

  return (
    <Grid container spacing={5}>
      <Grid item xs={12}>
        <Typography variant='h5' className='mb-1'>
          Review Changes
        </Typography>
        <Typography variant='body2'>Confirm the updated details before saving trip {tripData.tripNumber}</Typography>
      </Grid>

      {error && (
        <Grid item xs={12}>
          <Alert severity='error' onClose={() => setError(null)}>
            {error}
          </Alert>
        </Grid>
      )}

      {/* Change summary */}
      <Grid item xs={12}>
        <div className='flex flex-wrap gap-2'>
          <Chip label={`${keptManifests.length} existing manifest(s)`} color='info' variant='tonal' />
          <Chip label={`${newManifests.length} new manifest(s)`} color='success' variant='tonal' />
          <Chip label={`${removedManifests.length} manifest(s) to remove`} color='error' variant='tonal' />
        </div>
      </Grid>

      {/* Trip Summary */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant='h6' className='mb-4'>
              Trip Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant='body2' color='text.secondary'>
                  Driver
                </Typography>
                <Typography variant='body1' className='font-semibold'>
                  {tripDetails.driverName || '-'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant='body2' color='text.secondary'>
                  Vehicle
                </Typography>
                <Typography variant='body1' className='font-semibold'>
                  {tripDetails.vehicleNumber || '-'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant='body2' color='text.secondary'>
                  Route
                </Typography>
                <Typography variant='body1' className='font-semibold'>
                  {tripDetails.routeName || '-'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant='body2' color='text.secondary'>
                  Start Time
                </Typography>
                <Typography variant='body1' className='font-semibold'>
                  {tripDetails.startTime ? new Date(tripDetails.startTime).toLocaleString() : '-'}
                </Typography>
              </Grid>
              {tripDetails.tonnage && (
                <Grid item xs={12} sm={6}>
                  <Typography variant='body2' color='text.secondary'>
                    Tonnage
                  </Typography>
                  <Typography variant='body1' className='font-semibold'>
                    {tripDetails.tonnage} tons
                  </Typography>
                </Grid>
              )}
              {tripDetails.tripCost !== undefined && tripDetails.tripCost > 0 && (
                <Grid item xs={12} sm={6}>
                  <Typography variant='body2' color='text.secondary'>
                    Trip Cost
                  </Typography>
                  <Typography variant='body1' className='font-semibold' color='primary'>
                    GH₵ {tripDetails.tripCost.toFixed(2)}
                  </Typography>
                </Grid>
              )}
              {tripDetails.notes && (
                <Grid item xs={12}>
                  <Typography variant='body2' color='text.secondary'>
                    Notes
                  </Typography>
                  <Typography variant='body1'>{tripDetails.notes}</Typography>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Manifests after saving */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant='h6' className='mb-4'>
              Manifests After Saving ({manifests.length}) — {getTotalPackages()} package(s)
            </Typography>

            {manifests.length === 0 ? (
              <Alert severity='warning'>
                All manifests have been removed. The trip will move back to <strong>"Awaiting Manifests"</strong> if it
                has not started yet.
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Manifest Number</TableCell>
                      <TableCell>Dropoff Location</TableCell>
                      <TableCell>Package Size</TableCell>
                      <TableCell>Package Count</TableCell>
                      <TableCell>Est. Arrival</TableCell>
                      <TableCell>State</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {manifests.map((manifest, index) => (
                      <TableRow key={manifest.tempId}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <Typography variant='body2' className='font-semibold'>
                            {manifest.manifestNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>{manifest.dropoffLocationName || '-'}</TableCell>
                        <TableCell>
                          {/* A manifest the driver captured in the field carries no size
                              until the office reviews it. */}
                          {manifest.packageSize ? (
                            <Chip
                              label={manifest.packageSize.charAt(0).toUpperCase() + manifest.packageSize.slice(1)}
                              size='small'
                              color={
                                manifest.packageSize === 'small'
                                  ? 'success'
                                  : manifest.packageSize === 'medium'
                                    ? 'warning'
                                    : 'error'
                              }
                              variant='tonal'
                            />
                          ) : (
                            <Chip label='Pending review' size='small' color='warning' variant='tonal' />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant='body1' className='font-semibold'>
                            {manifest.packageCount || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>{manifest.estimatedArrival || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={manifest.$id ? 'Existing' : 'New'}
                            size='small'
                            variant='tonal'
                            color={manifest.$id ? 'info' : 'success'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Manifests being removed */}
      {removedManifests.length > 0 && (
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant='h6' className='mb-4' color='error'>
                Manifests To Be Removed ({removedManifests.length})
              </Typography>
              <Alert severity='error' className='mb-4'>
                These manifests will be permanently deleted from this trip when you save.
              </Alert>
              <div className='flex flex-wrap gap-2'>
                {removedManifests.map((manifest: any) => (
                  <Chip
                    key={manifest.$id}
                    label={`${manifest.manifestNumber} (${manifest.packageSize ? `${manifest.packageCount} ${manifest.packageSize}` : 'pending review'})`}
                    color='error'
                    variant='tonal'
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Action Buttons */}
      <Grid item xs={12}>
        <div className='flex items-center justify-between'>
          <Button variant='outlined' onClick={handlePrev} disabled={submitting}>
            Previous: Manifests
          </Button>
          <div className='flex gap-2'>
            <Button
              variant='outlined'
              color='secondary'
              onClick={() => router.push(`/edms/trips/${tripData.$id}`)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant='contained'
              onClick={handleSubmit}
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} /> : <i className='ri-save-line' />}
            >
              {submitting ? 'Saving Changes...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Grid>
    </Grid>
  )
}

export default StepEditReview
