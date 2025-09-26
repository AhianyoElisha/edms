'use client'

// React Imports
import { useMemo } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'

// Type Imports
import type { ThemeColor } from '@core/types'

interface FleetStatisticsProps {
  statistics: any
  loading?: boolean
}

interface StatCard {
  title: string
  value: number | string
  icon: string
  color: ThemeColor
  trend?: {
    value: number
    isPositive: boolean
  }
}

const FleetStatistics = ({ statistics, loading = false }: FleetStatisticsProps) => {
  // Calculate statistics cards
  const statCards: StatCard[] = useMemo(() => {
    if (!statistics) return []

    const utilizationRate = statistics.total > 0 
      ? Math.round((statistics.active / statistics.total) * 100) 
      : 0

    return [
      {
        title: 'Total Vehicles',
        value: statistics.total || 0,
        icon: 'ri-car-line',
        color: 'primary'
      },
      {
        title: 'Active Vehicles',
        value: statistics.active || 0,
        icon: 'ri-play-circle-line',
        color: 'success',
        trend: {
          value: utilizationRate,
          isPositive: utilizationRate > 70
        }
      },
      {
        title: 'Available',
        value: statistics.available || 0,
        icon: 'ri-pause-circle-line',
        color: 'info'
      },
      {
        title: 'Maintenance',
        value: statistics.maintenance || 0,
        icon: 'ri-tools-line',
        color: 'warning'
      },
      {
        title: 'Unavailable',
        value: statistics.unavailable || 0,
        icon: 'ri-close-circle-line',
        color: 'error'
      },
      {
        title: 'Utilization Rate',
        value: `${utilizationRate}%`,
        icon: 'ri-pie-chart-line',
        color: utilizationRate > 80 ? 'success' : utilizationRate > 60 ? 'warning' : 'error'
      }
    ]
  }, [statistics])

  if (loading) {
    return (
      <Grid container spacing={4}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
            <Card>
              <CardContent>
                <div className='flex items-center gap-4'>
                  <Skeleton variant='circular' width={44} height={44} />
                  <div className='flex-1'>
                    <Skeleton variant='text' width='60%' height={24} />
                    <Skeleton variant='text' width='40%' height={20} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    )
  }

  if (!statistics) {
    return (
      <Card>
        <CardContent>
          <Typography color='text.secondary'>
            No statistics available
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Grid container spacing={4}>
      {statCards.map((stat, index) => (
        <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
          <Card className='h-full'>
            <CardContent>
              <div className='flex items-center gap-4'>
                <CustomAvatar
                  variant='rounded'
                  skin='light'
                  color={stat.color}
                  size={44}
                >
                  <i className={`${stat.icon} text-[22px]`} />
                </CustomAvatar>
                <div className='flex-1'>
                  <Typography variant='h5' className='font-medium'>
                    {stat.value}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {stat.title}
                  </Typography>
                  {stat.trend && (
                    <div className='flex items-center gap-1 mt-1'>
                      <Chip
                        size='small'
                        variant='tonal'
                        color={stat.trend.isPositive ? 'success' : 'error'}
                        label={
                          <div className='flex items-center gap-1'>
                            <i className={`ri-arrow-${stat.trend.isPositive ? 'up' : 'down'}-line text-xs`} />
                            <span className='text-xs'>{stat.trend.value}%</span>
                          </div>
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

export default FleetStatistics