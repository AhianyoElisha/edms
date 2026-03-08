// View Imports
import ExpenseCreateForm from '@/views/edms/expenses/ExpenseCreateForm'
import PermissionGuard from '@/components/PermissionGuard'

const ExpenseCreatePage = () => {
  return (
    <PermissionGuard permission='expenses.create'>
      <ExpenseCreateForm />
    </PermissionGuard>
  )
}

export default ExpenseCreatePage
