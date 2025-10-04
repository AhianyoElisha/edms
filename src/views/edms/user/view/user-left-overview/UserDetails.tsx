// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import type { ButtonProps } from '@mui/material/Button'

// Type Imports
import type { ThemeColor } from '@core/types'
import type { Users } from '@/types/apps/ecommerceTypes'

// Component Imports
import EditUserInfoDialog from '@components/dialogs/edit-user-info-dialog'
import ConfirmationDialog from '@components/dialogs/confirmation-dialog'
import OpenDialogOnElementClick from '@components/dialogs/OpenDialogOnElementClick'
import CustomAvatar from '@core/components/mui/Avatar'

const UserDetails = ({ userData, onUpdate }: { userData: Users; onUpdate?: () => void }) => {
  // Vars
  const buttonProps = (children: string, color: ThemeColor, variant: ButtonProps['variant']): ButtonProps => ({
    children,
    color,
    variant
  })

  const getRoleColor = (role: string): ThemeColor => {
    switch (role) {
      case 'admin': return 'error'
      case 'storesrep': return 'primary'
      case 'productionrep': return 'success'
      case 'warehouserep': return 'info'
      case 'sachetrep': return 'warning'
      case 'marketingrep': return 'secondary'
      default: return 'primary'
    }
  }

  const getStatusColor = (status: string): ThemeColor => {
    switch (status) {
      case 'active': return 'success'
      case 'inactive': return 'error'
      case 'pending': return 'warning'
      default: return 'primary'
    }
  }

  return (
    <>
      <Card>
        <CardContent className='flex flex-col pbs-12 gap-6'>
          <div className='flex flex-col gap-6'>
            <div className='flex flex-col items-center justify-center gap-4'>
              <CustomAvatar
                alt='user-profile'
                src={userData.avatar || '/images/avatars/1.png'}
                variant='square'
                className='rounded-lg'
                size={70}
                sx={{
                  '& .MuiAvatar-img': {
                    objectFit: 'contain'
                  }
                }}
              />
              <Typography variant='h5'>{userData.name}</Typography>
              <Chip 
                label={userData.role?.displayName.charAt(0).toUpperCase() + userData.role?.displayName.slice(1)} 
                variant='tonal' 
                color={getRoleColor(userData.role?.name)} 
                size='small' 
              />
            </div>
            <div className='flex items-center justify-around flex-wrap gap-4'>
              <div className='flex items-center gap-4'>
                <CustomAvatar variant='rounded' color='primary' skin='light'>
                  <i className='ri-user-line' />
                </CustomAvatar>
                <div>
                  <Typography variant='h5'>{userData.status === 'active' ? 'Active' : 'Inactive'}</Typography>
                  <Typography>Status</Typography>
                </div>
              </div>
              <div className='flex items-center gap-4'>
                <CustomAvatar variant='rounded' color='primary' skin='light'>
                  <i className='ri-calendar-line' />
                </CustomAvatar>
                <div>
                  <Typography variant='h5'>
                    {new Date(userData.$createdAt).toLocaleDateString()}
                  </Typography>
                  <Typography>Joined</Typography>
                </div>
              </div>
            </div>
          </div>
          <div>
            <Typography variant='h5'>Details</Typography>
            <Divider className='mlb-4' />
            <div className='flex flex-col gap-2'>
              <div className='flex items-center flex-wrap gap-x-1.5'>
                <Typography color='text.primary' className='font-medium'>
                  Full Name:
                </Typography>
                <Typography>{userData.name}</Typography>
              </div>
              <div className='flex items-center flex-wrap gap-x-1.5'>
                <Typography color='text.primary' className='font-medium'>
                  Email:
                </Typography>
                <Typography>{userData.email}</Typography>
              </div>
              <div className='flex items-center flex-wrap gap-x-1.5'>
                <Typography color='text.primary' className='font-medium'>
                  Status:
                </Typography>
                <Chip 
                  label={userData.status} 
                  variant='tonal' 
                  color={getStatusColor(userData.status)} 
                  size='small' 
                  className='capitalize'
                />
              </div>
              <div className='flex items-center flex-wrap gap-x-1.5'>
                <Typography color='text.primary' className='font-medium'>
                  Role:
                </Typography>
                <Typography className='capitalize'>{userData.role?.displayName}</Typography>
              </div>
              <div className='flex items-center flex-wrap gap-x-1.5'>
                <Typography color='text.primary' className='font-medium'>
                  Contact:
                </Typography>
                <Typography>{userData.phone}</Typography>
              </div>
            </div>
          </div>
          <div className='flex gap-4 justify-center'>
            <OpenDialogOnElementClick
              element={Button}
              elementProps={buttonProps('Edit', 'primary', 'contained')}
              dialog={EditUserInfoDialog}
              dialogProps={{ userData, onUpdate }}
            />
            <OpenDialogOnElementClick
              element={Button}
              elementProps={buttonProps(userData.status === 'active' ? 'Suspend' : 'Activate', 'error', 'outlined')}
              dialog={ConfirmationDialog}
              dialogProps={{ type: 'suspend-account', userData }}
            />
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export default UserDetails
