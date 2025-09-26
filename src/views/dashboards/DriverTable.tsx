'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import Rating from '@mui/material/Rating'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'

// Third-party Imports
import classnames from 'classnames'

// Type Imports
import type { ThemeColor } from '@core/types'
import type { DriverType } from '@/types/apps/deliveryTypes'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'
import OptionMenu from '@core/components/option-menu'

// Util Imports
import { getInitials } from '@/utils/getInitials'

const DriverTable = ({ 
  tableData, 
  isLoading 
}: { 
  tableData?: DriverType[]
  isLoading?: boolean 
}) => {
  const [searchTerm, setSearchTerm] = useState('')

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

  const filteredDrivers = tableData?.filter(driver => 
    driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.phone.includes(searchTerm)
  ) || []

  const calculateSuccessRate = (driver: DriverType) => {
    return driver.totalDeliveries > 0 
      ? Math.round((driver.completedDeliveries / driver.totalDeliveries) * 100) 
      : 0
  }

  const calculateOnTimeRate = (driver: DriverType) => {
    return driver.totalDeliveries > 0 
      ? Math.round((driver.onTimeDeliveries / driver.totalDeliveries) * 100) 
      : 0
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader title='Driver Management' subheader='Loading drivers...' />
        <CardContent>
          <Box className='text-center py-8'>
            <Typography>Loading driver data...</Typography>
          </Box>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader
        title='Driver Management'
        subheader={`${filteredDrivers.length} drivers found`}
        action={<OptionMenu iconClassName='text-textPrimary' options={['Export', 'Refresh', 'Add Driver']} />}
      />
      <CardContent className='!pbs-5'>
        {/* Search Bar */}
        <TextField
          fullWidth
          size='small'
          placeholder='Search drivers by name, email, or phone...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className='mbe-4'
          InputProps={{
            startAdornment: (
              <InputAdornment position='start'>
                <i className='ri-search-line' />
              </InputAdornment>
            )
          }}
        />

        {/* Driver List */}
        <div className='flex flex-col gap-4'>
          {filteredDrivers.map((driver) => {
            const successRate = calculateSuccessRate(driver)
            const onTimeRate = calculateOnTimeRate(driver)
            
            return (
              <div key={driver.$id} className='flex items-center gap-4 p-4 rounded-lg border border-divider hover:bg-actionHover'>
                {/* Driver Avatar */}
                {driver.avatar ? (
                  <Avatar
                    src={driver.avatar}
                    alt={driver.name}
                    className='bs-14 is-14'
                    sx={{ '& .MuiAvatar-img': { objectFit: 'contain' } }}
                  />
                ) : (
                  <CustomAvatar className='bs-14 is-14 text-lg'>
                    {getInitials(driver.name)}
                  </CustomAvatar>
                )}
                
                {/* Driver Info */}
                <div className='flex flex-col gap-2 flex-1'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <Typography variant='h6' className='font-medium'>
                        {driver.name}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {driver.email}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        📞 {driver.phone} • 🚗 {driver.vehicleType || 'No vehicle assigned'}
                      </Typography>
                    </div>
                    <Chip
                      label={driver.status.replace('-', ' ').toUpperCase()}
                      color={getStatusColor(driver.status)}
                      size='small'
                    />
                  </div>
                  
                  {/* Rating and Stats */}
                  <div className='flex items-center gap-6'>
                    <div className='flex items-center gap-2'>
                      <Rating value={driver.rating} readOnly size='small' precision={0.1} />
                      <Typography variant='body2' color='text.secondary'>
                        ({driver.rating.toFixed(1)})
                      </Typography>
                    </div>
                    
                    <Typography variant='body2' color='text.secondary'>
                      Success: {successRate}%
                    </Typography>
                    
                    <Typography variant='body2' color='text.secondary'>
                      On-time: {onTimeRate}%
                    </Typography>
                    
                    <Typography variant='body2' color='text.secondary'>
                      Total: {driver.totalDeliveries} deliveries
                    </Typography>
                  </div>
                </div>
                
                {/* Earnings */}
                <div className='flex flex-col gap-1 text-right min-w-fit'>
                  <Typography variant='body1' className='font-medium text-success'>
                    {formatCurrency(driver.todayEarnings)}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Today
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Month: {formatCurrency(driver.monthlyEarnings)}
                  </Typography>
                </div>
              </div>
            )
          })}
        </div>

        {filteredDrivers.length === 0 && !isLoading && (
          <Box className='text-center py-8'>
            <CustomAvatar color='secondary' className='mbe-4 mli-auto bs-16 is-16'>
              <i className='ri-user-line text-2xl' />
            </CustomAvatar>
            <Typography variant='h6' className='mbe-2'>No drivers found</Typography>
            <Typography variant='body2' color='text.secondary'>
              {searchTerm ? 'Try adjusting your search terms.' : 'No drivers have been added yet.'}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default DriverTable