'use client'

// MUI Imports
import Grid from '@mui/material/Grid'
import RequisitionHistoryTable from '@/views/edms/manage-requisitions/requisitionHistory/RequisitionHistoryTable'


const RequisitionHistoryList = () => {

  return (
    <Grid container spacing={6}>
      <Grid item xs={12} className='mt-6'>
        <RequisitionHistoryTable  />
      </Grid>
    </Grid>
  )
}

export default RequisitionHistoryList