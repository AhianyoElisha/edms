'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Box from '@mui/material/Box'

// Actions
import { getAllTrips } from '@/libs/actions/trip.actions'

const VehicleTripHistory = ({ vehicleId }: { vehicleId: string }) => {
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const tripsData = await getAllTrips({ vehicleId })
        setTrips(tripsData || [])
      } catch (error) {
        console.error('Error fetching vehicle trips:', error)
      } finally {
        setLoading(false)
      }
    }

    if (vehicleId) {
      fetchTrips()
    }
  }, [vehicleId])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success'
      case 'in_progress': case 'on_route': case 'at_pickup': return 'info'
      case 'planned': return 'warning'
      case 'cancelled': return 'error'
      default: return 'secondary'
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'N/A'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader title='Trip History' />
        <CardContent>
          <Typography color='text.secondary'>Loading trip history...</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader 
        title='Trip History' 
        subheader={`${trips.length} trip${trips.length !== 1 ? 's' : ''} found for this vehicle`}
      />
      {trips.length === 0 ? (
        <CardContent>
          <Box className='flex flex-col items-center gap-3 py-6'>
            <i className='ri-route-line text-[48px] text-textSecondary' />
            <Typography color='text.secondary'>
              No trips recorded for this vehicle yet
            </Typography>
          </Box>
        </CardContent>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Trip #</TableCell>
                <TableCell>Route</TableCell>
                <TableCell>Driver</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Cost</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {trips.slice(0, 10).map((trip) => {
                const routeName = typeof trip.route === 'object' ? trip.route?.routeName : 'N/A'
                const driverName = typeof trip.driver === 'object' ? trip.driver?.name : 'N/A'
                
                return (
                  <TableRow key={trip.$id} hover>
                    <TableCell>
                      <Typography variant='body2' className='font-medium'>
                        {trip.tripNumber || trip.$id?.slice(0, 8)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2'>{routeName}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2'>{driverName}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2'>
                        {formatDate(trip.tripDate || trip.$createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2'>
                        {trip.tripCost ? `GHS ${trip.tripCost.toLocaleString()}` : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        variant='tonal'
                        label={trip.status?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown'}
                        size='small'
                        color={getStatusColor(trip.status) as any}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Card>
  )
}

export default VehicleTripHistory
