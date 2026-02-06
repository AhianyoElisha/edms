// Next Imports
import type { Metadata } from 'next'

// Component Imports
import ReturnWaybillOverviewTable from '@/views/edms/returns/waybills/ReturnWaybillOverviewTable'

export const metadata: Metadata = {
  title: 'Return Waybills - Delivery Management',
  description: 'Manage return waybills for packages being returned from dropoff to pickup locations'
}

const ReturnWaybillsPage = () => {
  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h4 className='text-2xl font-semibold'>Return Waybills</h4>
        <p className='text-textSecondary'>Track packages being returned from dropoff locations back to pickup locations</p>
      </div>
      
      <ReturnWaybillOverviewTable />
    </div>
  )
}

export default ReturnWaybillsPage
