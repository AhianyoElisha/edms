// Next Imports
import type { Metadata } from 'next'

// Component Imports
import DeliveredPackagesTable from '@/views/edms/packages/delivered/DeliveredPackagesTable'
import PermissionGuard from '@/components/PermissionGuard'

export const metadata: Metadata = {
  title: 'Completed Deliveries - Delivery Management',
  description: 'Completed deliveries grouped by driver and route'
}

const DeliveredPackagesPage = () => {
  return (
    <PermissionGuard permissions={['packages.view', 'packages.manage']}>
      <DeliveredPackagesTable />
    </PermissionGuard>
  )
}

export default DeliveredPackagesPage
