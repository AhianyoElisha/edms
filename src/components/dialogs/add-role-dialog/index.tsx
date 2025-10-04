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

// Actions
import { createRole } from '@/libs/actions/roles.actions'
import { toast } from 'react-toastify'

type AddRoleDialogProps = {
  open: boolean
  setOpen: (open: boolean) => void
  onUpdate?: () => void
}

const AddRoleDialog = ({ open, setOpen, onUpdate }: AddRoleDialogProps) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (!formData.name || !formData.displayName) {
      toast.error('Please fill in all required fields')
      return
    }

    // Validate role name format (lowercase, no spaces)
    const roleNameRegex = /^[a-z][a-z0-9_]*$/
    if (!roleNameRegex.test(formData.name)) {
      toast.error('Role name must be lowercase with no spaces (use underscores)')
      return
    }

    try {
      setLoading(true)
      
      await createRole({
        name: formData.name,
        displayName: formData.displayName,
        description: formData.description,
        permissionIds: [] // No permissions initially, can be added later
      })
      
      toast.success('Role created successfully')
      setOpen(false)
      setFormData({ name: '', displayName: '', description: '' })
      if (onUpdate) onUpdate()
    } catch (error: any) {
      console.error('Error creating role:', error)
      if (error.message?.includes('unique')) {
        toast.error('A role with this name already exists')
      } else {
        toast.error('Failed to create role')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setFormData({ name: '', displayName: '', description: '' })
  }

  return (
    <Dialog open={open} maxWidth='sm' fullWidth scroll='body' onClose={handleClose}>
      <DialogTitle variant='h4' className='flex gap-2 flex-col text-center sm:pbs-16 sm:pbe-6 sm:pli-16'>
        Add New Role
        <Typography component='span' className='flex flex-col text-center text-sm'>
          Create a new role for the delivery service system
        </Typography>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent className='pbs-0 sm:pbe-6 sm:pli-16'>
          <IconButton onClick={handleClose} className='absolute block-start-4 inline-end-4'>
            <i className='ri-close-line text-textSecondary' />
          </IconButton>
          
          <Grid container spacing={5}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label='Role Name'
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value.toLowerCase() })}
                placeholder='e.g., delivery_manager'
                required
                helperText='Lowercase letters, numbers and underscores only'
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label='Display Name'
                value={formData.displayName}
                onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                placeholder='e.g., Delivery Manager'
                required
                helperText='User-friendly name shown in the interface'
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label='Description'
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder='Brief description of this role'
                multiline
                rows={3}
                helperText='Optional description of role responsibilities'
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions className='justify-center pbs-0 sm:pbe-16 sm:pli-16'>
          <Button variant='contained' type='submit' disabled={loading}>
            {loading ? 'Creating...' : 'Create Role'}
          </Button>
          <Button variant='outlined' color='secondary' onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default AddRoleDialog
