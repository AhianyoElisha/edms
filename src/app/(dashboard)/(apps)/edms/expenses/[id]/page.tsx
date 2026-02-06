// View Imports
import ExpenseDetailsView from '@/views/edms/expenses/ExpenseDetailsView'

interface ExpenseDetailsPageProps {
  params: Promise<{
    id: string
  }>
}

const ExpenseDetailsPage = async ({ params }: ExpenseDetailsPageProps) => {
  const { id } = await params
  
  return <ExpenseDetailsView expenseId={id} />
}

export default ExpenseDetailsPage
