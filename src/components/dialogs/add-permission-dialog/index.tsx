'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'

// Actions
import { createPermission } from '@/libs/actions/permissions.actions'
import { toast } from 'react-toastify'

type AddPermissionProps = {
  open: boolean
  setOpen: (open: boolean) => void
  onUpdate?: () => void
}

const modules = ['dashboard', 'stores', 'production', 'warehouse', 'sales', 'machinery', 'users', 'roles', 'permissions']
const actions = ['view', 'create', 'edit', 'delete', 'manage']

const AddPermissionDialog = ({ open, setOpen, onUpdate }: AddPermissionProps) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    displayName: '',
    module: '',
    action: '',
    description: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)
      const name = `${formData.module}.${formData.action}`
      
      await createPermission({
        name,
        displayName: formData.displayName,
        module: formData.module,
        action: formData.action,
        description: formData.description
      })
      
      toast.success('Permission created successfully')
      setOpen(false)
      setFormData({ displayName: '', module: '', action: '', description: '' })
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Error creating permission:', error)
      toast.error('Failed to create permission')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} maxWidth='md' scroll='body' onClose={() => setOpen(false)}>
      <DialogTitle variant='h4' className='flex gap-2 flex-col text-center sm:pbs-16 sm:pbe-6 sm:pli-16'>
        Add New Permission
        <Typography component='span' className='flex flex-col text-center'>
          Create a new permission for the system
        </Typography>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent className='pbs-0 sm:pbe-6 sm:pli-16'>
          <IconButton onClick={() => setOpen(false)} className='absolute block-start-4 inline-end-4'>
            <i className='ri-close-line text-textSecondary' />
          </IconButton>
          
          <Grid container spacing={5}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label='Permission Name'
                value={formData.displayName}
                onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                placeholder='e.g., View Dashboard'
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Module</InputLabel>
                <Select
                  label='Module'
                  value={formData.module}
                  onChange={e => setFormData({ ...formData, module: e.target.value })}
                >
                  {modules.map((module) => (
                    <MenuItem key={module} value={module}>
                      {module.charAt(0).toUpperCase() + module.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Action</InputLabel>
                <Select
                  label='Action'
                  value={formData.action}
                  onChange={e => setFormData({ ...formData, action: e.target.value })}
                >
                  {actions.map((action) => (
                    <MenuItem key={action} value={action}>
                      {action.charAt(0).toUpperCase() + action.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label='Description'
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder='Describe what this permission allows...'
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions className='justify-center pbs-0 sm:pbe-16 sm:pli-16'>
          <Button variant='contained' type='submit' disabled={loading}>
            {loading ? 'Creating...' : 'Create Permission'}
          </Button>
          <Button variant='outlined' color='secondary' onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default AddPermissionDialog
