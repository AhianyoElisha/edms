'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Button from '@mui/material/Button'

// Type Imports
import type { Users } from '@/types/apps/ecommerceTypes'

// Actions
import { account } from '@/libs/appwrite.config'
import { toast } from 'react-toastify'

const ChangePassword = ({ userData }: { userData: Users }) => {
  // States
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [isConfirmPasswordShown, setIsConfirmPasswordShown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    try {
      setLoading(true)
      
      // Update password using Appwrite account service
      await account.updatePassword(formData.password)
      
      toast.success('Password updated successfully')
      setFormData({ password: '', confirmPassword: '' })
    } catch (error) {
      console.error('Error updating password:', error)
      toast.error('Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader title='Change Password' />
      <CardContent className='flex flex-col gap-4'>
        <Alert icon={false} severity='warning'>
          <AlertTitle>Ensure that these requirements are met</AlertTitle>
          Minimum 8 characters long, uppercase & symbol
        </Alert>
        <form onSubmit={handlePasswordChange}>
          <Grid container spacing={4}>
            <Grid item xs={12}>
              <Grid container spacing={5}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label='New Password'
                    type={isPasswordShown ? 'text' : 'password'}
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position='end'>
                          <IconButton
                            size='small'
                            edge='end'
                            onClick={() => setIsPasswordShown(!isPasswordShown)}
                            onMouseDown={e => e.preventDefault()}
                          >
                            <i className={isPasswordShown ? 'ri-eye-off-line' : 'ri-eye-line'} />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label='Confirm Password'
                    type={isConfirmPasswordShown ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position='end'>
                          <IconButton
                            size='small'
                            edge='end'
                            onClick={() => setIsConfirmPasswordShown(!isConfirmPasswordShown)}
                            onMouseDown={e => e.preventDefault()}
                          >
                            <i className={isConfirmPasswordShown ? 'ri-eye-off-line' : 'ri-eye-line'} />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                    required
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <Button variant='contained' type='submit' disabled={loading}>
                {loading ? 'Updating...' : 'Change Password'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Card>
  )
}

export default ChangePassword
