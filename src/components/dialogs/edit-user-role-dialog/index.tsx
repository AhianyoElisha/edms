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
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'

// Actions
import { updateUserInDB } from '@/libs/actions/customer.action'
import { getRolesList } from '@/libs/actions/roles.actions'
import { toast } from 'react-toastify'
import { Users } from '@/types/apps/ecommerceTypes'

type EditUserRoleProps = {
  open: boolean
  setOpen: (open: boolean) => void
  userData: Users
  onUpdate?: () => void
}

type RoleType = {
  $id: string
  name: string
  displayName: string
}

const EditUserRoleDialog = ({ open, setOpen, userData, onUpdate }: EditUserRoleProps) => {
  const [loading, setLoading] = useState(false)
  const [rolesLoading, setRolesLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState(userData.role || '')
  const [selectedStatus, setSelectedStatus] = useState(userData.status || 'active')
  const [availableRoles, setAvailableRoles] = useState<RoleType[]>([])

  // Fetch roles when dialog opens
  useEffect(() => {
    const fetchRoles = async () => {
      if (open) {
        try {
          setRolesLoading(true)
          const response = await getRolesList()
          setAvailableRoles(response?.documents as unknown as RoleType[])
        } catch (error) {
          console.error('Error fetching roles:', error)
          toast.error('Failed to fetch roles')
        } finally {
          setRolesLoading(false)
        }
      }
    }

    fetchRoles()
  }, [open])

  useEffect(() => {
    if (userData) {
      setSelectedRole(userData.role || '')
      setSelectedStatus(userData.status || 'active')
    }
  }, [userData, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Submitting role update:', { selectedRole, selectedStatus })
    try {
      setLoading(true)
      await updateUserInDB(userData.$id, {
        role: selectedRole,
        status: selectedStatus
      })
      
      toast.success('User role updated successfully')
      setOpen(false)
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Error updating user role:', error)
      toast.error('Failed to update user role')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} maxWidth='sm' scroll='body' onClose={() => setOpen(false)}>
      <DialogTitle variant='h4' className='flex gap-2 flex-col text-center sm:pbs-16 sm:pbe-6 sm:pli-16'>
        Edit User Role
        <Typography component='span' className='flex flex-col text-center'>
          Update role and status for {userData.name}
        </Typography>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent className='pbs-0 sm:pbe-6 sm:pli-16'>
          <IconButton onClick={() => setOpen(false)} className='absolute block-start-4 inline-end-4'>
            <i className='ri-close-line text-textSecondary' />
          </IconButton>
          
          <Grid container spacing={5}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>User Role</InputLabel>
                <Select
                  label='User Role'
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                  disabled={rolesLoading}
                >
                  {rolesLoading ? (
                    <MenuItem disabled>Loading roles...</MenuItem>
                  ) : (
                    availableRoles.map((role) => (
                      <MenuItem key={role.$id} value={role.$id}>
                        {role.displayName}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>User Status</InputLabel>
                <Select
                  label='User Status'
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                >
                  <MenuItem value='active'>Active</MenuItem>
                  <MenuItem value='inactive'>Inactive</MenuItem>
                  <MenuItem value='pending'>Pending</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions className='justify-center pbs-0 sm:pbe-16 sm:pli-16'>
          <Button variant='contained' type='submit' disabled={loading || rolesLoading}>
            {loading ? 'Updating...' : 'Update User'}
          </Button>
          <Button variant='outlined' color='secondary' onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default EditUserRoleDialog
