'use client'

// React Imports
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'

// Component Imports
import ReturnWaybillView from '@/views/edms/returns/waybills/view'
import { getReturnWaybillById } from '@/libs/actions/returnwaybill.actions'

const ReturnWaybillDetailsPage = () => {
  const params = useParams()
  const router = useRouter()
  const [waybillData, setWaybillData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWaybillData = async () => {
    try {
      setLoading(true)
      const id = params.id as string
      
      if (!id || id === 'undefined' || id === 'null') {
        setError('Invalid waybill ID')
        return
      }
      
      const data = await getReturnWaybillById(id)
      
      if (!data || !data.$id) {
        setError('Return waybill not found')
        return
      }
      
      setWaybillData(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching return waybill:', err)
      setError('Failed to load return waybill details')
    } finally {
      setLoading(false)
    }
  }

  // Refetch function for the child component to call after updates
  const handleRefetch = async () => {
    await fetchWaybillData()
  }

  useEffect(() => {
    fetchWaybillData()
  }, [params.id])

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={8}>
            <i className='ri-error-warning-line text-6xl text-error' />
            <Typography variant="h6" color="error">{error}</Typography>
            <Typography variant="body2" color="text.secondary">
              The return waybill you're looking for could not be found.
            </Typography>
            <Box mt={2}>
              <button 
                onClick={() => router.push('/edms/returns/waybills')}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
              >
                Back to Return Waybills
              </button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    )
  }

  return <ReturnWaybillView waybillData={waybillData} onRefetch={handleRefetch} />
}

export default ReturnWaybillDetailsPage
