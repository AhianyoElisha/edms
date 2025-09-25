import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

interface ProductAddHeaderProps {
  index: number
  remove: (index: number) => void
}

const TransactionAddHeader = ({ index, remove }: ProductAddHeaderProps) => {
  return (
    <div className='flex flex-wrap sm:items-center justify-between max-sm:flex-col gap-6'>
      <div>
        <Typography variant='h4' className='mbe-1'>
          Bottle & Sachet Products Returned
        </Typography>
      </div>
      <div className='flex flex-wrap max-sm:flex-col gap-4'>
        <Button variant='outlined' color='error' onClick={() => remove(index)}>
          Discard
        </Button>
        {/* <Button variant='outlined'>Save Draft</Button> */}
      </div>
    </div>
  )
}

export default TransactionAddHeader