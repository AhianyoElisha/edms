// View Imports
import ExpenseDetailsView from '@/views/edms/expenses/ExpenseDetailsView'
import PermissionGuard from '@/components/PermissionGuard'

interface ExpenseDetailsPageProps {
  params: Promise<{
    id: string
  }>
}

const ExpenseDetailsPage = async ({ params }: ExpenseDetailsPageProps) => {
  const { id } = await params
  
  return (
    <PermissionGuard permissions={['expenses.view', 'expenses.manage']}>
      <ExpenseDetailsView expenseId={id} />
    </PermissionGuard>
  )
}

export default ExpenseDetailsPage
