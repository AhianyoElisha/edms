'use client'

// React Imports
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'

// Component Imports
import LoaderDark from '@/components/layout/shared/LoaderDark'
import AddManifestsView from '@/views/edms/trips/AddManifestsView'
import PermissionGuard from '@/components/PermissionGuard'

// Action Imports
import { getTripById } from '@/libs/actions/trip.actions'

// Third-party Imports
import { toast } from 'react-toastify'

export default function AddManifestsPage() {
  const params = useParams()
  const router = useRouter()
  const [tripData, setTripData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTripData = async () => {
      try {
        setIsLoading(true)
        const data = await getTripById(params.id as string)

        if (!data) {
          setError('Trip not found')
          return
        }

        if (data.status !== 'awaiting_manifests') {
          toast.warning('This trip already has manifests or is not in the correct status')
          router.push(`/edms/trips/${params.id}`)
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

    if (params.id) {
      fetchTripData()
    }
  }, [params.id, router])

  if (isLoading) {
    return <LoaderDark />
  }

  if (error || !tripData) {
    return (
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
    )
  }

  return (
    <PermissionGuard permissions={['trips.edit', 'trips.manage', 'manifests.create']}>
      <div className='flex flex-col gap-6'>
        <div>
          <h4 className='text-2xl font-semibold'>Add Manifests to Trip</h4>
          <p className='text-textSecondary'>Add manifest details to trip {tripData.tripNumber}</p>
        </div>

        <Grid container spacing={6}>
          <Grid item xs={12}>
            <AddManifestsView tripData={tripData} />
          </Grid>
        </Grid>
      </div>
    </PermissionGuard>
  )
}
