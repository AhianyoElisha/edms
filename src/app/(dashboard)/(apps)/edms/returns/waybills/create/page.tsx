// Next Imports
import type { Metadata } from 'next'

// Component Imports
import ReturnWaybillCreateForm from '@/views/edms/returns/waybills/ReturnWaybillCreateForm'

export const metadata: Metadata = {
  title: 'Create Return Waybill - Delivery Management',
  description: 'Create a new return waybill for packages being returned'
}

const CreateReturnWaybillPage = () => {
  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h4 className='text-2xl font-semibold'>Create Return Waybill</h4>
        <p className='text-textSecondary'>Record packages being returned from a dropoff location back to pickup</p>
      </div>
      
      <ReturnWaybillCreateForm />
    </div>
  )
}

export default CreateReturnWaybillPage
