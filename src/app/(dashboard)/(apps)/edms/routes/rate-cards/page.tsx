// Next Imports
import type { Metadata } from 'next'

// Component Imports
import RateCardOverviewTable from '@/views/edms/routes/rate-cards/RateCardOverviewTable'

export const metadata: Metadata = {
  title: 'Rate Cards - Delivery Management',
  description: 'Manage rate cards for trip pricing based on client, vehicle type, and distance'
}

const RateCardsPage = () => {
  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h4 className='text-2xl font-semibold'>Rate Cards</h4>
        <p className='text-textSecondary'>Manage pricing rates by client, vehicle type, and distance range</p>
      </div>
      
      <RateCardOverviewTable />
    </div>
  )
}

export default RateCardsPage
