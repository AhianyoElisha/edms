// Revenue Report Page
import RevenueReport from '@/views/edms/reports/financial/RevenueReport'
import PermissionGuard from '@/components/PermissionGuard'

const RevenuePage = () => {
  return (
    <PermissionGuard permissions={['reports.view', 'reports.revenue']}>
      <RevenueReport />
    </PermissionGuard>
  )
}

export default RevenuePage
