// Next Imports
import type { Metadata } from 'next'

// Component Imports
import RouteOverviewTable from '@/views/edms/routes/RouteOverviewTable'

export const metadata: Metadata = {
  title: 'Routes - Delivery Management',
  description: 'Manage delivery routes with pickup and dropoff locations'
}

const RoutesPage = () => {
  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h4 className='text-2xl font-semibold'>Delivery Routes</h4>
        <p className='text-textSecondary'>Manage routes from pickup locations to dropoff destinations</p>
      </div>
      
      <RouteOverviewTable />
    </div>
  )
}

export default RoutesPage
