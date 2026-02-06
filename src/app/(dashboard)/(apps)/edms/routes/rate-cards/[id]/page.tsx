'use client'

// React Imports
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

// Component Imports
import RateCardDetailView from '@/views/edms/routes/rate-cards/RateCardDetailView'
// Context Imports
import { useAuth } from '@/contexts/AppwriteProvider'

// Actions Imports
import { getRateCardById } from '@/libs/actions/ratecard.actions'

// Type Imports
import type { RateCardType } from '@/types/apps/deliveryTypes'

const RateCardDetailPage = () => {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const rateCardId = params.id as string

  const [loading, setLoading] = useState(true)
  const [rateCard, setRateCard] = useState<RateCardType | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login')
      }
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const loadRateCard = async () => {
      if (!rateCardId) return

      try {
        setLoading(true)
        const data = await getRateCardById(rateCardId)
        setRateCard(data)
      } catch (err) {
        console.error('Error loading rate card:', err)
        setError('Failed to load rate card')
      } finally {
        setLoading(false)
      }
    }

    loadRateCard()
  }, [rateCardId])

  if (loading || authLoading) {
    return (
      <div className='flex flex-col gap-6'>
        <div>
          <h4 className='text-2xl font-semibold'>Rate Card Details</h4>
          <p className='text-textSecondary'>Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !rateCard) {
    return (
      <div className='flex flex-col gap-6'>
        <div>
          <h4 className='text-2xl font-semibold'>Rate Card Details</h4>
          <p className='text-textSecondary text-error'>{error || 'Rate card not found'}</p>
        </div>
      </div>
    )
  }

  return <RateCardDetailView rateCard={rateCard} />
}

export default RateCardDetailPage
