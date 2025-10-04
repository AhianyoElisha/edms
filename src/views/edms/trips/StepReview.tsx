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
import { createTripWithManifestsAndPackages } from '@/libs/actions/trip.actions'

const StepReview = ({ handlePrev, wizardData }: WizardStepProps) => {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { tripDetails, manifests, packages } = wizardData

  const getPackagesByManifest = (manifestTempId: string) => {
    return packages.filter(pkg => pkg.manifestTempId === manifestTempId)
  }

  const getTotalPackages = () => packages.length

  const getPackageSizeCounts = () => {
    return packages.reduce((acc, pkg) => {
      acc[pkg.packageSize] = (acc[pkg.packageSize] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  const getTotalItemCount = () => {
    return packages.reduce((total, pkg) => {
      if (pkg.isBin && pkg.itemCount) {
        return total + pkg.itemCount
      }
      return total + 1
    }, 0)
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      setError(null)

      const result = await createTripWithManifestsAndPackages(wizardData)

      if (result.success) {
        alert(`Trip created successfully!\nTrip Number: ${result.tripNumber}`)
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
                  Dropoff Locations
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography variant='body2' color='text.secondary'>
                  Total Packages/Bins
                </Typography>
                <Typography variant='h4' className='font-semibold'>
                  {getTotalPackages()}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  Across All Manifests
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography variant='body2' color='text.secondary'>
                  Total Items
                </Typography>
                <Typography variant='h4' className='font-semibold'>
                  {getTotalItemCount()}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  Including Bin Contents
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6}>
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

      {/* Manifests and Packages Details */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant='h6' className='mb-4'>
              Manifests & Packages
            </Typography>

            {manifests.map((manifest, manifestIndex) => {
              const manifestPackages = getPackagesByManifest(manifest.tempId)
              
              return (
                <div key={manifest.tempId} className='mb-6'>
                  {manifestIndex > 0 && <Divider className='my-4' />}
                  
                  {/* Manifest Header */}
                  <div className='flex items-start justify-between mb-3'>
                    <div>
                      <Typography variant='h6' className='font-semibold'>
                        {manifest.dropoffLocationName}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {manifest.dropoffAddress}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        Manifest: {manifest.manifestNumber}
                        {manifest.estimatedArrival && ` • Est. Arrival: ${manifest.estimatedArrival}`}
                      </Typography>
                    </div>
                    <Chip 
                      label={`${manifestPackages.length} package(s)`}
                      color='primary'
                      variant='tonal'
                    />
                  </div>

                  {/* Packages Table */}
                  {manifestPackages.length > 0 && (
                    <TableContainer>
                      <Table size='small'>
                        <TableHead>
                          <TableRow>
                            <TableCell>#</TableCell>
                            <TableCell>Tracking Number</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Recipient</TableCell>
                            <TableCell>Phone</TableCell>
                            <TableCell>Item Count</TableCell>
                            <TableCell>Notes</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {manifestPackages.map((pkg, pkgIndex) => (
                            <TableRow key={pkg.tempId}>
                              <TableCell>{pkgIndex + 1}</TableCell>
                              <TableCell>{pkg.trackingNumber}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={pkg.packageSize.charAt(0).toUpperCase() + pkg.packageSize.slice(1)} 
                                  size='small' 
                                  variant='tonal'
                                  color={pkg.isBin ? 'info' : 'default'}
                                />
                              </TableCell>
                              <TableCell>{pkg.recipientName}</TableCell>
                              <TableCell>{pkg.recipientPhone}</TableCell>
                              <TableCell>
                                {pkg.isBin && pkg.itemCount ? (
                                  <Chip label={`${pkg.itemCount} items`} size='small' color='info' variant='tonal' />
                                ) : (
                                  <span>1</span>
                                )}
                              </TableCell>
                              <TableCell>{pkg.notes || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </div>
              )
            })}
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
            Previous: Packages
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
          <Typography variant='body2'>
            • Trip will be created with {manifests.length} manifest(s) and {getTotalPackages()} package(s)
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
          <Typography variant='body2'>
            • Package checkboxes must be verified during delivery
          </Typography>
        </Alert>
      </Grid>
    </Grid>
  )
}

export default StepReview
