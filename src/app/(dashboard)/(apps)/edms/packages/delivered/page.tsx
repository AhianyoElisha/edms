// Next Imports
import type { Metadata } from 'next'

// Component Imports
import DeliveredPackagesTable from '@/views/edms/packages/delivered/DeliveredPackagesTable'
import PermissionGuard from '@/components/PermissionGuard'

export const metadata: Metadata = {
  title: 'Delivered Packages - Delivery Management',
  description: 'View all delivered packages with date range filtering'
}

const DeliveredPackagesPage = () => {
  return (
    <PermissionGuard permissions={['packages.view', 'packages.manage']}>
      <DeliveredPackagesTable />
    </PermissionGuard>
  )
}

export default DeliveredPackagesPage
