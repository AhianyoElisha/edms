// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

// Type Imports
import type { ThemeColor } from '@core/types'

// Components Imports
import OptionMenu from '@core/components/option-menu'
import CustomAvatar from '@core/components/mui/Avatar'
import { ReactNode } from 'react'
import Shimmer from '@/components/layout/shared/Shimmer'

// Types
type DataType = {
  icon: string
  stats: string | ReactNode
  title: string
  color: ThemeColor
}

type SalesProps = {
  totalCustomers: number
  totalProfit: string
  totalTransactions?: number
  totalSales: string
  isLoading?: boolean
}


const Sales = ({ totalCustomers, totalProfit, totalTransactions, totalSales, isLoading }: SalesProps) => {
  // Helper function to render stats content
  const renderStats = (stats: string | ReactNode) => {
    if (typeof stats === 'string') {
      return <Typography variant='h4'>{stats}</Typography>
    }
    return stats
  }



  // Vars
  const formattedSalesTotal = new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
   }).format(((Number.parseInt(totalProfit)) || 0))


  const data: DataType[] = [
    {
      stats: isLoading ? <Shimmer width={70} height={30} /> : totalCustomers?.toString(),
      color: 'primary',
      title: 'Customers',
      icon: 'ri-user-star-line'
    },
    {
      stats: isLoading ? <Shimmer width={130} height={30} /> : formattedSalesTotal,
      color: 'warning',
      icon: 'ri-pie-chart-2-line',
      title: 'Total Revenue'
    },
    {
      color: 'info',
      stats: isLoading ? <Shimmer width={70} height={30} /> : totalTransactions?.toString(),
      title: 'Transactions',
      icon: 'ri-arrow-left-right-line'
    }
  ]



  return (
    <Card className='bs-full'>
      <CardHeader
        title='Sales Overview'
        action={<OptionMenu options={['Refresh', 'Share', 'Update']} />}
        subheader={
          <div className='flex items-center gap-2'>
            <span>{isLoading ? <Shimmer width={200} height={20} /> : `${totalSales } Total Sales`}</span>
          </div>
        }
      />
      <CardContent>
        <div className='flex flex-wrap justify-between gap-4'>
          {data.map((item, index) => (
            <div key={index} className='flex items-center gap-3'>
              <CustomAvatar variant='rounded' skin='light' color={item.color}>
                <i className={item.icon}></i>
              </CustomAvatar>
              <div>
                <Typography variant='h5'>{renderStats(item.stats)}</Typography>
                <Typography>{item.title}</Typography>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default Sales
