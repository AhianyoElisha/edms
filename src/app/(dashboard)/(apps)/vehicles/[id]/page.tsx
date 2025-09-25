'use client'

// MUI Imports
import Grid from '@mui/material/Grid'

// Data Imports
import LoaderDark from '@/components/layout/shared/LoaderDark'
import { Suspense } from 'react'
import { getVehicleDetailById } from '@/libs/actions/customer.action'
import { useParams } from 'next/navigation'
import VehicleDetails from '@/views/mineralwater/vehicles/details'
import { Logistics } from '@/types/apps/ecommerceTypes'
import { toast } from 'react-toastify'
import { useEffect, useState } from 'react'

export default function VehicleDetailsPage() {
  const params = useParams()
  const [vehicleData, setVehicleData] = useState<Logistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchVehicleData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const vehicleContent = await getVehicleDetailById(params.id as string)
        console.log('Fetched Vehicle Data:', vehicleContent) // Debugging line to check fetched data
        if (!vehicleContent) {
          setError('Vehicle not found')
          return
        }
        setVehicleData(vehicleContent as unknown as Logistics)
      } catch (error) {
        console.error('Error fetching vehicle data:', error)
        setError('Failed to load vehicle data')
        toast.error('Failed to load vehicle data')
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      fetchVehicleData()
    }
  }, [params.id])

  if (isLoading) {
    return (
      <div className='fixed inset-0 flex items-center justify-center z-50'>
        <LoaderDark />
      </div>
    )
  }

  if (error || !vehicleData) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <h2 className='text-xl font-semibold mb-2'>Error</h2>
          <p className='text-gray-600'>{error || 'Vehicle not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <VehicleDetails vehicleData={vehicleData} vehicleId={params.id as string} />
      </Grid>
    </Grid>
  )
}