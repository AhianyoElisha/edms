// View Imports
import ExpenseListView from '@/views/edms/expenses/ExpenseListView'
import PermissionGuard from '@/components/PermissionGuard'

const ExpensesListPage = () => {
  return (
    <PermissionGuard permissions={['expenses.view', 'expenses.manage']}>
      <ExpenseListView />
    </PermissionGuard>
  )
}

export default ExpensesListPage
