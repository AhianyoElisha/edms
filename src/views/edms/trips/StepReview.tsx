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
import Divider from '@mui/material/Divider'
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
import type { WizardStepProps } from './types'

// Actions
import { createTripWithManifests } from '@/libs/actions/trip.actions'

// Third-party Imports
import { toast } from 'react-toastify'

const StepReview = ({ handlePrev, wizardData }: WizardStepProps) => {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { tripDetails, manifests } = wizardData

  // Calculate total packages across all manifests
  const getTotalPackages = () => manifests.reduce((sum, m) => sum + m.packageCount, 0)

  // Get package counts by size
  const getPackageSizeCounts = () => {
    return manifests.reduce((acc, manifest) => {
      acc[manifest.packageSize] = (acc[manifest.packageSize] || 0) + manifest.packageCount
      return acc
    }, {} as Record<string, number>)
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      setError(null)

      console.log('📤 Submitting wizard data to backend:', JSON.stringify(wizardData, null, 2))
      console.log('📊 Summary:', {
        manifests: wizardData.manifests.length,
        totalPackages: getTotalPackages(),
        tripDate: wizardData.tripDetails.startTime
      })

      const result = await createTripWithManifests(wizardData)

      if (result.success) {
        toast.success(`Trip created successfully! Trip Number: ${result.tripNumber}`, {
          position: 'top-right',
          autoClose: 5000,
        })
        router.push(`/edms/trips/${result.tripId}`)
      } else {
        throw new Error(result.error || 'Failed to create trip')
      }
    } catch (err: any) {
      console.error('Error creating trip:', err)
      setError(err.message || 'An error occurred while creating the trip')
      setSubmitting(false)
    }
  }

  return (
    <Grid container spacing={5}>
      <Grid item xs={12}>
        <Typography variant='h5' className='mb-1'>
          Review Trip Details
        </Typography>
        <Typography variant='body2'>
          Please review all details before creating the trip
        </Typography>
      </Grid>

      {error && (
        <Grid item xs={12}>
          <Alert severity='error' onClose={() => setError(null)}>
            {error}
          </Alert>
        </Grid>
      )}

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
                  {tripDetails.driverName}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant='body2' color='text.secondary'>
                  Vehicle
                </Typography>
                <Typography variant='body1' className='font-semibold'>
                  {tripDetails.vehicleNumber}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant='body2' color='text.secondary'>
                  Route
                </Typography>
                <Typography variant='body1' className='font-semibold'>
                  {tripDetails.routeName}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant='body2' color='text.secondary'>
                  Start Time
                </Typography>
                <Typography variant='body1' className='font-semibold'>
                  {new Date(tripDetails.startTime).toLocaleString()}
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
                  <Typography variant='body1'>
                    {tripDetails.notes}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Summary Stats */}
      <Grid item xs={12}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography variant='body2' color='text.secondary'>
                  Total Manifests
                </Typography>
                <Typography variant='h4' className='font-semibold'>
                  {manifests.length}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {manifests.length === 0 ? 'Manifests will be added later' : 'Dropoff Locations'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography variant='body2' color='text.secondary'>
                  Total Packages
                </Typography>
                <Typography variant='h4' className='font-semibold'>
                  {getTotalPackages()}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  Head Count Across All Manifests
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography variant='body2' color='text.secondary' className='mb-2'>
                  By Size
                </Typography>
                <div className='flex flex-wrap gap-1'>
                  {Object.entries(getPackageSizeCounts()).map(([size, count]) => (
                    <Chip 
                      key={size} 
                      label={`${size.charAt(0).toUpperCase() + size.slice(1)}: ${count}`} 
                      size='small' 
                      color='primary' 
                      variant='tonal' 
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      {/* Manifests Details */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant='h6' className='mb-4'>
              Manifests Overview
            </Typography>

            {manifests.length === 0 ? (
              <Alert severity='warning'>
                <Typography variant='body2' className='font-semibold mb-1'>
                  No Manifests Added
                </Typography>
                <Typography variant='body2'>
                  This trip will be created with an <strong>"Awaiting Manifests"</strong> status. 
                  You can add manifests later from the trip details page.
                </Typography>
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Manifest Number</TableCell>
                      <TableCell>Dropoff Location</TableCell>
                      <TableCell>Address</TableCell>
                      <TableCell>Package Size</TableCell>
                      <TableCell>Package Count</TableCell>
                      <TableCell>Est. Arrival</TableCell>
                      <TableCell>Notes</TableCell>
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
                        <TableCell>{manifest.dropoffLocationName}</TableCell>
                        <TableCell>
                          <Typography variant='body2' color='text.secondary'>
                            {manifest.dropoffAddress}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={manifest.packageSize.charAt(0).toUpperCase() + manifest.packageSize.slice(1)} 
                            size='small' 
                            color={
                              manifest.packageSize === 'small' ? 'success' : 
                              manifest.packageSize === 'medium' ? 'warning' : 
                              'error'
                            }
                            variant='tonal'
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant='body1' className='font-semibold'>
                            {manifest.packageCount}
                          </Typography>
                        </TableCell>
                        <TableCell>{manifest.estimatedArrival || '-'}</TableCell>
                        <TableCell>{manifest.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Action Buttons */}
      <Grid item xs={12}>
        <div className='flex items-center justify-between'>
          <Button 
            variant='outlined' 
            onClick={handlePrev}
            disabled={submitting}
          >
            Previous: Manifests
          </Button>
          <Button 
            variant='contained' 
            onClick={handleSubmit}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : <i className='ri-check-line' />}
          >
            {submitting ? 'Creating Trip...' : 'Create Trip'}
          </Button>
        </div>
      </Grid>

      {/* Important Notes */}
      <Grid item xs={12}>
        <Alert severity='info'>
          <Typography variant='body2' className='font-semibold mb-1'>
            What happens next?
          </Typography>
          {manifests.length > 0 ? (
            <>
              <Typography variant='body2'>
                • Trip will be created with {manifests.length} manifest(s) containing {getTotalPackages()} total packages
              </Typography>
              <Typography variant='body2'>
                • Each manifest tracks packages of a single size type (small, medium, or big)
              </Typography>
              <Typography variant='body2'>
                • Driver will be able to track progress through each dropoff location
              </Typography>
              <Typography variant='body2'>
                • GPS verification (200m radius) required at each dropoff
              </Typography>
              <Typography variant='body2'>
                • Manifest proof of delivery with signatures required at each location
              </Typography>
            </>
          ) : (
            <>
              <Typography variant='body2'>
                • Trip will be created with <strong>"Awaiting Manifests"</strong> status
              </Typography>
              <Typography variant='body2'>
                • You can add manifests later from the trip details page
              </Typography>
              <Typography variant='body2'>
                • Trip will automatically move to "Planned" status once manifests are added
              </Typography>
              <Typography variant='body2'>
                • The trip overview will highlight trips awaiting manifests for easy identification
              </Typography>
            </>
          )}
        </Alert>
      </Grid>
    </Grid>
  )
}

export default StepReview
