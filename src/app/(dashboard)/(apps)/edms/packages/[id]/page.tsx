'use client'

/**
 * DEPRECATED: Individual package pages are no longer used.
 * Package tracking is now done at the manifest level.
 * Each manifest has: packageSize, packageCount, and deliveredCount
 * 
 * This page redirects to the manifests list.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'

const PackageDetailsPage = () => {
  const router = useRouter()

  useEffect(() => {
    // Redirect to manifests list after a brief delay
    const timer = setTimeout(() => {
      router.replace('/edms/manifests')
    }, 2000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <CircularProgress size={60} className='mb-4' />
            <Typography variant='h6' color='text.secondary' className='mb-2'>
              Package tracking has been updated
            </Typography>
            <Typography variant='body2' color='text.secondary' className='mb-4'>
              Packages are now tracked at the manifest level. Redirecting to manifests...
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default PackageDetailsPage
