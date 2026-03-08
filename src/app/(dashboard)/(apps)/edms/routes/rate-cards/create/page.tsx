'use client'

// React Imports
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// Component Imports
import RateCardCreateForm from '@/views/edms/routes/rate-cards/RateCardCreateForm'
import PermissionGuard from '@/components/PermissionGuard'

// Context Imports
import { useAuth } from '@/contexts/AppwriteProvider'

const CreateRateCardPage = () => {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login')
      } else {
        setLoading(false)
      }
    }
  }, [user, authLoading, router])

  if (loading || authLoading) {
    return (
      <div className='flex flex-col gap-6'>
        <div>
          <h4 className='text-2xl font-semibold'>Create Rate Card</h4>
          <p className='text-textSecondary'>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <PermissionGuard permissions={['ratecards.create', 'ratecards.manage']}>
      <div className='flex flex-col gap-6'>
        <div>
          <h4 className='text-2xl font-semibold'>Create Rate Card</h4>
          <p className='text-textSecondary'>Define pricing based on client, vehicle type, and distance</p>
        </div>
        
        <RateCardCreateForm userId={user.$id} />
      </div>
    </PermissionGuard>
  )
}

export default CreateRateCardPage
