'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Rating from '@mui/material/Rating'
import LinearProgress from '@mui/material/LinearProgress'

// Third-party Imports
import classnames from 'classnames'

// Type Imports
import type { ThemeColor } from '@core/types'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'
import OptionMenu from '@core/components/option-menu'

// Util Imports
import { getInitials } from '@/utils/getInitials'

// Type Imports
import type { DriverType } from '@/types/apps/deliveryTypes'

const DriverPerformance = ({ 
  driverData, 
  isLoading 
}: { 
  driverData?: DriverType[]
  isLoading?: boolean 
}) => {
  
  const getStatusColor = (status: string): ThemeColor => {
    switch (status) {
      case 'active':
        return 'success'
      case 'on-trip':
        return 'primary'
      case 'offline':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  const calculateCompletionRate = (completed: number, total: number) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }

  const calculateOnTimeRate = (onTime: number, total: number) => {
    return total > 0 ? Math.round((onTime / total) * 100) : 0
  }

  // Sort drivers by rating for top performers
  const topDrivers = driverData?.slice(0, 5).sort((a, b) => b.rating - a.rating) || []

  return (
    <Card>
      <CardHeader
        title='Driver Performance'
        subheader='Top performing drivers today'
        action={<OptionMenu iconClassName='text-textPrimary' options={['View All', 'Export', 'Settings']} />}
      />
      <CardContent className='!pbs-5'>
        {/* Performance Summary */}
        <Grid container spacing={4} className='mbe-6'>
          <Grid item xs={12} sm={4}>
            <div className='flex flex-col items-center gap-2 p-4 rounded-lg border border-divider'>
              <CustomAvatar color='success' variant='rounded' className='bs-12 is-12'>
                <i className='ri-trophy-line text-2xl' />
              </CustomAvatar>
              <Typography variant='h6'>
                {driverData?.filter(d => d.rating >= 4.5).length || 0}
              </Typography>
              <Typography variant='body2' color='text.secondary'>Top Rated</Typography>
            </div>
          </Grid>
          <Grid item xs={12} sm={4}>
            <div className='flex flex-col items-center gap-2 p-4 rounded-lg border border-divider'>
              <CustomAvatar color='primary' variant='rounded' className='bs-12 is-12'>
                <i className='ri-truck-line text-2xl' />
              </CustomAvatar>
              <Typography variant='h6'>
                {driverData?.filter(d => d.status === 'on-trip').length || 0}
              </Typography>
              <Typography variant='body2' color='text.secondary'>On Trip</Typography>
            </div>
          </Grid>
          <Grid item xs={12} sm={4}>
            <div className='flex flex-col items-center gap-2 p-4 rounded-lg border border-divider'>
              <CustomAvatar color='info' variant='rounded' className='bs-12 is-12'>
                <i className='ri-user-line text-2xl' />
              </CustomAvatar>
              <Typography variant='h6'>
                {driverData?.filter(d => d.status === 'active').length || 0}
              </Typography>
              <Typography variant='body2' color='text.secondary'>Available</Typography>
            </div>
          </Grid>
        </Grid>

        {/* Top Drivers List */}
        <Typography variant='h6' className='mbe-4'>Top Performers</Typography>
        <div className='flex flex-col gap-4'>
          {topDrivers.map((driver, index) => {
            const completionRate = calculateCompletionRate(driver.completedDeliveries, driver.totalDeliveries)
            const onTimeRate = calculateOnTimeRate(driver.onTimeDeliveries, driver.totalDeliveries)
            
            return (
              <div key={driver.$id} className='flex items-center gap-4 p-4 rounded-lg border border-divider'>
                {/* Rank Badge */}
                <CustomAvatar
                  color={index === 0 ? 'warning' : index === 1 ? 'info' : 'primary'}
                  variant='rounded'
                  className='bs-8 is-8 font-bold'
                >
                  {index + 1}
                </CustomAvatar>
                
                {/* Driver Avatar */}
                {driver.avatar ? (
                  <Avatar
                    src={driver.avatar}
                    alt={driver.name}
                    className='bs-12 is-12'
                    sx={{ '& .MuiAvatar-img': { objectFit: 'contain' } }}
                  />
                ) : (
                  <CustomAvatar className='bs-12 is-12'>
                    {getInitials(driver.name)}
                  </CustomAvatar>
                )}
                
                {/* Driver Info */}
                <div className='flex flex-col gap-1 flex-1'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <Typography variant='body1' className='font-medium'>
                        {driver.name}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {driver.vehicleType} • {driver.phone}
                      </Typography>
                    </div>
                    <Chip
                      label={driver.status.replace('-', ' ').toUpperCase()}
                      color={getStatusColor(driver.status)}
                      size='small'
                    />
                  </div>
                  
                  {/* Rating */}
                  <div className='flex items-center gap-2'>
                    <Rating value={driver.rating} readOnly size='small' precision={0.1} />
                    <Typography variant='body2' color='text.secondary'>
                      ({driver.rating.toFixed(1)})
                    </Typography>
                  </div>
                  
                  {/* Performance Metrics */}
                  <div className='flex items-center gap-6 mbs-2'>
                    <div className='flex flex-col gap-1'>
                      <Typography variant='caption' color='text.secondary'>
                        Completion Rate
                      </Typography>
                      <Box className='flex items-center gap-2'>
                        <LinearProgress 
                          variant="determinate" 
                          value={completionRate} 
                          color="success"
                          className='bs-2 is-16'
                        />
                        <Typography variant='caption'>{completionRate}%</Typography>
                      </Box>
                    </div>
                    
                    <div className='flex flex-col gap-1'>
                      <Typography variant='caption' color='text.secondary'>
                        On-Time Rate
                      </Typography>
                      <Box className='flex items-center gap-2'>
                        <LinearProgress 
                          variant="determinate" 
                          value={onTimeRate} 
                          color="primary"
                          className='bs-2 is-16'
                        />
                        <Typography variant='caption'>{onTimeRate}%</Typography>
                      </Box>
                    </div>
                  </div>
                </div>
                
                {/* Earnings */}
                <div className='flex flex-col gap-1 text-right'>
                  <Typography variant='body1' className='font-medium'>
                    {formatCurrency(driver.todayEarnings)}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Today: {driver.completedDeliveries} deliveries
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Month: {formatCurrency(driver.monthlyEarnings)}
                  </Typography>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default DriverPerformance