'use client'

// React Imports
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'

// Component Imports
import LoaderDark from '@/components/layout/shared/LoaderDark'
import TripEditWizard from '@/views/edms/trips/edit/TripEditWizard'
import PermissionGuard from '@/components/PermissionGuard'

// Action Imports
import { getTripById } from '@/libs/actions/trip.actions'

const EditTripPage = () => {
  const params = useParams()
  const router = useRouter()
  const tripId = params.id as string

  const [tripData, setTripData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTripData = async () => {
      try {
        setIsLoading(true)
        const data = await getTripById(tripId)

        if (!data) {
          setError('Trip not found')
          return
        }

        if (data.status === 'deleted') {
          setError('This trip has been deleted and can no longer be edited')
          return
        }

        setTripData(data)
      } catch (err) {
        console.error('Error fetching trip:', err)
        setError('Failed to load trip data')
      } finally {
        setIsLoading(false)
      }
    }

    if (tripId) {
      fetchTripData()
    }
  }, [tripId])

  // Editing a trip is an admin-only operation
  return (
    <PermissionGuard adminOnly>
      {isLoading ? (
        <LoaderDark />
      ) : error || !tripData ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <i className='ri-error-warning-line text-6xl text-error mb-4' />
            <Typography variant='h6' className='mb-2'>
              {error || 'Trip not found'}
            </Typography>
            <Button variant='contained' onClick={() => router.push('/edms/trips')}>
              Back to Trips
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className='flex flex-col gap-6'>
          <div>
            <h4 className='text-2xl font-semibold'>Edit Trip - {tripData.tripNumber}</h4>
            <p className='text-textSecondary'>
              Update trip details, adjust manifests and package counts, or remove manifests that are no longer needed
            </p>
          </div>

          {(tripData.status === 'in_progress' || tripData.status === 'completed') && (
            <Alert severity='warning'>
              This trip is <strong>{tripData.status.replace('_', ' ')}</strong>. Manifests that have already been
              delivered are locked and cannot be edited or removed.
            </Alert>
          )}

          <TripEditWizard tripData={tripData} />
        </div>
      )}
    </PermissionGuard>
  )
}

export default EditTripPage
