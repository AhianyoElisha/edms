// Delivery Performance Report Page
import DeliveryPerformanceReport from '@/views/edms/reports/operational/DeliveryPerformanceReport'
import PermissionGuard from '@/components/PermissionGuard'

const DeliveryPerformancePage = () => {
  return (
    <PermissionGuard permissions={['reports.view', 'reports.delivery_performance']}>
      <DeliveryPerformanceReport />
    </PermissionGuard>
  )
}

export default DeliveryPerformancePage
