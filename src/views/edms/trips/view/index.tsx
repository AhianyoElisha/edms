'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Timeline from '@mui/lab/Timeline'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineConnector from '@mui/lab/TimelineConnector'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineDot from '@mui/lab/TimelineDot'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'

// Type Imports
import type { TripType } from '@/types/apps/deliveryTypes'

// Helper function to parse JSON fields safely
const parseJSON = (jsonString: string | null | undefined) => {
  if (!jsonString) return []
  try {
    return JSON.parse(jsonString)
  } catch {
    return []
  }
}

// Helper function to get status color
const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return 'success'
    case 'in-progress':
    case 'in_progress':
      return 'primary'
    case 'pending':
    case 'planned':
      return 'warning'
    case 'cancelled':
    case 'canceled':
      return 'error'
    default:
      return 'default'
  }
}

const TripView = ({ tripData }: { tripData: TripType }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'manifests' | 'checkpoints'>('overview')

  // Parse checkpoints
  const checkpoints = parseJSON(tripData.checkpoints)
  
  // Calculate progress
  const completedCheckpoints = checkpoints.filter((cp: any) => cp.status === 'completed').length
  const progressPercentage = checkpoints.length > 0 ? (completedCheckpoints / checkpoints.length) * 100 : 0

  return (
    <Grid container spacing={6}>
      {/* Header Card */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <div className='flex items-start justify-between flex-wrap gap-4'>
              <div>
                <Typography variant='h4' className='mb-2'>
                  Trip {tripData.tripNumber}
                </Typography>
                <div className='flex items-center gap-2 mb-2'>
                  <Chip
                    label={tripData.status}
                    color={getStatusColor(tripData.status)}
                    size='small'
                  />
                  {tripData.invoiceGenerated && (
                    <Chip
                      label='Invoice Generated'
                      color='info'
                      size='small'
                      variant='outlined'
                    />
                  )}
                </div>
                <Typography variant='body2' color='text.secondary'>
                  Created: {new Date(tripData.$createdAt).toLocaleString()}
                </Typography>
              </div>
              <div className='flex gap-2'>
                <Button
                  variant='outlined'
                  startIcon={<i className='ri-printer-line' />}
                >
                  Print
                </Button>
                <Button
                  variant='contained'
                  startIcon={<i className='ri-edit-line' />}
                >
                  Edit
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            <Box className='mt-4'>
              <div className='flex items-center justify-between mb-2'>
                <Typography variant='body2' className='font-semibold'>
                  Trip Progress
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {completedCheckpoints} of {checkpoints.length} checkpoints completed
                </Typography>
              </div>
              <LinearProgress
                variant='determinate'
                value={progressPercentage}
                className='h-2 rounded'
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Tabs */}
      <Grid item xs={12}>
        <Card>
          <div className='flex border-b'>
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('manifests')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'manifests'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              Manifests {tripData.manifests?.length && `(${tripData.manifests.length})`}
            </button>
            <button
              onClick={() => setActiveTab('checkpoints')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'checkpoints'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              Checkpoints {checkpoints.length && `(${checkpoints.length})`}
            </button>
          </div>

          <CardContent>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <Grid container spacing={4}>
                {/* Trip Details */}
                <Grid item xs={12} md={6}>
                  <Typography variant='h6' className='mb-3'>
                    Trip Details
                  </Typography>
                  <div className='space-y-3'>
                    <div>
                      <Typography variant='body2' color='text.secondary'>
                        Trip Number
                      </Typography>
                      <Typography variant='body1' className='font-semibold'>
                        {tripData.tripNumber}
                      </Typography>
                    </div>
                    <div>
                      <Typography variant='body2' color='text.secondary'>
                        Trip Date
                      </Typography>
                      <Typography variant='body1' className='font-semibold'>
                        {new Date(tripData.tripDate).toLocaleDateString()}
                      </Typography>
                    </div>
                    <div>
                      <Typography variant='body2' color='text.secondary'>
                        Start Time
                      </Typography>
                      <Typography variant='body1' className='font-semibold'>
                        {new Date(tripData.startTime).toLocaleString()}
                      </Typography>
                    </div>
                    <div>
                      <Typography variant='body2' color='text.secondary'>
                        Status
                      </Typography>
                      <Chip
                        label={tripData.status}
                        color={getStatusColor(tripData.status)}
                        size='small'
                      />
                    </div>
                    <div>
                      <Typography variant='body2' color='text.secondary'>
                        Current Checkpoint
                      </Typography>
                      <Typography variant='body1' className='font-semibold'>
                        {tripData.currentCheckpoint} of {checkpoints.length}
                      </Typography>
                    </div>
                    <div>
                      <Typography variant='body2' color='text.secondary'>
                        Distance Traveled
                      </Typography>
                      <Typography variant='body1' className='font-semibold'>
                        {tripData.distanceTraveled || 0} km
                      </Typography>
                    </div>
                  </div>
                </Grid>

                {/* Vehicle & Driver Info */}
                <Grid item xs={12} md={6}>
                  <Typography variant='h6' className='mb-3'>
                    Vehicle & Driver
                  </Typography>
                  <div className='space-y-3'>
                    <div>
                      <Typography variant='body2' color='text.secondary'>
                        Vehicle ID
                      </Typography>
                      <Typography variant='body1' className='font-semibold'>
                        {tripData.vehicle}
                      </Typography>
                    </div>
                    <div>
                      <Typography variant='body2' color='text.secondary'>
                        Driver ID
                      </Typography>
                      <Typography variant='body1' className='font-semibold'>
                        {tripData.driver}
                      </Typography>
                    </div>
                    <div>
                      <Typography variant='body2' color='text.secondary'>
                        Route ID
                      </Typography>
                      <Typography variant='body1' className='font-semibold'>
                        {tripData.route}
                      </Typography>
                    </div>
                  </div>

                  <Divider className='my-4' />

                  <Typography variant='h6' className='mb-3'>
                    Financial Information
                  </Typography>
                  <div className='space-y-3'>
                    <div>
                      <Typography variant='body2' color='text.secondary'>
                        Invoice Status
                      </Typography>
                      <Chip
                        label={tripData.invoiceGenerated ? 'Generated' : 'Not Generated'}
                        color={tripData.invoiceGenerated ? 'success' : 'default'}
                        size='small'
                      />
                    </div>
                    <div>
                      <Typography variant='body2' color='text.secondary'>
                        Invoice Amount
                      </Typography>
                      <Typography variant='body1' className='font-semibold'>
                        ${tripData.invoiceAmount?.toFixed(2) || '0.00'}
                      </Typography>
                    </div>
                    <div>
                      <Typography variant='body2' color='text.secondary'>
                        Payment Status
                      </Typography>
                      <Chip
                        label={tripData.paymentStatus}
                        color={tripData.paymentStatus === 'paid' ? 'success' : 'warning'}
                        size='small'
                      />
                    </div>
                  </div>
                </Grid>

                {/* Notes */}
                {tripData.notes && (
                  <Grid item xs={12}>
                    <Typography variant='h6' className='mb-2'>
                      Notes
                    </Typography>
                    <Card variant='outlined'>
                      <CardContent>
                        <Typography variant='body2'>{tripData.notes}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            )}

            {/* Manifests Tab */}
            {activeTab === 'manifests' && (
              <div>
                {tripData.manifests && tripData.manifests.length > 0 ? (
                  <div className='space-y-4'>
                    <Typography variant='body1'>
                      This trip has {tripData.manifests.length} manifest(s). Manifest details with packages will be loaded here.
                    </Typography>
                    <div className='grid gap-3'>
                      {tripData.manifests.map((manifestId: string, index: number) => (
                        <Card key={manifestId} variant='outlined'>
                          <CardContent>
                            <div className='flex items-center justify-between'>
                              <div>
                                <Typography variant='h6'>Manifest #{index + 1}</Typography>
                                <Typography variant='body2' color='text.secondary'>
                                  ID: {manifestId}
                                </Typography>
                              </div>
                              <Button size='small' variant='outlined'>
                                View Details
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className='text-center py-8'>
                    <i className='ri-file-list-line text-6xl text-textSecondary mb-2' />
                    <Typography variant='body1' color='text.secondary'>
                      No manifests found for this trip
                    </Typography>
                  </div>
                )}
              </div>
            )}

            {/* Checkpoints Tab */}
            {activeTab === 'checkpoints' && (
              <div>
                {checkpoints.length > 0 ? (
                  <Timeline position='right'>
                    {checkpoints.map((checkpoint: any, index: number) => (
                      <TimelineItem key={index}>
                        <TimelineSeparator>
                          <TimelineDot
                            color={
                              checkpoint.status === 'completed'
                                ? 'success'
                                : checkpoint.status === 'in-progress'
                                ? 'primary'
                                : 'grey'
                            }
                          >
                            {checkpoint.status === 'completed' ? (
                              <i className='ri-check-line' />
                            ) : checkpoint.status === 'in-progress' ? (
                              <i className='ri-time-line' />
                            ) : (
                              <i className='ri-map-pin-line' />
                            )}
                          </TimelineDot>
                          {index < checkpoints.length - 1 && <TimelineConnector />}
                        </TimelineSeparator>
                        <TimelineContent>
                          <Card variant='outlined' className='mb-4'>
                            <CardContent>
                              <div className='flex items-start justify-between'>
                                <div>
                                  <Typography variant='h6' className='mb-1'>
                                    {checkpoint.dropoffLocationName || `Checkpoint ${checkpoint.sequence}`}
                                  </Typography>
                                  <Chip
                                    label={checkpoint.status}
                                    color={getStatusColor(checkpoint.status)}
                                    size='small'
                                    className='mb-2'
                                  />
                                  <Typography variant='body2' color='text.secondary'>
                                    Sequence: {checkpoint.sequence}
                                  </Typography>
                                  {checkpoint.manifestId && (
                                    <Typography variant='caption' color='text.secondary' display='block'>
                                      Manifest ID: {checkpoint.manifestId}
                                    </Typography>
                                  )}
                                </div>
                                <div className='text-right'>
                                  {checkpoint.arrivalTime && (
                                    <Typography variant='body2' color='text.secondary'>
                                      Arrived: {new Date(checkpoint.arrivalTime).toLocaleString()}
                                    </Typography>
                                  )}
                                  {checkpoint.completionTime && (
                                    <Typography variant='body2' color='text.secondary'>
                                      Completed: {new Date(checkpoint.completionTime).toLocaleString()}
                                    </Typography>
                                  )}
                                </div>
                              </div>
                              
                              {/* Delivery Stats */}
                              <div className='flex gap-4 mt-3'>
                                <div>
                                  <Typography variant='caption' color='text.secondary'>
                                    Delivered
                                  </Typography>
                                  <Typography variant='body1' className='font-semibold'>
                                    {checkpoint.packagesDelivered || 0}
                                  </Typography>
                                </div>
                                <div>
                                  <Typography variant='caption' color='text.secondary'>
                                    Missing
                                  </Typography>
                                  <Typography variant='body1' className='font-semibold text-error'>
                                    {checkpoint.packagesMissing || 0}
                                  </Typography>
                                </div>
                                {checkpoint.gpsVerified && (
                                  <Chip
                                    label='GPS Verified'
                                    color='success'
                                    size='small'
                                    icon={<i className='ri-map-pin-line' />}
                                  />
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </TimelineContent>
                      </TimelineItem>
                    ))}
                  </Timeline>
                ) : (
                  <div className='text-center py-8'>
                    <i className='ri-map-pin-line text-6xl text-textSecondary mb-2' />
                    <Typography variant='body1' color='text.secondary'>
                      No checkpoints found for this trip
                    </Typography>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default TripView
