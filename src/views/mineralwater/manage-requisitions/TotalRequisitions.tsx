'use client'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'

type DataType = {
  inventory: string
  value: number
}

// Vars
const totalRequisitionData: DataType[] = [
  { inventory: 'Labels', value: 16 },
  { inventory: 'Bottles', value: 10 },
  { inventory: 'Sachet Rolls', value: 12 },
  { inventory: 'Shrink Caps', value: 8 },
  { inventory: 'Tags', value: 15 },
  { inventory: 'Stamps', value: 12 },
  { inventory: 'Heat Shrink Caps', value: 16 }
]

const TotalRequisitions = () => {
  // Hooks
  const theme = useTheme()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Card>
      <CardContent>
        <div className='flex max-sm:flex-col items-center gap-6'>
          <div className='flex flex-col items-start gap-2 is-full sm:is-6/12'>
            <div className='flex items-center gap-2'>
              <i className='ri-star-smile-line text-[32px] text-primary' />
            </div>
            <Typography className='font-medium' color='text.primary'>
              Total 187 requisitions
            </Typography>
            <Typography>All requisitions are from the production department</Typography>
            <Chip label='+5 This week' variant='tonal' size='small' color='primary' />
          </div>
          <Divider orientation={isSmallScreen ? 'horizontal' : 'vertical'} flexItem />
          <div className='flex flex-col gap-3 is-full sm:is-6/12'>
            {totalRequisitionData.map((item, index) => (
              <div key={index} className='flex items-center gap-2'>
                <Typography variant='body2' className='text-nowrap'>
                  {item.inventory}
                </Typography>
                <LinearProgress
                  color='primary'
                  value={Math.floor((item.value / 78) * 100)}
                  variant='determinate'
                  className='bs-2 is-full'
                />
                <Typography variant='body2'>{item.value}</Typography>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TotalRequisitions
