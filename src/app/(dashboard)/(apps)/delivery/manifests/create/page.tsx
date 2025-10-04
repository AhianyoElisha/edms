// Next Imports
import type { Metadata } from 'next'

// Component Imports
import CreateManifestForm from '@/views/edms/manifests/CreateManifestForm'

export const metadata: Metadata = {
  title: 'Create Manifest - Delivery Management',
  description: 'Create a new delivery manifest with package assignments and route planning'
}

const CreateManifestPage = () => {
  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h4 className='text-2xl font-semibold'>Create New Manifest</h4>
        <p className='text-textSecondary'>Set up a new delivery manifest with packages and route details</p>
      </div>
      
      <CreateManifestForm />
    </div>
  )
}

export default CreateManifestPage