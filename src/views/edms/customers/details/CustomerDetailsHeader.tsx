// MUI Imports
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import type { ButtonProps } from '@mui/material/Button'

// Type Imports
import type { ThemeColor } from '@core/types'

// Component Imports
import ConfirmationDialog from '@components/dialogs/confirmation-dialog'
import OpenDialogOnElementClick from '@components/dialogs/OpenDialogOnElementClick'
import { Breadcrumbs } from '@mui/material'
import StyledBreadcrumb from '@/components/layout/shared/Breadcrumbs'
import { useRouter } from 'next/navigation'

const CustomerDetailHeader = ({ customerId }: { customerId: string }) => {
  // Vars
  const buttonProps = (children: string, color: ThemeColor, variant: ButtonProps['variant']): ButtonProps => ({
    children,
    color,
    variant
  })

  const router = useRouter()

  return (
    <div className='flex flex-col gap-4'>
      <Breadcrumbs aria-label="breadcrumb" className='mt-10 ml-5 mb-5'>
        <StyledBreadcrumb 
          component="a"
          onClick={() => router.back()}
          icon={<i className='ri-menu-4-line' />}
          className='cursor-pointer'
          label="List" 
        />
        <StyledBreadcrumb
          label="Details"
          icon={<i className='ri-stack-line' />}
          className='cursor-pointer'
          disabled
        />
      </Breadcrumbs>
      <div className='flex flex-wrap justify-between max-sm:flex-col sm:items-center gap-x-6 gap-y-4'>
        <div className='flex flex-col items-start gap-1'>
          <Typography variant='h4'>{`Customer ID #${customerId.slice(0, 8)}`}</Typography>
        </div>
        <OpenDialogOnElementClick
          element={Button}
          elementProps={buttonProps('Delete Customer', 'error', 'outlined')}
          dialog={ConfirmationDialog}
          dialogProps={{ type: 'delete-customer' }}
        />
      </div>
    </div>
  )
}

export default CustomerDetailHeader
