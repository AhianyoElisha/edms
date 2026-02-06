// View Imports
import ExpenseEditForm from '@/views/edms/expenses/ExpenseEditForm'

interface ExpenseEditPageProps {
  params: Promise<{
    id: string
  }>
}

const ExpenseEditPage = async ({ params }: ExpenseEditPageProps) => {
  const { id } = await params
  
  return <ExpenseEditForm expenseId={id} />
}

export default ExpenseEditPage
