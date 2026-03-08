// Next Imports
import type { Metadata } from 'next'

// Component Imports
import RouteCreateForm from '@/views/edms/routes/RouteCreateForm'
import PermissionGuard from '@/components/PermissionGuard'

export const metadata: Metadata = {
  title: 'Create Route - Delivery Management',
  description: 'Create a new delivery route'
}

const CreateRoutePage = () => {
  return (
    <PermissionGuard permission='routes.create'>
      <div className='flex flex-col gap-6'>
        <div>
          <h4 className='text-2xl font-semibold'>Create Delivery Route</h4>
          <p className='text-textSecondary'>Define pickup location, intermediate stops, and final destination</p>
        </div>
        
        <RouteCreateForm />
      </div>
    </PermissionGuard>
  )
}

export default CreateRoutePage
