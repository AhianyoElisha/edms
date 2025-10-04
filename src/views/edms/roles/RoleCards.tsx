'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import AvatarGroup from '@mui/material/AvatarGroup'
import Button from '@mui/material/Button'
import type { TypographyProps } from '@mui/material/Typography'
import { Avatar, CircularProgress } from '@mui/material'

// Component Imports
import RoleDialog from '@components/dialogs/role-dialog'
import RolePermissionsDialog from '@components/dialogs/role-permissions-dialog'
import AddRoleDialog from '@components/dialogs/add-role-dialog'
import OpenDialogOnElementClick from '@components/dialogs/OpenDialogOnElementClick'
import Link from '@components/Link'
import CustomAvatar from '@core/components/mui/Avatar'
import { Users } from '@/types/apps/ecommerceTypes'

// Actions
import { getRolesList } from '@/libs/actions/roles.actions'

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
  const [addRoleDialogOpen, setAddRoleDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<any>(null)
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Vars
  const typographyProps: TypographyProps = {
    children: 'See Detail',
    component: Link,
    color: 'primary',
    onClick: e => e.preventDefault()
  }

  // Fetch roles from database
  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    try {
      setLoading(true)
      const rolesResponse = await getRolesList()
      setRoles(rolesResponse.documents || [])
    } catch (error) {
      console.error('Error fetching roles:', error)
    } finally {
      setLoading(false)
    }
  }

  // Map roles from database to card data
  const cardData: CardDataType[] = roles.map(role => {
    const matchingUsers = usersData.filter(user => user.role?.$id === role.$id)
    return {
      $id: role.$id,
      role: role.name,
      title: role.displayName,
      totalUsers: matchingUsers.length,
      user: matchingUsers,
      avatars: matchingUsers.map(user => user.avatar || '')
    }
  })

  const handleManagePermissions = (roleData: any) => {
    setSelectedRole(roleData)
    setPermissionsDialogOpen(true)
  }

  const handleAddRole = () => {
    setAddRoleDialogOpen(true)
  }

  if (loading) {
    return (
      <div className='flex justify-center items-center min-h-[400px]'>
        <CircularProgress />
      </div>
    )
  }

  return (
    <>
      <Grid container spacing={6}>
        {/* Existing Role Cards */}
        {cardData.map((item, index) => (
          <Grid item xs={12} sm={6} lg={4} key={index}>
            <Card>
              <CardContent className='flex flex-col gap-4'>
                <div className='flex items-center justify-between'>
                  <Typography className='flex-grow'>{`Total ${item.totalUsers} users`}</Typography>
                  <AvatarGroup total={item.totalUsers} className='pull-up'>
                    {item.avatars.slice(0, 3).map((avatar, idx) => (
                      <Avatar key={idx} alt={item.user[idx]?.name} src={avatar} sx={{ '& img': { objectFit: 'contain' } }} />
                    ))}
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
                      $id: item.$id,
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

        {/* Add New Role Card */}
        <Grid item xs={12} sm={6} lg={4}>
          <Card className='border-2 border-dashed' sx={{ borderColor: 'primary.main' }}>
            <CardContent className='flex flex-col gap-4 items-center justify-center min-h-[200px]'>
              <Avatar
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: 'primary.main'
                }}
              >
                <i className='ri-add-line text-3xl' />
              </Avatar>
              <Typography variant='h5' className='text-center'>
                Add New Role
              </Typography>
              <Typography variant='body2' color='text.secondary' className='text-center'>
                Create a new role for the delivery service system
              </Typography>
              <Button
                variant='contained'
                startIcon={<i className='ri-add-line' />}
                onClick={handleAddRole}
              >
                Add Role
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Add Role Dialog */}
      <AddRoleDialog
        open={addRoleDialogOpen}
        setOpen={setAddRoleDialogOpen}
        onUpdate={fetchRoles}
      />
      
      {/* Role Permissions Dialog */}
      {selectedRole && (
        <RolePermissionsDialog
          open={permissionsDialogOpen}
          setOpen={setPermissionsDialogOpen}
          roleData={selectedRole}
          onUpdate={() => {
            fetchRoles()
            console.log('Role permissions updated')
          }}
        />
      )}
    </>
  )
}

export default RoleCards
