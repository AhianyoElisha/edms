'use client'

// React Imports
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

// Component Imports
import RouteDetailView from '@/views/edms/routes/RouteDetailView'

// Context Imports
import { useAuth } from '@/contexts/AppwriteProvider'

// Actions Imports
import { getRouteById } from '@/libs/actions/route.actions'

// Type Imports
import type { RouteType } from '@/types/apps/deliveryTypes'

const RouteDetailPage = () => {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const routeId = params.id as string

  const [loading, setLoading] = useState(true)
  const [route, setRoute] = useState<RouteType | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login')
      }
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const loadRoute = async () => {
      if (!routeId) return

      try {
        setLoading(true)
        const data = await getRouteById(routeId)
        setRoute(data)
      } catch (err) {
        console.error('Error loading route:', err)
        setError('Failed to load route details')
      } finally {
        setLoading(false)
      }
    }

    loadRoute()
  }, [routeId])

  if (loading || authLoading) {
    return (
      <div className='flex flex-col gap-6'>
        <div>
          <h4 className='text-2xl font-semibold'>Route Details</h4>
          <p className='text-textSecondary'>Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !route) {
    return (
      <div className='flex flex-col gap-6'>
        <div>
          <h4 className='text-2xl font-semibold'>Route Details</h4>
          <p className='text-error'>{error || 'Route not found'}</p>
        </div>
      </div>
    )
  }

  return <RouteDetailView route={route} />
}

export default RouteDetailPage
