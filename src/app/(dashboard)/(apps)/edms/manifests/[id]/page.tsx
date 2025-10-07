'use client'

// React Imports
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'

// Component Imports
import ManifestView from '@/views/edms/manifests/view'
import { getManifestByIdWithRelations } from '@/libs/actions/manifest.actions'

const ManifestDetailsPage = () => {
  const params = useParams()
  const router = useRouter()
  const [manifestData, setManifestData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchManifestData = async () => {
      try {
        setLoading(true)
        const id = params.id as string
        const data = await getManifestByIdWithRelations(id)
        setManifestData(data)
      } catch (err) {
        console.error('Error fetching manifest:', err)
        setError(err instanceof Error ? err.message : 'Failed to load manifest')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchManifestData()
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
                Loading manifest details...
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
                Error Loading Manifest
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

  if (!manifestData) {
    return (
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Card>
            <CardContent className='flex flex-col items-center justify-center py-12'>
              <i className='ri-file-list-3-line text-6xl text-textSecondary mb-4' />
              <Typography variant='h6' color='text.secondary'>
                Manifest not found
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    )
  }

  return <ManifestView manifestData={manifestData} />
}

export default ManifestDetailsPage
