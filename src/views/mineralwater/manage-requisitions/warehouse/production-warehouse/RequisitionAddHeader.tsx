import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { UseFieldArrayRemove } from 'react-hook-form'

interface ProductAddHeaderProps {
  index: number
  remove: UseFieldArrayRemove
}

const ProductionToWarehouseRequisitionHeader = ({ index, remove }: ProductAddHeaderProps) => {
  return (
    <div className='flex flex-wrap sm:items-center justify-between max-sm:flex-col gap-6'>
      <div>
        <Typography variant='h4' className='mbe-1'>
          Make a Requisition From Production to Warehouse
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

export default ProductionToWarehouseRequisitionHeader