'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import AvatarGroup from '@mui/material/AvatarGroup'
import Button from '@mui/material/Button'
import type { TypographyProps } from '@mui/material/Typography'
import { Avatar } from '@mui/material'

// Component Imports
import RoleDialog from '@components/dialogs/role-dialog'
import RolePermissionsDialog from '@components/dialogs/role-permissions-dialog'
import OpenDialogOnElementClick from '@components/dialogs/OpenDialogOnElementClick'
import Link from '@components/Link'
import CustomAvatar from '@core/components/mui/Avatar'
import { Users } from '@/types/apps/ecommerceTypes'

type CardDataType = {
  $id?: string
  title: string
  role: string
  avatars: string[]
  totalUsers: number
  user: Users[]
}

const RoleCards = ({ usersData }: { usersData: Users[] }) => {
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<any>(null)

  // Vars
  const typographyProps: TypographyProps = {
    children: 'See Detail',
    component: Link,
    color: 'primary',
    onClick: e => e.preventDefault()
  }

  // Vars
  const cardData: CardDataType[] = [
    { totalUsers: 0, role: 'admin', title: 'Admin', avatars: [], user: []},
    { totalUsers: 0, role: 'storesrep', title: 'Stores', avatars: [], user: []},
    { totalUsers: 0, role: 'productionrep', title: 'Production', avatars: [], user: []},
    { totalUsers: 0, role: 'sachetrep', title: 'Sachet', avatars: [], user: []},
    { totalUsers: 0, role: 'warehouserep', title: 'Warehouse', avatars: [], user: []},
    { totalUsers: 0, role: 'salesrep', title: 'Sales', avatars: [], user: []}
  ].map(card => {
    const matchingUsers = usersData.filter(user => user.role?.name === card.role);
    return {
      ...card,
      totalUsers: matchingUsers.length,
      user: matchingUsers,
      avatars: matchingUsers.map(user => user.avatar || ''),
      title: matchingUsers.length > 0 ? matchingUsers[0].role?.displayName || card.title : card.title,
      $id: matchingUsers.length > 0 ? matchingUsers[0].role?.$id : undefined
    };
  });

  const handleManagePermissions = (roleData: any) => {
    setSelectedRole(roleData)
    setPermissionsDialogOpen(true)
  }

  return (
    <>
      <Grid container spacing={6}>
        {cardData.map((item, index) => (
          <Grid item xs={12} sm={6} lg={4} key={index}>
            <Card>
              <CardContent className='flex flex-col gap-4'>
                <div className='flex items-center justify-between'>
                  <Typography className='flex-grow'>{`Total ${item.totalUsers} users`}</Typography>
                  <AvatarGroup total={item.totalUsers} className='pull-up'>
                    <Avatar alt='Travis Howard' src='' />
                  </AvatarGroup>
                </div>
                <div className='flex justify-between items-center'>
                  <div className='flex flex-col items-start gap-1'>
                    <Typography variant='h5'>{item.title}</Typography>
                    <OpenDialogOnElementClick
                      element={Typography}
                      elementProps={typographyProps}
                      dialog={RoleDialog}
                      dialogProps={{ data: item }}
                    />
                  </div>
                </div>
                <div className='flex gap-2'>
                  <Button
                    variant='outlined'
                    size='small'
                    startIcon={<i className='ri-settings-4-line' />}
                    onClick={() => handleManagePermissions({
                      $id: item.$id, // You'll need to get the actual role ID from your roles collection
                      name: item.role,
                      displayName: item.title
                    })}
                    className='flex-1'
                  >
                    Manage Permissions
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* Role Permissions Dialog */}
      {selectedRole && (
        <RolePermissionsDialog
          open={permissionsDialogOpen}
          setOpen={setPermissionsDialogOpen}
          roleData={selectedRole}
          onUpdate={() => {
            // Refresh data if needed
            console.log('Role permissions updated')
          }}
        />
      )}
    </>
  )
}

export default RoleCards
