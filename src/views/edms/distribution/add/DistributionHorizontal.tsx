// MUI Imports
import Grid from '@mui/material/Grid'

// Types Imports
import type { CardStatsHorizontalProps } from '@/types/pages/widgetTypes'

// Components Imports
import CardStatHorizontal from '@components/card-statistics/Horizontal'
import { ProductionCategoryType } from '@/types/apps/ecommerceTypes'

const DistributionHorizontal = ({ selectedCategory }: { selectedCategory: any }) => {
  const data: CardStatsHorizontalProps = {
    stats: selectedCategory?.totalWarehouseProducts?.toString() || '0',
    title: `Available ${selectedCategory?.title || 'Category'} Products`,
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

export default DistributionHorizontal
