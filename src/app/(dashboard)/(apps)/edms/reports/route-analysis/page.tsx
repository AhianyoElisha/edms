// Route Analysis Report Page
import RouteAnalysisReport from '@/views/edms/reports/operational/RouteAnalysisReport'
import PermissionGuard from '@/components/PermissionGuard'

const RouteAnalysisPage = () => {
  return (
    <PermissionGuard permissions={['reports.view', 'reports.route_analysis']}>
      <RouteAnalysisReport />
    </PermissionGuard>
  )
}

export default RouteAnalysisPage
