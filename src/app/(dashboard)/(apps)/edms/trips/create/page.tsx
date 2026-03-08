// Next Imports
import type { Metadata } from 'next'

// Component Imports
import TripWizard from '@/views/edms/trips/TripWizard'
import PermissionGuard from '@/components/PermissionGuard'

export const metadata: Metadata = {
  title: 'Create Trip - Delivery Management',
  description: 'Create a new delivery trip with manifests and packages'
}

const CreateTripPage = () => {
  return (
    <PermissionGuard permission='trips.create'>
      <div className='flex flex-col gap-6'>
        <div>
          <h4 className='text-2xl font-semibold'>Create Delivery Trip</h4>
          <p className='text-textSecondary'>Set up trip details, assign manifests to dropoff locations, and add packages</p>
        </div>
        
        <TripWizard />
      </div>
    </PermissionGuard>
  )
}

export default CreateTripPage
