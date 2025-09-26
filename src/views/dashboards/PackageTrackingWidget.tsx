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
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import StepContent from '@mui/material/StepContent'
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
    pkg.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
                      From: {pkg.sender}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      To: {pkg.recipient}
                    </Typography>
                  </div>
                  
                  <div className='flex items-center gap-4'>
                    <Typography variant='caption' color='text.secondary'>
                      📍 {pkg.origin} → {pkg.destination}
                    </Typography>
                    {pkg.currentLocation && (
                      <Typography variant='caption' color='text.secondary'>
                        Current: {pkg.currentLocation}
                      </Typography>
                    )}
                  </div>
                </div>
                
                <div className='flex flex-col gap-1 text-right'>
                  <Typography variant='body2' className='font-medium'>
                    {pkg.packageType}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {pkg.weight}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    ETA: {new Date(pkg.estimatedDelivery).toLocaleDateString()}
                  </Typography>
                </div>
                
                <i className={classnames(
                  'ri-arrow-down-s-line text-xl transition-transform',
                  selectedPackage?.$id === pkg.$id && 'rotate-180'
                )} />
              </div>

              {/* Package Timeline */}
              {selectedPackage?.$id === pkg.$id && (
                <Box className='p-4 border-t border-divider bg-backgroundPaper'>
                  <Typography variant='h6' className='mbe-4'>Tracking Timeline</Typography>
                  
                  <Stepper orientation="vertical" nonLinear>
                    {pkg.timeline.map((step, index) => (
                      <Step key={index} completed={step.completed} active={!step.completed && index === pkg.timeline.findIndex(s => !s.completed)}>
                        <StepLabel
                          StepIconComponent={() => (
                            <CustomAvatar
                              color={step.completed ? 'success' : 'secondary'}
                              size={32}
                              className='bs-8 is-8'
                            >
                              <i className={classnames(
                                step.completed ? 'ri-checkbox-circle-fill' : getStatusIcon(step.status),
                                'text-sm'
                              )} />
                            </CustomAvatar>
                          )}
                        >
                          <div className='flex flex-col gap-1'>
                            <Typography variant='body2' className='font-medium'>
                              {formatStatus(step.status)}
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {step.location} • {new Date(step.timestamp).toLocaleString()}
                            </Typography>
                          </div>
                        </StepLabel>
                        <StepContent>
                          <Typography variant='body2' color='text.secondary' className='mbs-2'>
                            {step.description}
                          </Typography>
                        </StepContent>
                      </Step>
                    ))}
                  </Stepper>

                  {/* Driver Info */}
                  {pkg.driverName && (
                    <Box className='mbs-4 p-3 rounded-lg bg-actionSelected'>
                      <Typography variant='subtitle2' className='mbe-2'>Driver Information</Typography>
                      <div className='flex items-center gap-2'>
                        <CustomAvatar size={32}>
                          <i className='ri-user-line' />
                        </CustomAvatar>
                        <div>
                          <Typography variant='body2'>{pkg.driverName}</Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {pkg.driverPhone}
                          </Typography>
                        </div>
                      </div>
                    </Box>
                  )}
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