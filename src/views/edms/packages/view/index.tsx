'use client'

// React Imports
import { useMemo, useState } from 'react'

// Next Imports
import Link from 'next/link'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import Avatar from '@mui/material/Avatar'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'

// Timeline Imports
import TimelineDot from '@mui/lab/TimelineDot'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineConnector from '@mui/lab/TimelineConnector'
import MuiTimeline from '@mui/lab/Timeline'
import type { TimelineProps } from '@mui/lab/Timeline'
import { styled } from '@mui/material/styles'

// Styled Timeline component
const Timeline = styled(MuiTimeline)<TimelineProps>({
  paddingLeft: 0,
  paddingRight: 0,
  '& .MuiTimelineItem-root': {
    width: '100%',
    '&:before': {
      display: 'none'
    }
  }
})

const parseJSON = (value: unknown) => {
  if (!value || typeof value !== 'string') return []
  try {
    return JSON.parse(value)
  } catch (error) {
    console.warn('Failed to parse JSON value', value)
    return []
  }
}

const formatDateTime = (value?: unknown) => {
  if (value === null || value === undefined) return '—'

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString()
    }

    return value.toString()
  }

  return '—'
}

const getStatusColor = (
  status: string
): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
  switch (status?.toLowerCase()) {
    case 'delivered':
    case 'completed':
      return 'success'
    case 'out-for-delivery':
    case 'in-transit':
    case 'picked-up':
      return 'primary'
    case 'pending':
      return 'warning'
    case 'failed':
    case 'cancelled':
    case 'canceled':
      return 'error'
    default:
      return 'default'
  }
}

const getTimelineDotColor = (status: string): 'inherit' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' | 'grey' => {
  const color = getStatusColor(status)
  return color === 'default' ? 'grey' : color
}

const toDisplayText = (value: unknown, fallback = '—') => {
  if (value === null || value === undefined) return fallback

  if (typeof value === 'string') return value
  if (typeof value === 'number') return value.toString()

  return fallback
}

const getSizeLabel = (size?: string) => {
  if (!size) return '—'
  return size.charAt(0).toUpperCase() + size.slice(1)
}

const getLocation = (packageData: any, key: 'pickup' | 'dropoff') => {
  const directKey = key === 'pickup' ? 'pickuplocation' : 'dropofflocation'
  const camelKey = key === 'pickup' ? 'pickupLocation' : 'dropoffLocation'

  if (packageData[camelKey]) return packageData[camelKey]
  if (packageData[directKey]) return packageData[directKey]

  if (packageData.manifest) {
    const manifest = packageData.manifest
    if (manifest[camelKey]) return manifest[camelKey]
    if (manifest[directKey]) return manifest[directKey]
  }

  return null
}

