'use client'

// React Imports
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import LoaderDark from '@/components/layout/shared/LoaderDark'
import TripView from '@/views/edms/trips/view'

// Action Imports
import { getTripById } from '@/libs/actions/trip.actions'

// Type Imports
import type { TripType } from '@/types/apps/deliveryTypes'

// Third-party Imports
import { toast } from 'react-toastify'

export default function TripViewPage() {
  const params = useParams()
  const router = useRouter()
  const [tripData, setTripData] = useState<TripType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTripData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const tripContent = await getTripById(params.id as string)
      
      if (!tripContent) {
        setError('Trip not found')
        toast.error('Trip not found')
        return
      }
      
      setTripData(tripContent)
    } catch (error) {
      console.error('Error fetching trip data:', error)
      setError('Failed to load trip data')
      toast.error('Failed to load trip data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (params.id) {
      fetchTripData()
    }
  }, [params.id])

  if (isLoading) {
    return <LoaderDark />
  }

  if (error || !tripData) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <i className='ri-error-warning-line text-6xl text-error mb-4' />
          <h2 className='text-2xl font-semibold mb-2'>Trip Not Found</h2>
          <p className='text-textSecondary mb-4'>{error || 'The trip you are looking for does not exist.'}</p>
          <button
            onClick={() => router.push('/edms/trips')}
            className='px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark'
          >
            Back to Trips
          </button>
        </div>
      </div>
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <TripView tripData={tripData} />
      </Grid>
    </Grid>
  )
}
