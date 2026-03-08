// Expense Report Page
import ExpenseReport from '@/views/edms/reports/financial/ExpenseReport'
import PermissionGuard from '@/components/PermissionGuard'

const ExpenseReportPage = () => {
  return (
    <PermissionGuard permissions={['reports.view', 'reports.expense_report']}>
      <ExpenseReport />
    </PermissionGuard>
  )
}

export default ExpenseReportPage
