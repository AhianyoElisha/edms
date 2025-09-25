// React Imports
import { useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import type { ButtonProps } from '@mui/material/Button'
import type { IconButtonProps } from '@mui/material/IconButton'

// Component Imports
import OptionMenu from '@core/components/option-menu'
import AddNewAddress from '@components/dialogs/add-edit-address'
import OpenDialogOnElementClick from '@components/dialogs/OpenDialogOnElementClick'

// Type Imports
import type { Customer } from '@/types/apps/ecommerceTypes'

type CustomerAddressProps = {
  customerData: Customer
  isPrimary?: boolean
}

const CustomerAddress = ({ customerData, isPrimary = true }: CustomerAddressProps) => {
  // States
  const [expanded, setExpanded] = useState(isPrimary)

  // Vars
  const iconButtonProps: IconButtonProps = {
    children: <i className='ri-edit-box-line' />,
    className: 'text-textSecondary'
  }

  // Hooks
  const theme = useTheme()

  // Format the address display
  const getAddressType = () => {
    if (isPrimary) return 'Primary Address'
    return 'Address'
  }

  const getFullAddress = () => {
    const addressParts = [
      customerData?.address1,
      customerData?.address2,
      customerData?.town,
      customerData?.city,
      customerData?.state
    ].filter(Boolean)
    
    return addressParts.join(', ')
  }

  const getContactInfo = () => {
    const contacts = [customerData?.contact1, customerData?.contact2].filter(Boolean)
    return contacts.join(' / ')
  }

  return (
    <>
      <div className='flex flex-wrap justify-between items-center mlb-3 gap-y-2'>
        <div className='flex items-center gap-2'>
          <IconButton
            size='large'
            sx={{
              '& i': {
                transition: 'transform 0.3s',
                transform: expanded ? 'rotate(0deg)' : theme.direction === 'ltr' ? 'rotate(-90deg)' : 'rotate(90deg)'
              }
            }}
            onClick={() => setExpanded(!expanded)}
          >
            <i className='ri-arrow-down-s-line text-textPrimary' />
          </IconButton>
          <div className='flex flex-col items-start gap-1'>
            <div className='flex items-center gap-2'>
              <Typography color='text.primary' className='font-medium'>
                {getAddressType()}
              </Typography>
              {isPrimary && <Chip variant='tonal' color='success' label='Default Address' size='small' />}
            </div>
            <Typography className='text-sm text-textSecondary'>
              {customerData?.address1 || 'No address provided'}
            </Typography>
          </div>
        </div>
        <div className='mis-10'>
          <OpenDialogOnElementClick
            element={IconButton}
            elementProps={iconButtonProps}
            dialog={AddNewAddress}
            dialogProps={{ data: customerData }}
          />
          <IconButton>
            <i className='ri-delete-bin-7-line text-textSecondary' />
          </IconButton>
          <OptionMenu
            iconClassName='text-textSecondary'
            iconButtonProps={{ size: 'medium' }}
            options={['Set as Default Address', 'Edit Address', 'Delete Address']}
          />
        </div>
      </div>
      <Collapse in={expanded} timeout={300}>
        <div className='flex flex-col gap-3 pb-3 pis-12'>
          {/* Customer Name */}
          <div>
            <Typography color='text.primary' className='font-medium mb-1'>
              Customer Name
            </Typography>
            <Typography className='text-textSecondary'>
              {customerData?.customer || 'Not provided'}
            </Typography>
          </div>

          {/* Address Details */}
          <div>
            <Typography color='text.primary' className='font-medium mb-1'>
              Address
            </Typography>
            <div className='flex flex-col gap-1'>
              {customerData?.address1 && (
                <Typography className='text-textSecondary'>{customerData.address1}</Typography>
              )}
              {customerData?.address2 && (
                <Typography className='text-textSecondary'>{customerData.address2}</Typography>
              )}
              <Typography className='text-textSecondary'>
                {[customerData?.town, customerData?.city, customerData?.state].filter(Boolean).join(', ')}
              </Typography>
              {customerData?.country && (
                <Typography className='text-textSecondary'>{customerData.country}</Typography>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <Typography color='text.primary' className='font-medium mb-1'>
              Contact Information
            </Typography>
            <div className='flex flex-col gap-1'>
              {customerData?.email && (
                <Typography className='text-textSecondary'>
                  <i className='ri-mail-line me-2' />
                  {customerData.email}
                </Typography>
              )}
              {customerData?.contact1 && (
                <Typography className='text-textSecondary'>
                  <i className='ri-phone-line me-2' />
                  {customerData.contact1}
                </Typography>
              )}
              {customerData?.contact2 && (
                <Typography className='text-textSecondary'>
                  <i className='ri-phone-line me-2' />
                  {customerData.contact2} (Secondary)
                </Typography>
              )}
            </div>
          </div>

          {/* GPS Code */}
          {customerData?.GPScode && (
            <div>
              <Typography color='text.primary' className='font-medium mb-1'>
                GPS Code
              </Typography>
              <Typography className='text-textSecondary'>
                <i className='ri-map-pin-line me-2' />
                {customerData.GPScode}
              </Typography>
            </div>
          )}
        </div>
      </Collapse>
    </>
  )
}

const AddressBook = ({ customerData }: { customerData?: Customer }) => {
  // Vars
  const buttonProps: ButtonProps = {
    variant: 'outlined',
    children: 'Add New Address',
    size: 'small'
  }

  // Show loading or empty state if no customer data
  if (!customerData) {
    return (
      <Card>
        <CardHeader
          title='Customer Address'
          action={<OpenDialogOnElementClick element={Button} elementProps={buttonProps} dialog={AddNewAddress} />}
        />
        <CardContent>
          <div className='flex flex-col items-center justify-center py-8'>
            <i className='ri-map-pin-line text-4xl text-textSecondary mb-2' />
            <Typography variant='h6' className='mb-1'>
              No Address Information
            </Typography>
            <Typography className='text-textSecondary text-center'>
              Customer address information is not available or still loading.
            </Typography>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader
        title='Customer Address'
        action={<OpenDialogOnElementClick element={Button} elementProps={buttonProps} dialog={AddNewAddress} />}
      />
      <CardContent>
        <CustomerAddress customerData={customerData} isPrimary={true} />
      </CardContent>
    </Card>
  )
}

export default AddressBook