'use client'

// React Imports
import { useState } from 'react'

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
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'

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
    case 'delivered':
      return 'success'
    case 'in-progress':
    case 'in_progress':
    case 'in-transit':
    case 'in_transit':
      return 'primary'
    case 'pending':
    case 'picked-up':
      return 'warning'
    case 'cancelled':
    case 'canceled':
    case 'failed':
      return 'error'
    default:
      return 'default'
  }
}

const ManifestView = ({ manifestData }: { manifestData: any }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'packages'>('overview')

  // Parse packages and their related data
  const packages = Array.isArray(manifestData.packages) ? manifestData.packages : []
  const packageTypes = parseJSON(manifestData.packageTypes)
  const packageStatuses = parseJSON(manifestData.packageStatuses)

  return (
    <Grid container spacing={6}>
      {/* Header Card */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <div className='flex items-start justify-between flex-wrap gap-4'>
              <div>
                <Typography variant='h4' className='mb-2'>
                  {manifestData.manifestNumber}
                </Typography>
                <div className='flex items-center gap-2 mb-2'>
                  <Chip
                    label={manifestData.status}
                    color={getStatusColor(manifestData.status)}
                    size='small'
                  />
                  <Chip
                    label={`${manifestData.totalPackages || packages.length} Packages`}
                    color='info'
                    size='small'
                    icon={<i className='ri-inbox-line' />}
                  />
                </div>
                <Typography variant='body2' color='text.secondary'>
                  Created: {new Date(manifestData.$createdAt).toLocaleString()}
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
          </CardContent>
        </Card>
      </Grid>

      {/* Tabs */}
      <Grid item xs={12}>
        <Card>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            aria-label='manifest details tabs'
          >
            <Tab 
              label='Overview' 
              value='overview'
              icon={<i className='ri-dashboard-line' />}
              iconPosition='start'
            />
            <Tab 
              label={`Packages (${packages.length})`}
              value='packages'
              icon={<i className='ri-inbox-line' />}
              iconPosition='start'
            />
          </Tabs>

          <CardContent>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <Grid container spacing={4}>
                {/* Manifest Details Card */}
                <Grid item xs={12} md={6}>
                  <Card variant='outlined' className='h-full'>
                    <CardContent>
                      <div className='flex items-center gap-3 mb-4'>
                        <Avatar className='bg-primary' sx={{ width: 48, height: 48 }}>
                          <i className='ri-file-list-3-line text-2xl' />
                        </Avatar>
                        <div>
                          <Typography variant='h6' className='font-bold'>
                            Manifest Details
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            Basic information
                          </Typography>
                        </div>
                      </div>
                      <div className='space-y-3'>
                        <div className='flex items-center gap-2'>
                          <i className='ri-hashtag text-textSecondary' />
                          <div className='flex-1'>
                            <Typography variant='body2' color='text.secondary'>
                              Manifest Number
                            </Typography>
                            <Typography variant='body1' className='font-semibold'>
                              {manifestData.manifestNumber}
                            </Typography>
                          </div>
                        </div>
                        <div className='flex items-center gap-2'>
                          <i className='ri-flag-line text-textSecondary' />
                          <div className='flex-1'>
                            <Typography variant='body2' color='text.secondary'>
                              Status
                            </Typography>
                            <Chip
                              label={manifestData.status}
                              color={getStatusColor(manifestData.status)}
                              size='small'
                            />
                          </div>
                        </div>
                        <div className='flex items-center gap-2'>
                          <i className='ri-inbox-line text-textSecondary' />
                          <div className='flex-1'>
                            <Typography variant='body2' color='text.secondary'>
                              Total Packages
                            </Typography>
                            <Chip
                              label={`${manifestData.totalPackages || packages.length} Packages`}
                              color='secondary'
                              size='small'
                              icon={<i className='ri-package-line' />}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Location Information Card */}
                <Grid item xs={12} md={6}>
                  <Card variant='outlined' className='h-full'>
                    <CardContent>
                      <div className='flex items-center gap-3 mb-4'>
                        <Avatar className='bg-success' sx={{ width: 48, height: 48 }}>
                          <i className='ri-map-pin-line text-2xl' />
                        </Avatar>
                        <div>
                          <Typography variant='h6' className='font-bold'>
                            Location Information
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            Pickup and delivery locations
                          </Typography>
                        </div>
                      </div>
                      <div className='space-y-3'>
                        <div className='flex items-center gap-2'>
                          <i className='ri-map-pin-user-line text-textSecondary' />
                          <div className='flex-1'>
                            <Typography variant='body2' color='text.secondary'>
                              Pickup Location
                            </Typography>
                            <Typography variant='body1' className='font-semibold'>
                              {typeof manifestData.pickupLocation === 'object' && manifestData.pickupLocation !== null
                                ? manifestData.pickupLocation.locationName || manifestData.pickupLocation.$id
                                : manifestData.pickupLocation || 'N/A'}
                            </Typography>
                            {typeof manifestData.pickupLocation === 'object' && manifestData.pickupLocation !== null && manifestData.pickupLocation.address && (
                              <Typography variant='caption' color='text.secondary' display='block'>
                                {manifestData.pickupLocation.address}
                              </Typography>
                            )}
                          </div>
                        </div>
                        <div className='flex items-center gap-2'>
                          <i className='ri-map-pin-2-line text-textSecondary' />
                          <div className='flex-1'>
                            <Typography variant='body2' color='text.secondary'>
                              Dropoff Location
                            </Typography>
                            <Typography variant='body1' className='font-semibold'>
                              {typeof manifestData.dropofflocation === 'object' && manifestData.dropofflocation !== null
                                ? manifestData.dropofflocation.locationName || manifestData.dropofflocation.$id
                                : manifestData.dropofflocation || 'N/A'}
                            </Typography>
                            {typeof manifestData.dropofflocation === 'object' && manifestData.dropofflocation !== null && manifestData.dropofflocation.address && (
                              <Typography variant='caption' color='text.secondary' display='block'>
                                {manifestData.dropofflocation.address}
                              </Typography>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Trip Information Card */}
                {manifestData.trip && (
                  <Grid item xs={12} md={6}>
                    <Card variant='outlined' className='h-full'>
                      <CardContent>
                        <div className='flex items-center gap-3 mb-4'>
                          <Avatar className='bg-info' sx={{ width: 48, height: 48 }}>
                            <i className='ri-truck-line text-2xl' />
                          </Avatar>
                          <div>
                            <Typography variant='h6' className='font-bold'>
                              Trip Information
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                              Associated trip details
                            </Typography>
                          </div>
                        </div>
                        <div className='space-y-3'>
                          <div className='flex items-center gap-2'>
                            <i className='ri-route-line text-textSecondary' />
                            <div className='flex-1'>
                              <Typography variant='body2' color='text.secondary'>
                                Trip Number
                              </Typography>
                              <Typography variant='body1' className='font-semibold'>
                                {typeof manifestData.trip === 'object' && manifestData.trip !== null
                                  ? manifestData.trip.tripNumber || manifestData.trip.$id
                                  : manifestData.trip}
                              </Typography>
                            </div>
                          </div>
                          {typeof manifestData.trip === 'object' && manifestData.trip !== null && (
                            <>
                              {manifestData.trip.status && (
                                <div className='flex items-center gap-2'>
                                  <i className='ri-flag-line text-textSecondary' />
                                  <div className='flex-1'>
                                    <Typography variant='body2' color='text.secondary'>
                                      Trip Status
                                    </Typography>
                                    <Chip
                                      label={manifestData.trip.status}
                                      color={getStatusColor(manifestData.trip.status)}
                                      size='small'
                                    />
                                  </div>
                                </div>
                              )}
                              <div className='mt-3'>
                                <Link href={`/edms/trips/${manifestData.trip.$id}`} passHref>
                                  <Button 
                                    size='small' 
                                    variant='outlined'
                                    startIcon={<i className='ri-eye-line' />}
                                    fullWidth
                                  >
                                    View Trip Details
                                  </Button>
                                </Link>
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Notes */}
                {manifestData.notes && (
                  <Grid item xs={12}>
                    <Card variant='outlined'>
                      <CardContent>
                        <div className='flex items-center gap-3 mb-3'>
                          <Avatar className='bg-grey-500' sx={{ width: 40, height: 40 }}>
                            <i className='ri-file-text-line text-xl' />
                          </Avatar>
                          <Typography variant='h6' className='font-bold'>
                            Notes
                          </Typography>
                        </div>
                        <Typography variant='body2'>{manifestData.notes}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            )}

            {/* Packages Tab */}
            {activeTab === 'packages' && (
              <div>
                {packages.length > 0 ? (
                  <TableContainer component={Paper} variant='outlined'>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>
                            <div className='flex items-center gap-2'>
                              <i className='ri-hashtag' />
                              <Typography variant='body2' className='font-bold'>
                                Tracking Number
                              </Typography>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className='flex items-center gap-2'>
                              <i className='ri-user-line' />
                              <Typography variant='body2' className='font-bold'>
                                Recipient

                              </Typography>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className='flex items-center gap-2'>
                              <i className='ri-box-3-line' />
                              <Typography variant='body2' className='font-bold'>
                                Type
                              </Typography>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className='flex items-center gap-2'>
                              <i className='ri-flag-line' />
                              <Typography variant='body2' className='font-bold'>
                                Status
                              </Typography>
                            </div>
                          </TableCell>
                          <TableCell align='right'>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {packages.map((pkg: any, index: number) => {
                          const isObject = typeof pkg === 'object' && pkg !== null
                          const trackingNumber = isObject ? pkg.trackingNumber : pkg
                          const recipientName = isObject ? pkg.recipient : 'N/A'
                          const packageType = isObject ? pkg.packageSize : packageTypes[index] || 'N/A'
                          const status = isObject ? pkg.status : packageStatuses[index] || 'pending'
                          const pkgId = isObject ? pkg.$id : pkg


                          return (
                            <TableRow key={pkgId} hover>
                              <TableCell>
                                <div className='flex items-center gap-2'>
                                  <Avatar className='bg-primary' sx={{ width: 32, height: 32 }}>
                                    <i className='ri-inbox-line text-sm' />
                                  </Avatar>
                                  <Typography variant='body2' className='font-semibold'>
                                    {trackingNumber}
                                  </Typography>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Typography variant='body2'>{recipientName}</Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={packageType}
                                  size='small'
                                  variant='outlined'
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={status}
                                  color={getStatusColor(status)}
                                  size='small'
                                />
                              </TableCell>
                              <TableCell align='right'>
                                <Link href={`/edms/packages/${pkgId}`} passHref>
                                  <Button
                                    size='small'
                                    variant='text'
                                    startIcon={<i className='ri-eye-line' />}
                                  >
                                    View
                                  </Button>
                                </Link>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <div className='text-center py-12'>
                    <Avatar className='bg-grey-200 mx-auto mb-4' sx={{ width: 80, height: 80 }}>
                      <i className='ri-inbox-line text-5xl text-textSecondary' />
                    </Avatar>
                    <Typography variant='h6' color='text.secondary' className='mb-1'>
                      No packages found
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      This manifest doesn't have any packages yet
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

export default ManifestView
