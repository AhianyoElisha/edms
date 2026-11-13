// Next Imports
import type { Metadata } from 'next'

// Component Imports
import DeliveredPackagesTable from '@/views/edms/packages/delivered/DeliveredPackagesTable'

export const metadata: Metadata = {
  title: 'Completed Deliveries - Delivery Management',
  description: 'Completed deliveries grouped by driver and route'
}

const DeliveredPackagesPage = () => {
  return <DeliveredPackagesTable />
}

export default DeliveredPackagesPage
