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
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'

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
  const [selectedPackages, setSelectedPackages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: 'delivered' | 'submit' | null }>({ open: false, action: null })
  const [refreshKey, setRefreshKey] = useState(0)

  // Parse packages and their related data
  const packages = Array.isArray(manifestData.packages) ? manifestData.packages : []
  const packageTypes = parseJSON(manifestData.packageTypes)
  const packageStatuses = parseJSON(manifestData.packageStatuses)

  const pickupLocation = manifestData.pickupLocation || manifestData.pickuplocation
  const dropoffLocation = manifestData.dropoffLocation || manifestData.dropofflocation
  const trip = manifestData.trip
  
  // Check if manifest can be submitted (has proof image and is not already delivered)
  const canSubmit = manifestData.proofOfDeliveryImage && manifestData.status !== 'delivered' && manifestData.status !== 'completed'
  const isDelivered = manifestData.status === 'delivered' || manifestData.status === 'completed'
  
  // Handle select all packages
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const allPackageIds = packages.filter((pkg: any) => pkg.status !== 'delivered').map((pkg: any) => pkg.$id)
      setSelectedPackages(allPackageIds)
    } else {
      setSelectedPackages([])
    }
  }
  
  // Handle individual package selection
  const handleSelectPackage = (packageId: string) => {
    setSelectedPackages(prev => {
      if (prev.includes(packageId)) {
        return prev.filter(id => id !== packageId)
      } else {
        return [...prev, packageId]
      }
    })
  }

  return (
    <>
      <Typography className='mt-4' variant='h4'>Manifest Details - {manifestData.manifestNumber}</Typography>
      <Divider className='my-8' />
      
      {/* Header Info */}
      <Card className='mb-6'>
        <CardContent>
          <div className='flex items-start justify-between flex-wrap gap-4'>
            <div className='flex flex-wrap items-center gap-2'>
              <Typography variant='body2' color='text.secondary'>
                Status:
              </Typography>
              <Chip
                label={manifestData.status?.charAt(0).toUpperCase() + manifestData.status?.slice(1)}
                variant='tonal'
                color={getStatusColor(manifestData.status)}
                size='small'
              />
              <Chip
                label={`${packages.length} Packages`}
                color='info'
                size='small'
                variant='tonal'
              />
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button
                variant='outlined'
                size='small'
                startIcon={<i className='ri-printer-line' />}
              >
                Print
              </Button>
              <Button
                variant='contained'
                size='small'
                startIcon={<i className='ri-edit-line' />}
              >
                Edit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
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
            <Grid container spacing={6}>
              {/* Manifest Summary */}
              <Grid item xs={12} sm={6} lg={3}>
                <div className='flex items-center gap-4'>
                  <Avatar variant='rounded' className='bg-primary'>
                    <i className='ri-file-list-3-line' />
                  </Avatar>
                  <div className='overflow-hidden'>
                    <Typography variant='h5' className='truncate'>{manifestData.manifestNumber}</Typography>
                    <Typography variant='body2'>Manifest Number</Typography>
                  </div>
                </div>
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <div className='flex items-center gap-4'>
                  <Avatar variant='rounded' className='bg-info'>
                    <i className='ri-inbox-line' />
                  </Avatar>
                  <div className='overflow-hidden'>
                    <Typography variant='h5'>{packages.length}</Typography>
                    <Typography variant='body2'>Total Packages</Typography>
                  </div>
                </div>
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <div className='flex items-center gap-4'>
                  <Avatar variant='rounded' className='bg-success'>
                    <i className='ri-check-line' />
                  </Avatar>
                  <div className='overflow-hidden'>
                    <Typography variant='h5'>
                      {(() => {
                        try {
                          const delivered = JSON.parse(manifestData.deliveredPackages || '[]')
                          return Array.isArray(delivered) ? delivered.length : 0
                        } catch {
                          return packages.filter((pkg: any) => pkg.status === 'delivered' || pkg.status === 'completed').length
                        }
                      })()}
                    </Typography>
                    <Typography variant='body2'>Delivered</Typography>
                  </div>
                </div>
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <div className='flex items-center gap-4'>
                  <Avatar variant='rounded' className='bg-error'>
                    <i className='ri-close-line' />
                  </Avatar>
                  <div className='overflow-hidden'>
                    <Typography variant='h5'>
                      {(() => {
                        try {
                          const missing = JSON.parse(manifestData.missingPackages || '[]')
                          return Array.isArray(missing) ? missing.length : 0
                        } catch {
                          return 0
                        }
                      })()}
                    </Typography>
                    <Typography>Missing</Typography>
                  </div>
                </div>
              </Grid>

              {/* Package Types Breakdown */}
              {manifestData.packageTypes && (
                <>
                  <Grid item xs={12}>
                    <Divider />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant='h6' className='mb-4'>Package Types Breakdown</Typography>
                  </Grid>
                  {(() => {
                    try {
                      const types = JSON.parse(manifestData.packageTypes)
                      return Object.entries(types).map(([type, count]: [string, any]) => (
                        count > 0 && (
                          <Grid item xs={6} md={3} key={type}>
                            <Typography color='text.secondary'>{type.charAt(0).toUpperCase() + type.slice(1)}</Typography>
                            <Typography className='font-medium'>{count} packages</Typography>
                          </Grid>
                        )
                      ))
                    } catch {
                      return null
                    }
                  })()}
                </>
              )}

              {/* Divider */}
              <Grid item xs={12}>
                <Divider />
              </Grid>

              {/* Timeline Information */}
              <Grid item xs={12} sm={6} lg={3}>
                <Typography variant='body2' color='text.secondary'>Manifest Date</Typography>
                <Typography className='font-medium'>
                  {manifestData.manifestDate ? new Date(manifestData.manifestDate).toLocaleDateString() : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <Typography variant='body2' color='text.secondary'>Departure Time</Typography>
                <Typography className='font-medium'>
                  {manifestData.departureTime ? new Date(manifestData.departureTime).toLocaleString() : 'Not departed'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <Typography variant='body2' color='text.secondary'>Arrival Time</Typography>
                <Typography className='font-medium'>
                  {manifestData.arrivalTime ? new Date(manifestData.arrivalTime).toLocaleString() : 'Not arrived'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <Typography variant='body2' color='text.secondary'>Delivery Time</Typography>
                <Typography className='font-medium'>
                  {manifestData.deliveryTime ? new Date(manifestData.deliveryTime).toLocaleString() : 'Not delivered'}
                </Typography>
              </Grid>

              {/* Divider */}
              <Grid item xs={12}>
                <Divider />
              </Grid>

              {/* Vehicle & Driver Info */}
              <Grid item xs={12} md={6}>
                <Typography variant='h6' className='mb-4'>Vehicle Information</Typography>
                <Typography color='text.secondary' className='mb-1'>
                  <strong>Vehicle ID:</strong> {typeof manifestData.vehicle === 'object' && manifestData.vehicle !== null
                    ? manifestData.vehicle.vehicleNumber || manifestData.vehicle.$id
                    : manifestData.vehicle || 'N/A'}
                </Typography>
                {typeof manifestData.vehicle === 'object' && manifestData.vehicle !== null && (
                  <>
                    {manifestData.vehicle.vehicleType && (
                      <Typography color='text.secondary' className='mb-1'>
                        <strong>Type:</strong> {manifestData.vehicle.vehicleType}
                      </Typography>
                    )}
                    {manifestData.vehicle.brand && (
                      <Typography color='text.secondary' className='mb-1'>
                        <strong>Brand & Model:</strong> {manifestData.vehicle.brand} {manifestData.vehicle.model}
                      </Typography>
                    )}
                  </>
                )}
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant='h6' className='mb-4'>Driver Information</Typography>
                <Typography color='text.secondary' className='mb-1'>
                  <strong>Name:</strong> {manifestData.driver.name || 'N/A'}
                </Typography>
                {typeof manifestData.driver === 'object' && manifestData.driver !== null && (
                  <>
                    {manifestData.driver.phone && (
                      <Typography color='text.secondary' className='mb-1'>
                        <strong>Phone:</strong> {manifestData.driver.phone}
                      </Typography>
                    )}
                    {manifestData.driver.email && (
                      <Typography color='text.secondary' className='mb-1'>
                        <strong>Email:</strong> {manifestData.driver.email}
                      </Typography>
                    )}
                  </>
                )}
              </Grid>

              {/* Divider */}
              <Grid item xs={12}>
                <Divider />
              </Grid>

              {/* Location Information */}
              <Grid item xs={12} md={6}>
                <Typography variant='h6' className='mb-4'>Pickup Location</Typography>
                <Typography color='text.secondary' className='mb-2'>
                  {pickupLocation && typeof pickupLocation === 'object'
                    ? pickupLocation.address || pickupLocation.city || 'N/A'
                    : pickupLocation || 'N/A'}
                </Typography>
                {pickupLocation && typeof pickupLocation === 'object' && (
                  <>
                    {pickupLocation.city && (
                      <Typography variant='body2' color='text.secondary'>
                        {pickupLocation.city}, {pickupLocation.state} {pickupLocation.postalCode}
                      </Typography>
                    )}
                    {pickupLocation.country && (
                      <Typography variant='body2' color='text.secondary'>
                        {pickupLocation.country}
                      </Typography>
                    )}
                  </>
                )}
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant='h6' className='mb-4'>Dropoff Location</Typography>
                <Typography color='text.secondary' className='mb-2'>
                  {dropoffLocation && typeof dropoffLocation === 'object'
                    ? dropoffLocation.locationName || dropoffLocation.address || dropoffLocation.city || 'N/A'
                    : dropoffLocation || 'N/A'}
                </Typography>
                {dropoffLocation && typeof dropoffLocation === 'object' && (
                  <>
                    {dropoffLocation.address && (
                      <Typography variant='body2' color='text.secondary'>
                        {dropoffLocation.address}
                      </Typography>
                    )}
                    {dropoffLocation.city && (
                      <Typography variant='body2' color='text.secondary'>
                        {dropoffLocation.city}, {dropoffLocation.region} {dropoffLocation.postalCode}
                      </Typography>
                    )}
                    {dropoffLocation.contactPerson && (
                      <Typography variant='body2' color='text.secondary'>
                        Contact: {dropoffLocation.contactPerson} {dropoffLocation.contactPhone && `(${dropoffLocation.contactPhone})`}
                      </Typography>
                    )}
                  </>
                )}
              </Grid>

              {/* Delivery Recipient Information */}
              {(manifestData.recipientName || manifestData.recipientPhone) && (
                <>
                  <Grid item xs={12}>
                    <Divider />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant='h6' className='mb-4'>Delivery Recipient</Typography>
                  </Grid>
                  {manifestData.recipientName && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant='body2' color='text.secondary'>Recipient Name</Typography>
                      <Typography className='font-medium'>{manifestData.recipientName}</Typography>
                    </Grid>
                  )}
                  {manifestData.recipientPhone && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant='body2' color='text.secondary'>Recipient Phone</Typography>
                      <Typography className='font-medium'>{manifestData.recipientPhone}</Typography>
                    </Grid>
                  )}
                </>
              )}

              {/* GPS & Proof of Delivery */}
              {(manifestData.deliveryGpsVerified || manifestData.proofOfDeliveryImage || manifestData.deliveryGpsCoordinates) && (
                <>
                  <Grid item xs={12}>
                    <Divider />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant='h6' className='mb-4'>Delivery Verification</Typography>
                  </Grid>
                  {manifestData.deliveryGpsVerified && (
                    <Grid item xs={12} sm={6} lg={4}>
                      <Typography variant='body2' color='text.secondary'>GPS Verified</Typography>
                      <Chip
                        label={manifestData.deliveryGpsVerified ? 'Verified' : 'Not Verified'}
                        variant='tonal'
                        color={manifestData.deliveryGpsVerified ? 'success' : 'warning'}
                        size='small'
                      />
                      {manifestData.gpsVerificationDistance !== null && manifestData.gpsVerificationDistance !== undefined && (
                        <Typography variant='caption' color='text.secondary' className='block mt-1'>
                          Distance: {manifestData.gpsVerificationDistance}m
                        </Typography>
                      )}
                    </Grid>
                  )}
                  {manifestData.deliveryGpsCoordinates && (
                    <Grid item xs={12} sm={6} lg={4}>
                      <Typography variant='body2' color='text.secondary'>GPS Coordinates</Typography>
                      <Typography className='font-medium' variant='body2'>{manifestData.deliveryGpsCoordinates}</Typography>
                    </Grid>
                  )}
                  {manifestData.proofOfDeliveryImage && (
                    <Grid item xs={12} sm={6} lg={4}>
                      <Typography variant='body2' color='text.secondary'>Proof of Delivery</Typography>
                      <Button
                        size='small'
                        variant='outlined'
                        startIcon={<i className='ri-image-line' />}
                        onClick={() => window.open(manifestData.proofOfDeliveryImage, '_blank')}
                      >
                        View Image
                      </Button>
                    </Grid>
                  )}
                </>
              )}

              {/* Trip Information */}
              {trip && (
                <>
                  <Grid item xs={12}>
                    <Divider />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant='h6' className='mb-4'>Trip Information</Typography>
                    <Grid container spacing={4}>
                      <Grid item xs={12} md={6} lg={3}>
                        <Typography color='text.secondary'>Trip Number</Typography>
                        <Typography className='font-medium'>{trip.tripNumber}</Typography>
                      </Grid>
                      <Grid item xs={12} md={6} lg={3}>
                        <Typography color='text.secondary'>Trip Status</Typography>
                        <Chip
                          label={trip.status?.charAt(0).toUpperCase() + trip.status?.slice(1)}
                          variant='tonal'
                          color={getStatusColor(trip.status)}
                          size='small'
                        />
                      </Grid>
                      <Grid item xs={12} md={6} lg={3}>
                        <Typography color='text.secondary'>Driver</Typography>
                        <Typography className='font-medium'>
                          {trip.driver.name || trip.driver.email || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6} lg={3}>
                        <Link href={`/edms/trips/${trip.$id}`} passHref>
                          <Button size='small' variant='outlined' fullWidth>
                            View Trip Details
                          </Button>
                        </Link>
                      </Grid>
                    </Grid>
                  </Grid>
                </>
              )}

              {/* Additional Details */}
              <Grid item xs={12}>
                <Divider />
              </Grid>

              <Grid item xs={12} md={6} lg={3}>
                <Typography color='text.secondary'>Created Date</Typography>
                <Typography className='font-medium'>
                  {new Date(manifestData.$createdAt).toLocaleDateString()}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <Typography color='text.secondary'>Last Updated</Typography>
                <Typography className='font-medium'>
                  {new Date(manifestData.$updatedAt).toLocaleDateString()}
                </Typography>
              </Grid>

              {manifestData.notes && (
                <>
                  <Grid item xs={12}>
                    <Divider />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant='h6' className='mb-2'>Notes</Typography>
                    <Typography color='text.secondary'>{manifestData.notes}</Typography>
                  </Grid>
                </>
              )}
            </Grid>
          )}

          {/* Packages Tab */}
          {activeTab === 'packages' && (
            <div className='overflow-x-auto'>
              {packages.length > 0 ? (
                <>
                  {!isDelivered && selectedPackages.length > 0 && (
                    <div className='mb-4 p-4 bg-primary/10 rounded flex items-center justify-between flex-wrap gap-2'>
                      <Typography variant='body2' color='primary'>
                        {selectedPackages.length} package{selectedPackages.length > 1 ? 's' : ''} selected
                      </Typography>
                      <Button
                        variant='contained'
                        size='small'
                        color='success'
                        onClick={() => setConfirmDialog({ open: true, action: 'delivered' })}
                        startIcon={<i className='ri-check-line' />}
                      >
                        Mark as Delivered
                      </Button>
                    </div>
                  )}
                  <TableContainer component={Paper} variant='outlined'>
                    <Table sx={{ minWidth: 800 }}>
                      <TableHead>
                        <TableRow>
                          {!isDelivered && (
                            <TableCell padding='checkbox'>
                              <Checkbox
                                checked={selectedPackages.length > 0 && selectedPackages.length === packages.filter((pkg: any) => pkg.status !== 'delivered').length}
                                indeterminate={selectedPackages.length > 0 && selectedPackages.length < packages.filter((pkg: any) => pkg.status !== 'delivered').length}
                                onChange={handleSelectAll}
                              />
                            </TableCell>
                          )}
                          <TableCell>Tracking Number</TableCell>
                          <TableCell>Recipient</TableCell>
                        <TableCell>Size/Type</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Expected Delivery</TableCell>
                        <TableCell>Actual Delivery</TableCell>
                        <TableCell align='right'>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {packages.map((pkg: any) => (
                        <TableRow key={pkg.$id} hover>
                          {!isDelivered && (
                            <TableCell padding='checkbox'>
                              <Checkbox
                                checked={selectedPackages.includes(pkg.$id)}
                                onChange={() => handleSelectPackage(pkg.$id)}
                                disabled={pkg.status === 'delivered'}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <Typography className='font-medium'>
                              {pkg.trackingNumber}
                            </Typography>
                            {pkg.isBin && (
                              <Chip
                                label={`Bin (${pkg.itemCount || 0} items)`}
                                variant='tonal'
                                color='secondary'
                                size='small'
                                className='mt-1'
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2'>
                              {pkg.recipient || pkg.recipientName || 'N/A'}
                            </Typography>
                            {pkg.recipientPhone && (
                              <Typography variant='caption' color='text.secondary' className='block'>
                                {pkg.recipientPhone}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2'>
                              {pkg.packageSize ? pkg.packageSize.charAt(0).toUpperCase() + pkg.packageSize.slice(1) : 'N/A'}
                            </Typography>
                            {pkg.packageType && (
                              <Typography variant='caption' color='text.secondary' className='block'>
                                {pkg.packageType}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={pkg.status?.charAt(0).toUpperCase() + pkg.status?.slice(1)}
                              variant='tonal'
                              color={getStatusColor(pkg.status)}
                              size='small'
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2'>
                              {pkg.expectedDeliveryDate ? new Date(pkg.expectedDeliveryDate).toLocaleDateString() : 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2'>
                              {pkg.deliveryDate ? new Date(pkg.deliveryDate).toLocaleDateString() : 
                               pkg.status === 'delivered' ? 'Check history' : 'Not delivered'}
                            </Typography>
                          </TableCell>
                          <TableCell align='right'>
                            <Link href={`/edms/packages/${pkg.$id}`} passHref>
                              <Button size='small' variant='outlined'>
                                View
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <div className='text-center py-12'>
                  <i className='ri-inbox-line text-6xl text-textSecondary mb-2' />
                  <Typography variant='h6' color='text.secondary'>
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
    </>
  )
}

export default ManifestView
