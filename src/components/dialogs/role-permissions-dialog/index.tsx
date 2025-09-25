'use client'

// React Imports
import { useEffect, useState } from 'react'

// MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'

// Actions
import { getPermissionsList } from '@/libs/actions/permissions.actions'
import { updateRole, getRoleWithPermissions } from '@/libs/actions/roles.actions'
import { toast } from 'react-toastify'

type RolePermissionsProps = {
  open: boolean
  setOpen: (open: boolean) => void
  roleData: {
    $id: string
    name: string
    displayName: string
  }
  onUpdate?: () => void
}

type PermissionType = {
  $id: string
  name: string
  displayName: string
  module: string
  action: string
  description: string
}

const RolePermissionsDialog = ({ open, setOpen, roleData, onUpdate }: RolePermissionsProps) => {
  const [loading, setLoading] = useState(false)
  const [permissionsLoading, setPermissionsLoading] = useState(false)
  const [allPermissions, setAllPermissions] = useState<PermissionType[]>([])
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  // Group permissions by module
  const groupedPermissions = allPermissions.reduce((groups, permission) => {
    const module = permission.module
    if (!groups[module]) {
      groups[module] = []
    }
    groups[module].push(permission)
    return groups
  }, {} as Record<string, PermissionType[]>)

  // Fetch permissions and current role permissions
  useEffect(() => {
    const fetchData = async () => {
      if (open && roleData) {
        try {
          setPermissionsLoading(true)
          
          // Fetch all permissions
          const permissionsResponse = await getPermissionsList()
          setAllPermissions(permissionsResponse?.documents as unknown as PermissionType[])
          
          // Fetch current role permissions
          const roleWithPermissions = await getRoleWithPermissions(roleData.$id)
          const currentPermissionIds = roleWithPermissions.permissions?.map((p: any) => p.$id) || []
          console.log('Current Permission IDs:', currentPermissionIds) // Debugging line
          setSelectedPermissions(currentPermissionIds)
        } catch (error) {
          console.error('Error fetching data:', error)
          toast.error('Failed to fetch permissions data')
        } finally {
          setPermissionsLoading(false)
        }
      }
    }

    fetchData()
  }, [open, roleData])

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    if (checked) {
      setSelectedPermissions(prev => [...prev, permissionId])
    } else {
      setSelectedPermissions(prev => prev.filter(id => id !== permissionId))
    }
  }

  const handleModuleToggle = (modulePermissions: PermissionType[], allSelected: boolean) => {
    const modulePermissionIds = modulePermissions.map(p => p.$id)
    
    if (allSelected) {
      // Remove all module permissions
      setSelectedPermissions(prev => prev.filter(id => !modulePermissionIds.includes(id)))
    } else {
      // Add all module permissions
      setSelectedPermissions(prev => {
        const newPermissions = [...prev]
        modulePermissionIds.forEach(id => {
          if (!newPermissions.includes(id)) {
            newPermissions.push(id)
          }
        })
        return newPermissions
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)
      await updateRole(roleData.$id, {
        permissionIds: selectedPermissions
      })
      console.log('Selected Permissions being submitted:', selectedPermissions) // Debugging line
      
      toast.success('Role permissions updated successfully')
      setOpen(false)
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Error updating role permissions:', error)
      toast.error('Failed to update role permissions')
    } finally {
      setLoading(false)
    }
  }

  const isModuleFullySelected = (modulePermissions: PermissionType[]) => {
    return modulePermissions.every(p => selectedPermissions.includes(p.$id))
  }

  const isModulePartiallySelected = (modulePermissions: PermissionType[]) => {
    return modulePermissions.some(p => selectedPermissions.includes(p.$id)) && 
           !modulePermissions.every(p => selectedPermissions.includes(p.$id))
  }

  return (
    <Dialog open={open} maxWidth='md' fullWidth scroll='body' onClose={() => setOpen(false)}>
      <DialogTitle variant='h4' className='flex gap-2 flex-col text-center sm:pbs-16 sm:pbe-6 sm:pli-16'>
        Manage Role Permissions
        <Typography component='span' className='flex flex-col text-center'>
          Assign permissions to {roleData?.displayName}
        </Typography>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent className='pbs-0 sm:pbe-6 sm:pli-16'>
          <IconButton onClick={() => setOpen(false)} className='absolute block-start-4 inline-end-4'>
            <i className='ri-close-line text-textSecondary' />
          </IconButton>
          
          {permissionsLoading ? (
            <Box className='text-center py-8'>
              <Typography>Loading permissions...</Typography>
            </Box>
          ) : (
            <Grid container spacing={4}>
              <Grid item xs={12}>
                <Box className='mb-4'>
                  <Typography variant='h6' className='mb-2'>
                    Selected Permissions: 
                    <Chip 
                      label={selectedPermissions.length} 
                      color='primary' 
                      size='small' 
                      className='ml-2'
                    />
                  </Typography>
                </Box>
              </Grid>
              
              {Object.entries(groupedPermissions).map(([module, permissions]) => (
                <Grid item xs={12} key={module}>
                  <Box className='border rounded-lg p-4 mb-4'>
                    <Box className='flex items-center justify-between mb-3'>
                      <Typography variant='h6' className='capitalize flex items-center gap-2'>
                        <i className='ri-folder-line' />
                        {module}
                      </Typography>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isModuleFullySelected(permissions)}
                            indeterminate={isModulePartiallySelected(permissions)}
                            onChange={() => handleModuleToggle(permissions, isModuleFullySelected(permissions))}
                          />
                        }
                        label={`Select All ${module}`}
                      />
                    </Box>
                    <Divider className='mb-3' />
                    <Grid container spacing={2}>
                      {permissions.map((permission) => (
                        <Grid item xs={12} sm={6} key={permission.$id}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={selectedPermissions.includes(permission.$id)}
                                onChange={(e) => handlePermissionChange(permission.$id, e.target.checked)}
                              />
                            }
                            label={
                              <Box>
                                <Typography variant='body2' className='font-medium'>
                                  {permission.displayName}
                                </Typography>
                                <Typography variant='caption' color='text.secondary'>
                                  {permission.description}
                                </Typography>
                              </Box>
                            }
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions className='justify-center pbs-0 sm:pbe-16 sm:pli-16'>
          <Button variant='contained' type='submit' disabled={loading || permissionsLoading}>
            {loading ? 'Updating...' : 'Update Permissions'}
          </Button>
          <Button variant='outlined' color='secondary' onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default RolePermissionsDialog
