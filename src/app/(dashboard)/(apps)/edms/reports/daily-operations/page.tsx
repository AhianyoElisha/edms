// Daily Operations Report Page
import DailyOperationsReport from '@/views/edms/reports/operational/DailyOperationsReport'
import PermissionGuard from '@/components/PermissionGuard'

const DailyOperationsPage = () => {
  return (
    <PermissionGuard permissions={['reports.view', 'reports.daily_operations']}>
      <DailyOperationsReport />
    </PermissionGuard>
  )
}

export default DailyOperationsPage
