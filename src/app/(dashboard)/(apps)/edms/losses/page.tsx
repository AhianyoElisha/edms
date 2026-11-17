// Next Imports
import type { Metadata } from 'next'

// Component Imports
import LossesGate from '@/views/edms/losses/LossesGate'

export const metadata: Metadata = {
  title: 'Loss Sheet - Delivery Management',
  description: 'Losses charged to drivers, what they have paid back, and what is left'
}

const LossSheetPage = () => {
  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h4 className='text-2xl font-semibold'>Loss Sheet</h4>
        <p className='text-textSecondary'>
          Lost items charged to each driver, the payments and deductions against them, and what is left to pay
        </p>
      </div>

      <LossesGate />
    </div>
  )
}

export default LossSheetPage
