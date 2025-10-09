'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import { styled } from '@mui/material/styles'

// Third-party Imports
import classnames from 'classnames'

// Type Imports
import type { ThemeColor } from '@core/types'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'
import OptionMenu from '@core/components/option-menu'

// Type Imports
import type { PackageTrackingType, PackageStatusType } from '@/types/apps/deliveryTypes'

const PackageTrackingWidget = ({ 
  packageData, 
  isLoading 
}: { 
  packageData?: PackageTrackingType[]
  isLoading?: boolean 
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPackage, setSelectedPackage] = useState<PackageTrackingType | null>(null)

  const getStatusColor = (status: PackageStatusType): ThemeColor => {
    switch (status) {
      case 'pending':
        return 'warning'
      case 'picked-up':
        return 'info'
      case 'in-transit':
        return 'primary'
      case 'out-for-delivery':
        return 'secondary'
      case 'delivered':
        return 'success'
      case 'failed':
        return 'error'
      default:
        return 'secondary'
    }
  }

  const getStatusIcon = (status: PackageStatusType): string => {
    switch (status) {
      case 'pending':
        return 'ri-time-line'
      case 'picked-up':
        return 'ri-hand-heart-line'
      case 'in-transit':
        return 'ri-truck-line'
      case 'out-for-delivery':
        return 'ri-map-pin-line'
      case 'delivered':
        return 'ri-checkbox-circle-line'
      case 'failed':
        return 'ri-close-circle-line'
      default:
        return 'ri-package-line'
    }
  }

  const formatStatus = (status: PackageStatusType): string => {
    return status.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const filteredPackages = packageData?.filter(pkg => 
    pkg.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.recipient.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const handlePackageClick = (pkg: PackageTrackingType) => {
    setSelectedPackage(selectedPackage?.$id === pkg.$id ? null : pkg)
  }

  return (
    <Card>
      <CardHeader
        title='Package Tracking'
        subheader='Real-time package monitoring'
        action={<OptionMenu iconClassName='text-textPrimary' options={['Refresh', 'Export', 'Settings']} />}
      />
      <CardContent className='!pbs-5'>
        {/* Search Bar */}
        <TextField
          fullWidth
          size='small'
          placeholder='Search by tracking number, sender, or recipient...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className='mbe-4'
          InputProps={{
            startAdornment: (
              <InputAdornment position='start'>
                <i className='ri-search-line' />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position='end'>
                <IconButton size='small' onClick={() => setSearchTerm('')}>
                  <i className='ri-close-line' />
                </IconButton>
              </InputAdornment>
            )
          }}
        />

        {/* Package List */}
        <div className='flex flex-col gap-3'>
          {filteredPackages.slice(0, 5).map((pkg) => (
            <Box key={pkg.$id}>
              <div 
                className='flex items-center gap-4 p-4 rounded-lg border border-divider cursor-pointer hover:bg-actionHover'
                onClick={() => handlePackageClick(pkg)}
              >
                <CustomAvatar
                  color={getStatusColor(pkg.status)}
                  variant='rounded'
                  className='bs-10 is-10'
                >
                  <i className={classnames(getStatusIcon(pkg.status), 'text-lg')} />
                </CustomAvatar>
                
                <div className='flex flex-col gap-1 flex-1'>
                  <div className='flex items-center justify-between'>
                    <Typography variant='body1' className='font-medium'>
                      #{pkg.trackingNumber}
                    </Typography>
                    <Chip
                      label={formatStatus(pkg.status)}
                      color={getStatusColor(pkg.status)}
                      size='small'
                    />
                  </div>
                  
                  <div className='flex items-center gap-4'>
                    <Typography variant='body2' color='text.secondary'>
                      To: {pkg.recipient}
                    </Typography>
                  </div>
                  
                  <div className='flex items-center gap-4'>
                    <Typography variant='caption' color='text.secondary'>
                      � {pkg.recipientPhone || 'No phone'}
                    </Typography>
                  </div>
                </div>
                
                <div className='flex flex-col gap-1 text-right'>
                  <Typography variant='caption' color='text.secondary'>
                    Expected: {new Date(pkg.expectedDeliveryDate).toLocaleDateString()}
                  </Typography>
                </div>
                
                <i className={classnames(
                  'ri-arrow-down-s-line text-xl transition-transform',
                  selectedPackage?.$id === pkg.$id && 'rotate-180'
                )} />
              </div>

              {/* Package Details */}
              {selectedPackage?.$id === pkg.$id && (
                <Box className='p-4 border-t border-divider bg-backgroundPaper'>
                  <Typography variant='h6' className='mbe-4'>Package Details</Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <Box className='p-3 rounded-lg bg-actionSelected'>
                        <Typography variant='caption' color='text.secondary'>Tracking Number</Typography>
                        <Typography variant='body2' className='font-medium'>{pkg.trackingNumber}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box className='p-3 rounded-lg bg-actionSelected'>
                        <Typography variant='caption' color='text.secondary'>Status</Typography>
                        <Typography variant='body2' className='font-medium'>{formatStatus(pkg.status)}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box className='p-3 rounded-lg bg-actionSelected'>
                        <Typography variant='caption' color='text.secondary'>Recipient</Typography>
                        <Typography variant='body2' className='font-medium'>{pkg.recipient}</Typography>
                        <Typography variant='caption' color='text.secondary'>{pkg.recipientPhone}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box className='p-3 rounded-lg bg-actionSelected'>
                        <Typography variant='caption' color='text.secondary'>Package Size</Typography>
                        <Typography variant='body2' className='font-medium text-capitalize'>{pkg.packageSize}</Typography>
                        {pkg.isBin && pkg.itemCount && (
                          <Typography variant='caption' color='text.secondary'>
                            Bin contains {pkg.itemCount} items
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Box className='p-3 rounded-lg bg-actionSelected'>
                        <Typography variant='caption' color='text.secondary'>Delivery Information</Typography>
                        <Typography variant='body2' className='font-medium'>
                          Expected: {new Date(pkg.expectedDeliveryDate).toLocaleString()}
                        </Typography>
                        {pkg.deliveryDate && (
                          <Typography variant='body2' color='success.main'>
                            Delivered: {new Date(pkg.deliveryDate).toLocaleString()}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                    {pkg.notes && (
                      <Grid item xs={12}>
                        <Box className='p-3 rounded-lg bg-actionSelected'>
                          <Typography variant='caption' color='text.secondary'>Notes</Typography>
                          <Typography variant='body2'>{pkg.notes}</Typography>
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}
            </Box>
          ))}
        </div>

        {filteredPackages.length === 0 && (
          <Box className='text-center py-8'>
            <CustomAvatar color='secondary' className='mbe-4 mli-auto bs-16 is-16'>
              <i className='ri-search-line text-2xl' />
            </CustomAvatar>
            <Typography variant='h6' className='mbe-2'>No packages found</Typography>
            <Typography variant='body2' color='text.secondary'>
              Try adjusting your search terms or check back later.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default PackageTrackingWidget