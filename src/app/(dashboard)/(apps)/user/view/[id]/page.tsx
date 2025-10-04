'use client'

// MUI Imports
import Grid from '@mui/material/Grid'

// Data Imports
import LoaderDark from '@/components/layout/shared/LoaderDark'
import { getUserById } from '@/libs/actions/customer.action'
import { useParams } from 'next/navigation'
import UserView from '@/views/edms/user/view'
import { Users } from '@/types/apps/ecommerceTypes'
import { toast } from 'react-toastify'
import { useEffect, useState } from 'react'

export default function UserViewPage() {
  const params = useParams()
  const [userData, setUserData] = useState<Users | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUserData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const userContent = await getUserById(params.id as string)
      if (!userContent) {
        setError('User not found')
        return
      }
      setUserData(userContent as unknown as Users)
    } catch (error) {
      console.error('Error fetching user data:', error)
      setError('Failed to load user data')
      toast.error('Failed to load user data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (params.id) {
      fetchUserData()
    }
  }, [params.id])

  if (isLoading) {
    return (
      <div className='fixed inset-0 flex items-center justify-center z-50'>
        <LoaderDark />
      </div>
    )
  }

  if (error || !userData) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <h2 className='text-xl font-semibold mb-2'>Error</h2>
          <p className='text-gray-600'>{error || 'User not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <UserView userData={userData} userId={params.id as string} onUpdate={fetchUserData} />
      </Grid>
    </Grid>
  )
}
