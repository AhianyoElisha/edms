// Next Imports
import type { Metadata } from 'next'

// Component Imports
import TripsOverviewTable from '@/views/edms/trips/TripsOverviewTable'

export const metadata: Metadata = {
  title: 'Trips - Delivery Management',
  description: 'View and manage all delivery trips'
}

const TripsPage = () => {
  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h4 className='text-2xl font-semibold'>Delivery Trips</h4>
        <p className='text-textSecondary'>Track and manage all delivery trips with manifests and packages</p>
      </div>
      
      <TripsOverviewTable />
    </div>
  )
}

export default TripsPage
