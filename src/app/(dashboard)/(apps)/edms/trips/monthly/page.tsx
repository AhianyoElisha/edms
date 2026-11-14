// Next Imports
import type { Metadata } from 'next'

// Component Imports
import MonthlyBreakdown from '@/views/edms/trips/monthly/MonthlyBreakdown'
import PermissionGuard from '@/components/PermissionGuard'

export const metadata: Metadata = {
  title: 'Monthly Breakdown - Delivery Management',
  description: 'A month of trips: what is invoiced, what moved to another month, by driver, and losses'
}

const MonthlyBreakdownPage = () => {
  return (
    <PermissionGuard permissions={['trips.view', 'trips.manage']}>
      <div className='flex flex-col gap-6'>
        <div>
          <h4 className='text-2xl font-semibold'>Monthly Breakdown</h4>
          <p className='text-textSecondary'>
            The trips on each month&apos;s invoice, with those closed late moved to the month they are invoiced in
          </p>
        </div>

        <MonthlyBreakdown />
      </div>
    </PermissionGuard>
  )
}

export default MonthlyBreakdownPage
