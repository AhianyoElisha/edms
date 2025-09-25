// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Avatar from '@mui/material/Avatar'
import Typography from '@mui/material/Typography'
import type { TypographyProps } from '@mui/material/Typography'
import Chip from '@mui/material/Chip'

// Type Imports
import type { ThemeColor } from '@core/types'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'
import EditUserInfo from '@components/dialogs/edit-user-info'
import OpenDialogOnElementClick from '@components/dialogs/OpenDialogOnElementClick'

// Util Imports
import { getInitials } from '@/utils/getInitials'

const getAvatar = (params: { avatar?: string; name?: string }) => {
  const { avatar, name } = params

  if (avatar) {
    return <Avatar src={avatar} />
  } else {
    return <Avatar>{getInitials(name || '')}</Avatar>
  }
}

const AssignedStaff = ({ vehicleData }: { vehicleData?: any }) => {
  // Vars
  const typographyProps = (children: string, color: ThemeColor, className: string): TypographyProps => ({
    children,
    color,
    className
  })

  const staff = vehicleData?.staff
  console.log('Staff Data:', staff) // Debugging line to check staff data

  return (
    <Card>
      <CardContent className='flex flex-col gap-6'>
        <Typography variant='h5'>Assigned Staff</Typography>

        {staff.length > 0 ? (
          <>
            <div className='flex items-center gap-3'>
              {getAvatar({ avatar: staff.avatar, name: staff.name })}
              <div className='flex flex-col'>
                <Typography color='text.primary' className='font-medium'>
                  {staff.name}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {staff.role}
                </Typography>
              </div>
            </div>
            
            <div className='flex items-center gap-3'>
              <Chip
                variant='tonal'
                label={staff.status || 'active'}
                size='small'
                color={staff.status === 'active' ? 'success' : 'error'}
              />
            </div>
            
            <div className='flex flex-col gap-1'>
              <div className='flex justify-between items-center'>
                <Typography color='text.primary' className='font-medium'>
                  Contact Info
                </Typography>
                <OpenDialogOnElementClick
                  element={Typography}
                  elementProps={typographyProps('Edit', 'primary', 'cursor-pointer font-medium')}
                  dialog={EditUserInfo}
                  dialogProps={{ data: staff }}
                />
              </div>
              <Typography>Email: {staff.email}</Typography>
              <Typography>Phone: {staff.phone}</Typography>
            </div>
          </>
        ) : (
          <div className='flex flex-col items-center gap-3 py-8'>
            <CustomAvatar skin='light' color='secondary' size={60}>
              <i className='ri-user-add-line text-[32px]' />
            </CustomAvatar>
            <Typography color='text.secondary' className='text-center'>
              No staff assigned to this vehicle
            </Typography>
            <Typography variant='body2' color='text.secondary' className='text-center'>
              Assign a staff member to manage this vehicle
            </Typography>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AssignedStaff
