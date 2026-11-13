// Next Imports
import type { Metadata } from 'next'

// Component Imports
import CompaniesView from '@/views/edms/companies/CompaniesView'
import PermissionGuard from '@/components/PermissionGuard'

export const metadata: Metadata = {
  title: 'Companies - Delivery Management',
  description: 'The companies whose goods are carried'
}

const CompaniesPage = () => {
  return (
    <PermissionGuard permissions={['ratecards.view', 'ratecards.manage']}>
      <CompaniesView />
    </PermissionGuard>
  )
}

export default CompaniesPage
