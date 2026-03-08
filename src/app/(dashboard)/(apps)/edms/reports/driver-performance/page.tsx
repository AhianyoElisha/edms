// Driver Performance Report Page
import DriverPerformanceReport from '@/views/edms/reports/operational/DriverPerformanceReport'
import PermissionGuard from '@/components/PermissionGuard'

const DriverPerformancePage = () => {
  return (
    <PermissionGuard permissions={['reports.view', 'reports.driver_performance']}>
      <DriverPerformanceReport />
    </PermissionGuard>
  )
}

export default DriverPerformancePage
