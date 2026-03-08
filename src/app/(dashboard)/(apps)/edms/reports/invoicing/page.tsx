// Invoicing Report Page
import InvoicingReport from '@/views/edms/reports/financial/InvoicingReport'
import PermissionGuard from '@/components/PermissionGuard'

const InvoicingPage = () => {
  return (
    <PermissionGuard permissions={['reports.view', 'reports.invoicing']}>
      <InvoicingReport />
    </PermissionGuard>
  )
}

export default InvoicingPage
