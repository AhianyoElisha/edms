'use client'

// React Imports
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'

// Component Imports
import PackageView from '@/views/edms/packages/view'
import { getPackageByIdWithRelations } from '@/libs/actions/package.actions'

const PackageDetailsPage = () => {
  const params = useParams()
  const [packageData, setPackageData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPackage = async () => {
      try {
        setLoading(true)
        const id = params.id as string
        const data = await getPackageByIdWithRelations(id)
        setPackageData(data)
      } catch (err) {
        console.error('Error fetching package:', err)
        setError(err instanceof Error ? err.message : 'Failed to load package')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchPackage()
    }
  }, [params.id])

  if (loading) {
    return (
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Card>
            <CardContent className='flex flex-col items-center justify-center py-12'>
              <CircularProgress size={60} className='mb-4' />
              <Typography variant='h6' color='text.secondary'>
                Loading package details...
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    )
  }

  if (error) {
    return (
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Card>
            <CardContent className='flex flex-col items-center justify-center py-12'>
              <i className='ri-error-warning-line text-6xl text-error mb-4' />
              <Typography variant='h6' color='error' className='mb-2'>
                Error Loading Package
              </Typography>
              <Typography variant='body2' color='text.secondary' className='mb-4'>
                {error}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    )
  }

  if (!packageData) {
    return (
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Card>
            <CardContent className='flex flex-col items-center justify-center py-12'>
              <i className='ri-inbox-line text-6xl text-textSecondary mb-4' />
              <Typography variant='h6' color='text.secondary'>
                Package not found
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    )
  }

  return <PackageView packageData={packageData} />
}

export default PackageDetailsPage