const PackageView = ({ packageData }: { packageData: any }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity'>('overview')

  console.log('Package Data:', packageData)

  const deliveryHistory = useMemo(() => {
    if (Array.isArray(packageData.deliveryHistory)) return packageData.deliveryHistory
    if (packageData.history && Array.isArray(packageData.history)) return packageData.history
    return parseJSON(packageData.deliveryHistory || packageData.history)
  }, [packageData.deliveryHistory, packageData.history])

  const pickupLocation = getLocation(packageData, 'pickup')
  const dropoffLocation = getLocation(packageData, 'dropoff')
  const manifest = packageData.manifest
  const trip = manifest?.trip

  const isBin = Boolean(packageData.isBin)
  const status = packageData.status || 'pending'

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <div className='flex flex-wrap items-start justify-between gap-4'>
              <div>
                <Typography variant='h4' className='mb-2'>
                  Package {packageData.trackingNumber}
                </Typography>
                <div className='flex flex-wrap items-center gap-2 mb-3'>
                  <Chip
                    label={status}
                    color={getStatusColor(status)}
                    size='small'
                  />
                  <Chip
                    label={`Size: ${getSizeLabel(packageData.packageSize)}`}
                    size='small'
                    color='info'
                    icon={<i className='ri-archive-line' />}
                  />
                  {isBin && (
                    <Chip
                      label={`Bin • ${packageData.itemCount || 0} items`}
                      size='small'
                      color='secondary'
                      icon={<i className='ri-stack-line' />}
                    />
                  )}
                </div>
                <Typography variant='body2' color='text.secondary'>
                  Last updated: {formatDateTime(packageData.$updatedAt)}
                </Typography>
              </div>
              <div className='flex flex-wrap gap-2'>
                {manifest?.$id && (
                  <Link href={`/edms/manifests/${manifest.$id}`} passHref>
                    <Button variant='outlined' startIcon={<i className='ri-file-list-3-line' />}>
                      View Manifest
                    </Button>
                  </Link>
                )}
                {trip?.$id && (
                  <Link href={`/edms/trips/${trip.$id}`} passHref>
                    <Button variant='contained' startIcon={<i className='ri-route-line' />}>
                      View Trip
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Grid>

      {/* Tabs */}
      <Grid item xs={12}>
        <Card>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            aria-label='package details tabs'
          >
            <Tab
              label='Overview'
              value='overview'
              icon={<i className='ri-dashboard-line' />}
              iconPosition='start'
            />
            <Tab
              label={`Activity ${deliveryHistory.length ? `(${deliveryHistory.length})` : ''}`}
              value='activity'
              icon={<i className='ri-timeline-view' />}
              iconPosition='start'
            />
          </Tabs>

          <CardContent>
            {activeTab === 'overview' && (
              <Grid container spacing={4}>
                <Grid item xs={12} lg={4}>
                  <Card variant='outlined' className='h-full'>
                    <CardContent>
                      <div className='flex items-center gap-3 mb-4'>
                        <Avatar className='bg-primary' sx={{ width: 48, height: 48 }}>
                          <i className='ri-archive-2-line text-2xl' />
                        </Avatar>
                        <div>
                          <Typography variant='h6' className='font-bold'>
                            Package Summary
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            Core package information
                          </Typography>
                        </div>
                      </div>

                      <div className='space-y-3'>
                        <div>
                          <Typography variant='body2' color='text.secondary'>
                            Tracking Number
                          </Typography>
                          <Typography variant='body1' className='font-semibold'>
                            {packageData.trackingNumber}
                          </Typography>
                        </div>

                        <div>
                          <Typography variant='body2' color='text.secondary'>
                            Status
                          </Typography>
                          <Chip
                            label={status}
                            color={getStatusColor(status)}
                            size='small'
                          />
                        </div>

                        <div>
                          <Typography variant='body2' color='text.secondary'>
                            Expected Delivery
                          </Typography>
                          <Typography variant='body1' className='font-semibold'>
                            {formatDateTime(packageData.expectedDeliveryDate)}
                          </Typography>
                        </div>

                        <div>
                          <Typography variant='body2' color='text.secondary'>
                            Delivered On
                          </Typography>
                          <Typography variant='body1' className='font-semibold'>
                            {formatDateTime(packageData.deliveryDate)}
                          </Typography>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} lg={4}>
                  <Card variant='outlined' className='h-full'>
                    <CardContent>
                      <div className='flex items-center gap-3 mb-4'>
                        <Avatar className='bg-success' sx={{ width: 48, height: 48 }}>
                          <i className='ri-user-smile-line text-2xl' />
                        </Avatar>
                        <div>
                          <Typography variant='h6' className='font-bold'>
                            Recipient Details
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            Who receives this package
                          </Typography>
                        </div>
                      </div>

                      <div className='space-y-3'>
                        <div>
                          <Typography variant='body2' color='text.secondary'>
                            Recipient Name
                          </Typography>
                          <Typography variant='body1' className='font-semibold text-capitalize'>
                            {packageData.recipient || '—'}
                          </Typography>
                        </div>

                        <div>
                          <Typography variant='body2' color='text.secondary'>
                            Phone
                          </Typography>
                          <Typography variant='body1' className='font-semibold'>
                            {packageData.recipientPhone || '—'}
                          </Typography>
                        </div>

                        <div>
                          <Typography variant='body2' color='text.secondary'>
                            Notes
                          </Typography>
                          <Typography variant='body2'>
                            {packageData.notes || 'No special delivery notes provided.'}
                          </Typography>
                        </div>

                        {isBin && (
                          <Divider className='my-2' />
                        )}

                        {isBin && (
                          <div className='space-y-1'>
                            <Typography variant='body2' color='text.secondary'>
                              Bin Information
                            </Typography>
                            <Typography variant='body1' className='font-semibold'>
                              Contains {packageData.itemCount || 0} items
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                              Ensure all items are accounted for at dropoff.
                            </Typography>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} lg={4}>
                  <Card variant='outlined' className='h-full'>
                    <CardContent>
                      <div className='flex items-center gap-3 mb-4'>
                        <Avatar className='bg-info' sx={{ width: 48, height: 48 }}>
                          <i className='ri-file-list-3-line text-2xl' />
                        </Avatar>
                        <div>
                          <Typography variant='h6' className='font-bold'>
                            Manifest & Trip
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            Linked fulfillment records
                          </Typography>
                        </div>
                      </div>

                      {manifest ? (
                        <div className='space-y-3'>
                          <div>
                            <Typography variant='body2' color='text.secondary'>
                              Manifest Number
                            </Typography>
                            <Typography variant='body1' className='font-semibold'>
                              {manifest.manifestNumber || manifest.$id}
                            </Typography>
                          </div>

                          <div className='flex flex-wrap items-center gap-2'>
                            <Chip
                              label={manifest.status || 'unknown'}
                              size='small'
                              color={getStatusColor(manifest.status || '')}
                            />
                            <Chip
                              label={`${manifest.totalPackages || manifest.packages?.length || 0} packages`}
                              size='small'
                              icon={<i className='ri-inbox-line' />}
                            />
                          </div>

                          <Divider className='my-2' />

                          {trip ? (
                            <div className='space-y-2'>
                              <Typography variant='body2' color='text.secondary'>
                                Trip
                              </Typography>
                              <Typography variant='body1' className='font-semibold'>
                                {trip.tripNumber || trip.$id}
                              </Typography>
                              <Chip
                                label={trip.status || '—'}
                                size='small'
                                color={getStatusColor(trip.status || '')}
                              />
                            </div>
                          ) : (
                            <Typography variant='body2' color='text.secondary'>
                              Trip information not available.
                            </Typography>
                          )}
                        </div>
                      ) : (
                        <Typography variant='body2' color='text.secondary'>
                          This package is not linked to a manifest yet.
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} lg={6}>
                  <Card variant='outlined' className='h-full'>
                    <CardContent>
                      <div className='flex items-center gap-3 mb-4'>
                        <Avatar className='bg-warning' sx={{ width: 48, height: 48 }}>
                          <i className='ri-map-pin-line text-2xl' />
                        </Avatar>
                        <div>
                          <Typography variant='h6' className='font-bold'>
                            Pickup Location
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            Where the journey starts
                          </Typography>
                        </div>
                      </div>

                      {/* {pickupLocation ? (
                        <Box className='space-y-2'>
                          <Typography variant='body1' className='font-semibold'>
                            {pickupLocation.locationName || pickupLocation.name || pickupLocation.$id || pickupLocation}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {pickupLocation.address || pickupLocation.locationCode || 'No address provided.'}
                          </Typography>
                          {pickupLocation.contactPerson && (
                            <Typography variant='caption' color='text.secondary' display='block'>
                              Contact: {pickupLocation.contactPerson}
                            </Typography>
                          )}
                        </Box>
                      ) : ( */}
                        <Typography variant='body2' color='text.secondary'>
                          Pickup location information not available.
                        </Typography>
                      {/* )} */}
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} lg={6}>
                  <Card variant='outlined' className='h-full'>
                    <CardContent>
                      <div className='flex items-center gap-3 mb-4'>
                        <Avatar className='bg-error' sx={{ width: 48, height: 48 }}>
                          <i className='ri-map-pin-2-line text-2xl' />
                        </Avatar>
                        <div>
                          <Typography variant='h6' className='font-bold'>
                            Dropoff Location
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            Final destination
                          </Typography>
                        </div>
                      </div>

                      {dropoffLocation ? (
                        <Box className='space-y-2'>
                          <Typography variant='body1' className='font-semibold'>
                            {dropoffLocation.locationName || dropoffLocation.name || dropoffLocation.$id || dropoffLocation}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {dropoffLocation.address || dropoffLocation.locationCode || 'No address provided.'}
                          </Typography>
                          {dropoffLocation.contactPerson && (
                            <Typography variant='caption' color='text.secondary' display='block'>
                              Contact: {dropoffLocation.contactPerson}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography variant='body2' color='text.secondary'>
                          Dropoff location information not available.
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Card variant='outlined'>
                    <CardContent>
                      <div className='flex flex-wrap items-center justify-between gap-4 mb-3'>
                        <div className='flex items-center gap-3'>
                          <Avatar className='bg-secondary' sx={{ width: 40, height: 40 }}>
                            <i className='ri-information-line text-xl' />
                          </Avatar>
                          <div>
                            <Typography variant='h6' className='font-bold'>
                              Additional Information
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                              Creation metadata & identifiers
                            </Typography>
                          </div>
                        </div>
                        <Chip
                          label={`Created ${formatDateTime(packageData.$createdAt)}`}
                          size='small'
                          variant='outlined'
                          icon={<i className='ri-time-line' />}
                        />
                      </div>

                      <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                          <Typography variant='caption' color='text.secondary' className='uppercase tracking-wide'>
                            Package ID
                          </Typography>
                          <Typography variant='body2' className='font-semibold break-all'>
                            {packageData.trackingNumber}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography variant='caption' color='text.secondary' className='uppercase tracking-wide'>
                            Manifest ID
                          </Typography>
                          <Typography variant='body2' className='font-semibold break-all'>
                            {manifest?.manifestNumber || '—'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography variant='caption' color='text.secondary' className='uppercase tracking-wide'>
                            Trip ID
                          </Typography>
                          <Typography variant='body2' className='font-semibold break-all'>
                            {trip?.tripNumber || '—'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {activeTab === 'activity' && (
              <div>
                {deliveryHistory && deliveryHistory.length > 0 ? (
                  <Timeline position='right'>
                    {deliveryHistory.map((event: any, index: number) => {
                      const statusLabel = toDisplayText(event?.status ?? event?.title, 'Update')
                      const timestamp = event?.timestamp ?? event?.date ?? event?.time
                      const descriptionText = toDisplayText(event?.description ?? event?.details, 'Status updated.')
                      const locationText = toDisplayText(event?.location, '')

                      return (
                        <TimelineItem key={`${statusLabel}-${index}`}>
                          <TimelineSeparator>
                            <TimelineDot color={getTimelineDotColor(statusLabel)}>
                              <i className='ri-checkbox-circle-line' />
                            </TimelineDot>
                            {index < deliveryHistory.length - 1 && <TimelineConnector />}
                          </TimelineSeparator>
                          <TimelineContent>
                            <Card variant='outlined' className='mb-4'>
                              <CardContent>
                                <div className='flex flex-wrap items-center justify-between gap-3 mb-1'>
                                  <Typography variant='h6' className='font-semibold text-capitalize'>
                                    {statusLabel.replaceAll('-', ' ')}
                                  </Typography>
                                  <Typography variant='caption' color='text.secondary'>
                                    {formatDateTime(timestamp)}
                                  </Typography>
                                </div>
                                <Typography variant='body2'>
                                  {descriptionText}
                                </Typography>
                                {locationText !== '—' && locationText !== '' && (
                                  <Typography variant='caption' color='text.secondary' display='block' className='mt-2'>
                                    Location: {locationText}
                                  </Typography>
                                )}
                              </CardContent>
                            </Card>
                          </TimelineContent>
                        </TimelineItem>
                      )
                    })}
                  </Timeline>
                ) : (
                  <div className='text-center py-12'>
                    <Avatar className='bg-grey-200 mx-auto mb-4' sx={{ width: 80, height: 80 }}>
                      <i className='ri-timeline-view text-4xl text-textSecondary' />
                    </Avatar>
                    <Typography variant='h6' color='text.secondary' className='mb-1'>
                      No delivery activity yet
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Updates will appear here as this package moves through checkpoints.
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

export default PackageView
