'use client'

// Next Imports
import dynamic from 'next/dynamic'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'

// Third-party Imports
import type { ApexOptions } from 'apexcharts'

// Styled Component Imports
const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

// Vars

const SalesMonth = ({ monthlyEstimate }: any) => {
  console.log(monthlyEstimate)
  // Vars
  let series 
  if (!monthlyEstimate?.salesData) {
  series = [{ data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }]
  }
  series = [{ data: monthlyEstimate?.salesData }]
  const primaryColor = 'var(--mui-palette-primary-main)'

  const options: ApexOptions = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false },
      dropShadow: {
        top: 9,
        blur: 4,
        left: 0,
        enabled: true,
        opacity: 0.18,
        color: primaryColor
      }
    },
    tooltip: { enabled: true },
    dataLabels: { enabled: false },
    stroke: {
      width: 5,
      lineCap: 'round'
    },
    colors: [primaryColor],
    grid: {
      show: false,
      padding: {
        top: -27,
        left: 7,
        right: 7,
        bottom: 9
      }
    },
    xaxis: {
      labels: { show: false },
      axisTicks: { show: false },
      axisBorder: { show: false }
    },
    yaxis: { show: false }
  }

  const formattedSalesTotal = new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
   }).format(((Number.parseInt(monthlyEstimate?.salesTotal)) || 0))


  return (
    <Card>
      <CardHeader title='Sales this Month' />
      <CardContent className='flex flex-col gap-4 pbe-0'>
        <div>
          <Typography>Total Sales This Month</Typography>
          <Typography variant='h5'>{formattedSalesTotal}</Typography>
        </div>
        <AppReactApexCharts type='line' height={115} width='100%' options={options} series={series} />
      </CardContent>
    </Card>
  )
}

export default SalesMonth
