// Next Imports
import type { Metadata } from 'next'

// Component Imports
import ManifestOverviewTable from '@/views/delivery/manifests/ManifestOverviewTable'

export const metadata: Metadata = {
  title: 'Manifests - Delivery Management',
  description: 'Manage delivery manifests, track packages, and monitor driver assignments'
}

const ManifestsPage = () => {
  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h4 className='text-2xl font-semibold'>Delivery Manifests</h4>
        <p className='text-textSecondary'>Manage and track all delivery manifests</p>
      </div>
      
      <ManifestOverviewTable />
    </div>
  )
}

export default ManifestsPage