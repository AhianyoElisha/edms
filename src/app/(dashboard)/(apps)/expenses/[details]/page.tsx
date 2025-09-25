'use client'

// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
// Data Imports
import LoaderDark from '@/components/layout/shared/LoaderDark'
import { Suspense } from 'react'

import { useParams } from 'next/navigation'
import { getExpensesItemById } from '@/libs/actions/warehouse.actions'
import ExpensesDetails from '@/views/mineralwater/requisition-details/expenses/ExpensesDetails'


async function ExpensesContent() {
  const params = useParams()
  // Vars
  // const data = await getAcademyData()
  // @ts-ignore
  const expensesContent = await getExpensesItemById(params.details)
  if (!expensesContent) {
    return <div>Error loading expenses product data</div>
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        {/* @ts-ignore */}
        <ExpensesDetails data={expensesContent} />
      </Grid>
    </Grid>
  
  )
}

export default function InventoryDetailsPage() {
  return (
    <Suspense fallback={<div className='fixed inset-0 flex items-center justify-center z-50 px-[50%] '>
      <LoaderDark />
    </div>}>
      <ExpensesContent />
    </Suspense>
  )
}
