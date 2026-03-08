// Profitability Report Page
import ProfitabilityReport from '@/views/edms/reports/financial/ProfitabilityReport'
import PermissionGuard from '@/components/PermissionGuard'

const ProfitabilityPage = () => {
  return (
    <PermissionGuard permissions={['reports.view', 'reports.profitability']}>
      <ProfitabilityReport />
    </PermissionGuard>
  )
}

export default ProfitabilityPage
