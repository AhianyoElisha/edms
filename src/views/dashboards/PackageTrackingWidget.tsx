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
import type { ManifestType, ManifestStatusType } from '@/types/apps/deliveryTypes'

/**
 * ManifestTrackingWidget - Displays manifest tracking information
 * Note: Package information is now stored directly on manifests (packageSize, packageCount, deliveredCount)
 */
const ManifestTrackingWidget = ({ 
  manifestData, 
  isLoading 
}: { 
  manifestData?: ManifestType[]
  isLoading?: boolean 
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedManifest, setSelectedManifest] = useState<ManifestType | null>(null)

  const getStatusColor = (status: ManifestStatusType): ThemeColor => {
    switch (status) {
      case 'pending':
        return 'warning'
      case 'loaded':
        return 'info'
      case 'in_transit':
        return 'primary'
      case 'delivered':
        return 'success'
      case 'completed':
        return 'success'
      default:
        return 'secondary'
    }
  }

  const getStatusIcon = (status: ManifestStatusType): string => {
    switch (status) {
      case 'pending':
        return 'ri-time-line'
      case 'loaded':
        return 'ri-truck-fill'
      case 'in_transit':
        return 'ri-truck-line'
      case 'delivered':
        return 'ri-checkbox-circle-line'
      case 'completed':
        return 'ri-check-double-line'
      default:
        return 'ri-file-list-line'
    }
  }

  const formatStatus = (status: ManifestStatusType): string => {
    return status.split('_').map((word: string) => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const filteredManifests = manifestData?.filter(manifest => 
    manifest.manifestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (manifest.recipientName && manifest.recipientName.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || []

  const handleManifestClick = (manifest: ManifestType) => {
    setSelectedManifest(selectedManifest?.$id === manifest.$id ? null : manifest)
  }

  return (
    <Card>
      <CardHeader
        title='Manifest Tracking'
        subheader='Real-time manifest monitoring'
        action={<OptionMenu iconClassName='text-textPrimary' options={['Refresh', 'Export', 'Settings']} />}
      />
      <CardContent className='!pbs-5'>
        {/* Search Bar */}
        <TextField
          fullWidth
          size='small'
          placeholder='Search by manifest number or recipient...'
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

        {/* Manifest List */}
        <div className='flex flex-col gap-3'>
          {filteredManifests.slice(0, 5).map((manifest) => (
            <Box key={manifest.$id}>
              <div 
                className='flex items-center gap-4 p-4 rounded-lg border border-divider cursor-pointer hover:bg-actionHover'
                onClick={() => handleManifestClick(manifest)}
              >
                <CustomAvatar
                  color={getStatusColor(manifest.status)}
                  variant='rounded'
                  className='bs-10 is-10'
                >
                  <i className={classnames(getStatusIcon(manifest.status), 'text-lg')} />
                </CustomAvatar>
                
                <div className='flex flex-col gap-1 flex-1'>
                  <div className='flex items-center justify-between'>
                    <Typography variant='body1' className='font-medium'>
                      #{manifest.manifestNumber}
                    </Typography>
                    <Chip
                      label={formatStatus(manifest.status)}
                      color={getStatusColor(manifest.status)}
                      size='small'
                    />
                  </div>
                  
                  <div className='flex items-center gap-4'>
                    <Typography variant='body2' color='text.secondary'>
                      To: {manifest.recipientName || 'Unknown'}
                    </Typography>
                  </div>
                  
                  <div className='flex items-center gap-4'>
                    <Typography variant='caption' color='text.secondary'>
                      📦 {manifest.packageCount || 0} {manifest.packageSize || ''} packages
                    </Typography>
                    {manifest.deliveredCount !== undefined && manifest.deliveredCount > 0 && (
                      <Typography variant='caption' color='success.main'>
                        ✓ {manifest.deliveredCount} delivered
                      </Typography>
                    )}
                  </div>
                </div>
                
                <div className='flex flex-col gap-1 text-right'>
                  <Typography variant='caption' color='text.secondary'>
                    {manifest.manifestDate ? new Date(manifest.manifestDate).toLocaleDateString() : 'No date'}
                  </Typography>
                </div>
                
                <i className={classnames(
                  'ri-arrow-down-s-line text-xl transition-transform',
                  selectedManifest?.$id === manifest.$id && 'rotate-180'
                )} />
              </div>

              {/* Manifest Details */}
              {selectedManifest?.$id === manifest.$id && (
                <Box className='p-4 border-t border-divider bg-backgroundPaper'>
                  <Typography variant='h6' className='mbe-4'>Manifest Details</Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <Box className='p-3 rounded-lg bg-actionSelected'>
                        <Typography variant='caption' color='text.secondary'>Manifest Number</Typography>
                        <Typography variant='body2' className='font-medium'>{manifest.manifestNumber}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box className='p-3 rounded-lg bg-actionSelected'>
                        <Typography variant='caption' color='text.secondary'>Status</Typography>
                        <Typography variant='body2' className='font-medium'>{formatStatus(manifest.status)}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box className='p-3 rounded-lg bg-actionSelected'>
                        <Typography variant='caption' color='text.secondary'>Recipient</Typography>
                        <Typography variant='body2' className='font-medium'>{manifest.recipientName || 'Unknown'}</Typography>
                        <Typography variant='caption' color='text.secondary'>{manifest.recipientPhone || 'No phone'}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box className='p-3 rounded-lg bg-actionSelected'>
                        <Typography variant='caption' color='text.secondary'>Package Information</Typography>
                        <Typography variant='body2' className='font-medium text-capitalize'>
                          {manifest.packageCount || 0} {manifest.packageSize || 'unknown'} package(s)
                        </Typography>
                        {manifest.deliveredCount !== undefined && (
                          <Typography variant='caption' color='success.main'>
                            {manifest.deliveredCount} of {manifest.packageCount || 0} delivered
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Box className='p-3 rounded-lg bg-actionSelected'>
                        <Typography variant='caption' color='text.secondary'>Delivery Information</Typography>
                        <Typography variant='body2' className='font-medium'>
                          Date: {manifest.manifestDate ? new Date(manifest.manifestDate).toLocaleString() : 'Not set'}
                        </Typography>
                        {manifest.deliveryTime && (
                          <Typography variant='body2' color='success.main'>
                            Delivered: {new Date(manifest.deliveryTime).toLocaleString()}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                    {manifest.notes && (
                      <Grid item xs={12}>
                        <Box className='p-3 rounded-lg bg-actionSelected'>
                          <Typography variant='caption' color='text.secondary'>Notes</Typography>
                          <Typography variant='body2'>{manifest.notes}</Typography>
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}
            </Box>
          ))}
        </div>

        {filteredManifests.length === 0 && (
          <Box className='text-center py-8'>
            <CustomAvatar color='secondary' className='mbe-4 mli-auto bs-16 is-16'>
              <i className='ri-search-line text-2xl' />
            </CustomAvatar>
            <Typography variant='h6' className='mbe-2'>No manifests found</Typography>
            <Typography variant='body2' color='text.secondary'>
              Try adjusting your search terms or check back later.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default ManifestTrackingWidget