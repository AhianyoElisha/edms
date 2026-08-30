'use client'

// React Imports
import { Suspense } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'

// Component Imports
import PermissionGuard from '@/components/PermissionGuard'
import ReturnWaybillReviewQueue from '@/views/edms/returns/waybills/ReturnWaybillReviewQueue'

const ReviewFallback = () => (
  <Card>
    <CardContent className='flex items-center justify-center py-16'>
      <CircularProgress />
    </CardContent>
  </Card>
)

const ReturnWaybillReviewPage = () => (
  <PermissionGuard permissions={['deliveries.edit', 'deliveries.manage']}>
    <Suspense fallback={<ReviewFallback />}>
      <ReturnWaybillReviewQueue />
    </Suspense>
  </PermissionGuard>
)

export default ReturnWaybillReviewPage
