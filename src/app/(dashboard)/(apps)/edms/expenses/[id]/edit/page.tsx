// View Imports
import ExpenseEditForm from '@/views/edms/expenses/ExpenseEditForm'
import PermissionGuard from '@/components/PermissionGuard'

interface ExpenseEditPageProps {
  params: Promise<{
    id: string
  }>
}

const ExpenseEditPage = async ({ params }: ExpenseEditPageProps) => {
  const { id } = await params
  
  return (
    <PermissionGuard permissions={['expenses.edit', 'expenses.manage']}>
      <ExpenseEditForm expenseId={id} />
    </PermissionGuard>
  )
}

export default ExpenseEditPage
