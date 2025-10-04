// MUI Imports
import Grid from '@mui/material/Grid'

// Types Imports
import type { CardStatsHorizontalProps } from '@/types/pages/widgetTypes'

// Components Imports
import CardStatHorizontal from '@components/card-statistics/Horizontal'
import { ProductionCategoryType } from '@/types/apps/ecommerceTypes'

const TransactionHorizontal = ({ selectedData }: { selectedData: any }) => {
  console.log(selectedData)
  const data: CardStatsHorizontalProps = {
    stats: selectedData?.category?.totalWarehouseProducts?.toString() || '0',
    title: `Available ${selectedData?.category?.title || 'Category'} Products In Warehouse`,
    trend: 'none',
    // trendNumber: '22.5%',
    avatarColor: 'info',
    avatarIcon: 'ri-instance-line'
  }
  
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <CardStatHorizontal {...data} avatarSkin='light' />
      </Grid>
    </Grid>
  )
}

export default TransactionHorizontal
