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

// Actions
import { updateUserInDB } from '@/libs/actions/customer.action'
import { toast } from 'react-toastify'
import { Users } from '@/types/apps/ecommerceTypes'

type EditUserInfoProps = {
  open: boolean
  setOpen: (open: boolean) => void
  userData: Users
  onUpdate?: () => void
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

const EditUserInfoDialog = ({ open, setOpen, userData, onUpdate }: EditUserInfoProps) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: '',
    status: 'active'
  })

  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        avatar: userData.avatar || availableAvatars[0],
        status: userData.status || 'active'
      })
    }
  }, [userData, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)
      await updateUserInDB(userData.$id, formData)
      
      toast.success('User information updated successfully')
      setOpen(false)
      // Trigger the parent component's update callback to refresh data
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Error updating user info:', error)
      toast.error('Failed to update user information')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} maxWidth='md' scroll='body' onClose={() => setOpen(false)}>
      <DialogTitle variant='h4' className='flex gap-2 flex-col text-center sm:pbs-16 sm:pbe-6 sm:pli-16'>
        Edit User Information
        <Typography component='span' className='flex flex-col text-center'>
          Update user profile details
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
            
            <Grid item xs={12} sm={6}>
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
                label='Email'
                type='email'
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder='Enter email address'
                required
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
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  label='Status'
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
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
          <Button variant='contained' type='submit' disabled={loading}>
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

export default EditUserInfoDialog
