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
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import InputAdornment from '@mui/material/InputAdornment'

// Actions
import { createUserAccount } from '@/libs/actions/user.actions'
import { getRolesList } from '@/libs/actions/roles.actions'
import { toast } from 'react-toastify'

type AddUserProps = {
  open: boolean
  setOpen: (open: boolean) => void
  onUpdate?: () => void
}

type RoleType = {
  $id: string
  name: string
  displayName: string
}

// Available avatars from the characters folder
const availableAvatars = [
  '/images/illustrations/characters/1.png',
  '/images/illustrations/characters/7.png',
  '/images/illustrations/characters/8.png',
  '/images/illustrations/characters/10.png',
  '/images/illustrations/characters/11.png',
  '/images/illustrations/characters/12.png',
  '/images/illustrations/characters/13.png',
  '/images/illustrations/characters/14.png'
]

const AddUserDialog = ({ open, setOpen, onUpdate }: AddUserProps) => {
  const [loading, setLoading] = useState(false)
  const [rolesLoading, setRolesLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [availableRoles, setAvailableRoles] = useState<RoleType[]>([])
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    phone: '',
    role: '',
    avatar: availableAvatars[0]
  })

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)
      
      console.log('=== Form Data Being Submitted ===');
      console.log('Form data:', formData);
      
      await createUserAccount(formData)
      
      toast.success('User created successfully')
      setOpen(false)
      setFormData({
        name: '',
        username: '',
        email: '',
        password: '',
        phone: '',
        role: '',
        avatar: availableAvatars[0]
      })
      if (onUpdate) onUpdate()
    } catch (error: any) {
      console.error('=== Error in Add User Dialog ===');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      
      // Show specific error message if available
      if (error.message) {
        toast.error(error.message)
      } else {
        toast.error('Failed to create user. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} maxWidth='md' scroll='body' onClose={() => setOpen(false)}>
      <DialogTitle variant='h4' className='flex gap-2 flex-col text-center sm:pbs-16 sm:pbe-6 sm:pli-16'>
        Add New User
        <Typography component='span' className='flex flex-col text-center'>
          Create a new user account
        </Typography>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent className='pbs-0 sm:pbe-6 sm:pli-16'>
          <IconButton onClick={() => setOpen(false)} className='absolute block-start-4 inline-end-4'>
            <i className='ri-close-line text-textSecondary' />
          </IconButton>
          
          <Grid container spacing={5}>
            <Grid item xs={12}>
              <Typography variant='h6' className='mb-4'>Select Avatar</Typography>
              <Box className='flex flex-wrap gap-4'>
                {availableAvatars.map((avatar, index) => (
                  <Avatar
                    key={index}
                    src={avatar}
                    onClick={() => setFormData({ ...formData, avatar })}
                    className={`cursor-pointer w-16 h-16 ${
                      formData.avatar === avatar ? 'ring-4 ring-primary' : ''
                    }`}
                    sx={{ 
                      '& img': { 
                        objectFit: 'contain'
                      }
                    }}
                  />
                ))}
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label='Full Name'
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder='Enter full name'
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Username'
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                placeholder='e.g., esther'
                required
                helperText='Will be used as login username (username@eds.com)'
                InputProps={{
                  endAdornment: (
                    <InputAdornment position='end'>
                      <Typography variant='body2' color='text.secondary'>
                        @eds.com
                      </Typography>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Password'
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                placeholder='Enter password'
                required
                helperText='Password for user login'
                InputProps={{
                  endAdornment: (
                    <InputAdornment position='end'>
                      <IconButton
                        size='small'
                        edge='end'
                        onClick={() => setShowPassword(!showPassword)}
                        onMouseDown={e => e.preventDefault()}
                      >
                        <i className={showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Personal Email'
                type='email'
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder='e.g., esthersoglo@gmail.com'
                required
                helperText='Personal email for contact purposes'
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Phone Number'
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder='Enter phone number'
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Role</InputLabel>
                <Select
                  label='Role'
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
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
          </Grid>
        </DialogContent>
        
        <DialogActions className='justify-center pbs-0 sm:pbe-16 sm:pli-16'>
          <Button variant='contained' type='submit' disabled={loading || rolesLoading}>
            {loading ? 'Creating...' : 'Create User'}
          </Button>
          <Button variant='outlined' color='secondary' onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default AddUserDialog
