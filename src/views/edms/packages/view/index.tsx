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
import { Breadcrumbs } from '@mui/material'
import StyledBreadcrumb from '@/components/layout/shared/Breadcrumbs'
import { useRouter } from 'next/navigation'

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

  const router = useRouter()

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
    <>
      <Typography className='mt-4' variant='h4'>Package Details - {packageData.trackingNumber}</Typography>
      <Divider className='my-8' />
      <Breadcrumbs aria-label="breadcrumb" className='mt-10 ml-5 mb-5'>
        <StyledBreadcrumb 
          component="a"
          onClick={() => router.back()}
          icon={<i className='ri-menu-4-line' />}
          className='cursor-pointer'
          label="Back" 
        />
        <StyledBreadcrumb
          label="Details"
          icon={<i className='ri-stack-line' />}
          className='cursor-pointer'
          disabled
        />
      </Breadcrumbs>
      {/* Header Info */}
      <Card className='mb-6'>
        <CardContent>
          <div className='flex flex-wrap items-start justify-between gap-4'>
            <div className='flex flex-wrap items-center gap-2'>
              <Typography variant='body2' color='text.secondary'>
                Status:
              </Typography>
              <Chip
                label={status?.charAt(0).toUpperCase() + status?.slice(1)}
                color={getStatusColor(status)}
                variant='tonal'
                size='small'
              />
              <Chip
                label={`Size: ${getSizeLabel(packageData.packageSize)}`}
                size='small'
                color='info'
                variant='tonal'
              />
              {isBin && (
                <Chip
                  label={`Bin • ${packageData.itemCount || 0} items`}
                  size='small'
                  color='secondary'
                  variant='tonal'
                />
              )}
            </div>
            <div className='flex flex-wrap gap-2'>
              {manifest?.$id && (
                <Link href={`/edms/manifests/${manifest.$id}`} passHref>
                  <Button variant='outlined' size='small' startIcon={<i className='ri-file-list-line' />}>
                    View Manifest
                  </Button>
                </Link>
              )}
              {trip?.$id && (
                <Link href={`/edms/trips/${trip.$id}`} passHref>
                  <Button variant='outlined' size='small' startIcon={<i className='ri-truck-line' />}>
                    View Trip
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
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
            <Grid container spacing={6}>
              {/* Package Summary */}
              <Grid item xs={12} sm={6} lg={3}>
                <div className='flex items-center gap-4 overflow-hidden'>
                  <Avatar variant='rounded' className='bg-primary'>
                    <i className='ri-archive-line' />
                  </Avatar>
                  <div className='overflow-hidden'>
                    <Typography variant='h5' className='truncate'>{packageData.trackingNumber}</Typography>
                    <Typography variant='body2'>Tracking Number</Typography>
                  </div>
                </div>
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <div className='flex items-center gap-4 overflow-hidden'>
                  <Avatar variant='rounded' className='bg-info'>
                    <i className='ri-box-3-line' />
                  </Avatar>
                  <div className='overflow-hidden'>
                    <Typography variant='h5'>{getSizeLabel(packageData.packageSize)}</Typography>
                    <Typography variant='body2'>Package Size</Typography>
                  </div>
                </div>
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <div className='flex items-center gap-4 overflow-hidden'>
                  <Avatar variant='rounded' className='bg-warning'>
                    <i className='ri-weight-line' />
                  </Avatar>
                  <div className='overflow-hidden'>
                    <Typography variant='h5'>{packageData.weight ? `${packageData.weight} kg` : 'N/A'}</Typography>
                    <Typography variant='body2'>Weight</Typography>
                  </div>
                </div>
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <div className='flex items-center gap-4 overflow-hidden'>
                  <Avatar variant='rounded' className='bg-success'>
                    <i className='ri-money-dollar-circle-line' />
                  </Avatar>
                  <div className='overflow-hidden'>
                    <Typography variant='h5'>${Number(packageData.declaredValue || 0).toFixed(2)}</Typography>
                    <Typography variant='body2'>Declared Value</Typography>
                  </div>
                </div>
              </Grid>

              {/* Package Details */}
              <Grid item xs={12}>
                <Divider />
              </Grid>

              <Grid item xs={12} sm={6} lg={3}>
                <Typography variant='body2' color='text.secondary'>Package Type</Typography>
                <Typography className='font-medium'>{packageData.packageType || 'Standard'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <Typography variant='body2' color='text.secondary'>Expected Delivery</Typography>
                <Typography className='font-medium'>
                  {packageData.expectedDeliveryDate ? new Date(packageData.expectedDeliveryDate).toLocaleDateString() : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <Typography variant='body2' color='text.secondary'>Actual Delivery</Typography>
                <Typography className='font-medium'>
                  {packageData.deliveryDate ? new Date(packageData.deliveryDate).toLocaleDateString() : 'Not delivered'}
                </Typography>
              </Grid>
              {isBin && packageData.itemCount && (
                <Grid item xs={12} sm={6} lg={3}>
                  <Typography variant='body2' color='text.secondary'>Item Count (Bin)</Typography>
                  <Typography className='font-medium'>{packageData.itemCount} items</Typography>
                </Grid>
              )}

              {/* Divider */}
              <Grid item xs={12}>
                <Divider />
              </Grid>

              {/* Recipient Information */}
              <Grid item xs={12} md={6}>
                <Typography variant='h6' className='mb-4'>Recipient Information</Typography>
                <Typography color='text.secondary' className='mb-1'>
                  <strong>Name:</strong> {packageData.recipient || packageData.recipientName || 'N/A'}
                </Typography>
                <Typography color='text.secondary' className='mb-1'>
                  <strong>Phone:</strong> {packageData.recipientPhone || 'N/A'}
                </Typography>
                {packageData.recipientEmail && (
                  <Typography color='text.secondary' className='mb-1'>
                    <strong>Email:</strong> {packageData.recipientEmail}
                  </Typography>
                )}
              </Grid>

              {/* Sender Information (if available) */}
              {(packageData.senderName || packageData.senderEmail || packageData.senderPhone) && (
                <Grid item xs={12} md={6}>
                  <Typography variant='h6' className='mb-4'>Sender Information</Typography>
                  <Typography color='text.secondary' className='mb-1'>
                    <strong>Name:</strong> {packageData.senderName || 'N/A'}
                  </Typography>
                  {packageData.senderPhone && (
                    <Typography color='text.secondary' className='mb-1'>
                      <strong>Phone:</strong> {packageData.senderPhone}
                    </Typography>
                  )}
                  {packageData.senderEmail && (
                    <Typography color='text.secondary' className='mb-1'>
                      <strong>Email:</strong> {packageData.senderEmail}
                    </Typography>
                  )}
                </Grid>
              )}

              {/* Divider */}
              <Grid item xs={12}>
                <Divider />
              </Grid>

              {/* Pickup Location */}
              <Grid item xs={12} md={6}>
                <Typography variant='h6' className='mb-4'>Pickup Location</Typography>
                {pickupLocation && typeof pickupLocation === 'object' ? (
                  <>
                    <Typography color='text.secondary' className='mb-1'>
                      <strong>Location:</strong> {pickupLocation.locationName || 'N/A'}
                    </Typography>
                    {pickupLocation.address && (
                      <Typography color='text.secondary' className='mb-1'>
                        <strong>Address:</strong> {pickupLocation.address}
                      </Typography>
                    )}
                    {pickupLocation.city && (
                      <Typography color='text.secondary' className='mb-1'>
                        <strong>City:</strong> {pickupLocation.city}, {pickupLocation.region}
                      </Typography>
                    )}
                    {pickupLocation.contactPerson && (
                      <Typography color='text.secondary' className='mb-1'>
                        <strong>Contact:</strong> {pickupLocation.contactPerson} {pickupLocation.contactPhone && `(${pickupLocation.contactPhone})`}
                      </Typography>
                    )}
                  </>
                ) : (
                  <Typography color='text.secondary'>{pickupLocation || 'N/A'}</Typography>
                )}
              </Grid>

              {/* Dropoff Location */}
              <Grid item xs={12} md={6}>
                <Typography variant='h6' className='mb-4'>Dropoff Location</Typography>
                {dropoffLocation && typeof dropoffLocation === 'object' ? (
                  <>
                    <Typography color='text.secondary' className='mb-1'>
                      <strong>Location:</strong> {dropoffLocation.locationName || 'N/A'}
                    </Typography>
                    {dropoffLocation.address && (
                      <Typography color='text.secondary' className='mb-1'>
                        <strong>Address:</strong> {dropoffLocation.address}
                      </Typography>
                    )}
                    {dropoffLocation.city && (
                      <Typography color='text.secondary' className='mb-1'>
                        <strong>City:</strong> {dropoffLocation.city}, {dropoffLocation.region}
                      </Typography>
                    )}
                    {dropoffLocation.contactPerson && (
                      <Typography color='text.secondary' className='mb-1'>
                        <strong>Contact:</strong> {dropoffLocation.contactPerson} {dropoffLocation.contactPhone && `(${dropoffLocation.contactPhone})`}
                      </Typography>
                    )}
                  </>
                ) : (
                  <Typography color='text.secondary'>{dropoffLocation || 'N/A'}</Typography>
                )}
              </Grid>

              {/* Additional Details */}
              <Grid item xs={12}>
                <Divider />
              </Grid>

              <Grid item xs={12} sm={6} lg={3}>
                <Typography variant='body2' color='text.secondary'>Created Date</Typography>
                <Typography className='font-medium'>
                  {new Date(packageData.$createdAt).toLocaleDateString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <Typography variant='body2' color='text.secondary'>Last Updated</Typography>
                <Typography className='font-medium'>
                  {new Date(packageData.$updatedAt).toLocaleDateString()}
                </Typography>
              </Grid>
              {manifest && (
                <>
                  <Grid item xs={12} sm={6} lg={3}>
                    <Typography variant='body2' color='text.secondary'>Manifest</Typography>
                    <Typography className='font-medium'>{manifest.manifestNumber || manifest.$id}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} lg={3}>
                    <Typography variant='body2' color='text.secondary'>Dropoff Sequence</Typography>
                    <Typography className='font-medium'>#{manifest.dropoffSequence || 'N/A'}</Typography>
                  </Grid>
                </>
              )}

              {(packageData.specialInstructions || packageData.notes) && (
                <>
                  <Grid item xs={12}>
                    <Divider />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant='h6' className='mb-2'>Special Instructions / Notes</Typography>
                    <Typography color='text.secondary'>{packageData.specialInstructions || packageData.notes}</Typography>
                  </Grid>
                </>
              )}
            </Grid>
          )}

          {activeTab === 'activity' && (
            <div>
              {deliveryHistory && deliveryHistory.length > 0 ? (
                <Timeline position='right'>
                  {deliveryHistory.map((event: any, index: number) => {
                    const eventStatus = toDisplayText(event.status, 'pending')
                    const statusLabel = eventStatus.charAt(0).toUpperCase() + eventStatus.slice(1)
                    const timestamp = formatDateTime(event.timestamp || event.date)
                    const description = toDisplayText(event.description || event.message, 'No description')
                    const location = toDisplayText(event.location, '')

                    return (
                      <TimelineItem key={index}>
                        <TimelineSeparator>
                          <TimelineDot color={getTimelineDotColor(eventStatus)} sx={{ width: 40, height: 40 }}>
                            <i className='ri-map-pin-line' />
                          </TimelineDot>
                          {index < deliveryHistory.length - 1 && <TimelineConnector />}
                        </TimelineSeparator>
                        <TimelineContent>
                          <Card className='mb-4'>
                            <CardContent>
                              <div className='flex items-start justify-between flex-wrap gap-2 mb-2'>
                                <Typography variant='h6'>{statusLabel}</Typography>
                                <Chip
                                  label={statusLabel}
                                  variant='tonal'
                                  color={getStatusColor(eventStatus)}
                                  size='small'
                                />
                              </div>
                              <Typography variant='body2' color='text.secondary' className='mb-1'>
                                {description}
                              </Typography>
                              {location && (
                                <Typography variant='body2' color='text.secondary' className='mb-1'>
                                  <i className='ri-map-pin-line text-base' /> {location}
                                </Typography>
                              )}
                              <Typography variant='caption' color='text.secondary'>
                                {timestamp}
                              </Typography>
                            </CardContent>
                          </Card>
                        </TimelineContent>
                      </TimelineItem>
                    )
                  })}
                </Timeline>
              ) : (
                <div className='text-center py-12'>
                  <i className='ri-timeline-view text-6xl text-textSecondary mb-2' />
                  <Typography variant='h6' color='text.secondary'>
                    No activity found
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    No delivery history available for this package
                  </Typography>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}

export default PackageView
