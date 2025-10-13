// Next Imports
import type { Metadata } from 'next'

// Component Imports
import DeliveredPackagesTable from '@/views/edms/packages/delivered/DeliveredPackagesTable'

export const metadata: Metadata = {
  title: 'Delivered Packages - Delivery Management',
  description: 'View all delivered packages with date range filtering'
}

const DeliveredPackagesPage = () => {
  return <DeliveredPackagesTable />
}

export default DeliveredPackagesPage
