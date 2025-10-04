'use client';

import { useAuth } from '@/contexts/AppwriteProvider';
import Grid from '@mui/material/Grid';
import VehicleStatus from '@/views/dashboards/VehicleStatus';
import DriverPerformance from '@/views/dashboards/DriverPerformance';
import ActivityTimeline from '@/views/dashboards/ActivityTimeline';
import DriverTable from '@/views/dashboards/DriverTable';
import { Typography, Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import MaintenanceBanner from '../../../MaintenanceBanner';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { DeliveryHistory, DeliveryDashboardData } from '@/types/apps/deliveryTypes';
import DeliveryOverviewCards from '@/views/dashboards/DeliveryOverviewCards';
import PackageTrackingWidget from '@/views/dashboards/PackageTrackingWidget';
import TripSummary from '@/views/dashboards/TripSummary';
import CardStatWithImage from '@/components/card-statistics/Character';
import Shimmer from '@/components/layout/shared/Shimmer';

export default function DashboardContent() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DeliveryDashboardData | null>(null)

  // Month selector state
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const years = Array.from({length: 5}, (_, i) => new Date().getFullYear() - i)




  // Get top 2 drivers for the performance cards
  const topDrivers = dashboardData?.driverStats?.drivers
    ?.sort((a, b) => b.rating - a.rating)
    ?.slice(0, 2) || [];

  return (
    <div>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant='h6'>Welcome, {user?.name}</Typography>
        
        {/* Month and Year Selector */}
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Month</InputLabel>
            <Select
              value={selectedMonth}
              label="Month"
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {months.map((month, index) => (
                <MenuItem key={index} value={index}>
                  {month}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Year</InputLabel>
            <Select
              value={selectedYear}
              label="Year"
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {years.map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>
      
      <Grid container spacing={6}>
        <Grid item xs={12} gap={6}>
          <DeliveryOverviewCards 
            packageStats={dashboardData?.packageStats} 
            tripStats={dashboardData?.tripStats}
            vehicleStats={dashboardData?.vehicleStats}
            driverStats={dashboardData?.driverStats}
            isLoading={isLoading} 
            />
            {/* Dynamic driver performance cards */}
            <Grid container spacing={6}>
              {topDrivers.map((driver, index: number) => {
                const successRate = driver.totalDeliveries > 0 
                  ? Math.round((driver.completedDeliveries / driver.totalDeliveries) * 100) 
                  : 0;
                const onTimeRate = driver.totalDeliveries > 0 
                  ? Math.round((driver.onTimeDeliveries / driver.totalDeliveries) * 100) 
                  : 0;
                
                return (
                  <Grid item xs={12} sm={6} md={3} key={driver.$id}>
                    <CardStatWithImage
                      stats={`${successRate}%`}
                      title='Driver Performance'
                      subtitle='Success Rate'
                      trend={onTimeRate > 90 ? 'positive' : 'negative'}
                      trendNumber={`${driver.completedDeliveries} deliveries`}
                      chipColor={index === 0 ? 'primary' : 'success'}
                      chipText={driver.name}
                      src={driver?.avatar || '/images/avatars/1.png'}
                    />
                  </Grid>
                );
              })}
            </Grid>

            {/* Fallback cards if no driver data */}
            {isLoading ? (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <CardStatWithImage
                    stats={<Shimmer width={80} height={37} />}
                    title={<Shimmer width={100} height={20} />}
                    subtitle={<Shimmer width={100} height={20} />}
                    trendNumber={<Shimmer width={40} height={37} />}
                    chipColor='primary'
                    chipText={<Shimmer width={60} height={37} />}
                    src={<Shimmer width={100} height={100} />}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <CardStatWithImage
                    stats={<Shimmer width={80} height={37} />}
                    title={<Shimmer width={100} height={20} />}
                    subtitle={<Shimmer width={100} height={20} />}
                    trendNumber={<Shimmer width={40} height={37} />}
                    chipColor='primary'
                    chipText={<Shimmer width={60} height={37} />}
                    src={<Shimmer width={100} height={100} />}
                  />
                </Grid>
              </>
            ) : topDrivers.length === 0 && (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <CardStatWithImage
                    stats={'0%'}
                    title={'Driver Performance'}
                    subtitle={'Success Rate'}
                    trendNumber={'No deliveries yet'}
                    chipColor='primary'
                    chipText={'No Active Driver'}
                    src={'/images/illustrations/characters/13.png'}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <CardStatWithImage
                    stats={'0%'}
                    title={'Driver Performance'}
                    subtitle={'Success Rate'}
                    trendNumber={'No deliveries yet'}
                    chipColor='primary'
                    chipText={'No Active Driver'}
                    src={'/images/illustrations/characters/12.png'}
                  />
                </Grid>
              </>
            )}
        </Grid>

        {/* Fleet Status and Package Tracking - Below Driver Performance */}
        <Grid item xs={12} md={6}>
          <VehicleStatus 
            vehicleData={dashboardData?.vehicleStats?.vehicles}
            vehicleStats={dashboardData?.vehicleStats}
            isLoading={isLoading}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <PackageTrackingWidget 
            packageData={dashboardData?.packageStats?.packages}
            isLoading={isLoading}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TripSummary tripData={dashboardData?.tripStats?.trips} isLoading={isLoading} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DriverPerformance driverData={dashboardData?.driverStats?.drivers} isLoading={isLoading} />
        </Grid>
        <Grid item xs={12}>
          <ActivityTimeline history={dashboardData?.activityTimeline?.rows} isLoading={isLoading} />
        </Grid>
        <Grid item xs={12} className='max-md:order-3'>
          <DriverTable tableData={dashboardData?.driverStats?.drivers || []} isLoading={isLoading} />
        </Grid>
      </Grid>
    </div>
  );
}