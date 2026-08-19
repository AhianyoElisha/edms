'use client'

// React Imports
import { Suspense } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'

// Component Imports
import PermissionGuard from '@/components/PermissionGuard'
import ManifestReviewQueue from '@/views/edms/manifests/ManifestReviewQueue'

const ReviewFallback = () => (
  <Card>
    <CardContent className='flex items-center justify-center py-16'>
      <CircularProgress />
    </CardContent>
  </Card>
)

const ManifestReviewPage = () => (
  <PermissionGuard permissions={['manifests.edit', 'manifests.manage']}>
    <Suspense fallback={<ReviewFallback />}>
      <ManifestReviewQueue />
    </Suspense>
  </PermissionGuard>
)

export default ManifestReviewPage
