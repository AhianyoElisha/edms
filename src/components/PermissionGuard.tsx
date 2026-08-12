'use client'

import { useRouter } from 'next/navigation'
import { usePermissions } from '@/hooks/usePermissions'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'

interface PermissionGuardProps {
  children: React.ReactNode
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  // Restrict access to the admin role regardless of granted permissions
  adminOnly?: boolean
  fallback?: React.ReactNode
}

const DefaultFallback = () => {
  const router = useRouter()

  return (
    <Card>
      <CardContent className='flex flex-col items-center justify-center py-12'>
        <i className='ri-lock-line text-6xl text-error mb-4' />
        <Typography variant='h5' className='mb-2'>
          Access Denied
        </Typography>
        <Typography variant='body2' color='text.secondary' className='mb-4 text-center'>
          You do not have permission to access this page. Contact your administrator if you believe this is an error.
        </Typography>
        <Button variant='contained' onClick={() => router.push('/dashboard')}>
          Go to Dashboard
        </Button>
      </CardContent>
    </Card>
  )
}

const PermissionGuard = ({
  children,
  permission,
  permissions,
  requireAll = false,
  adminOnly = false,
  fallback
}: PermissionGuardProps) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isAdmin, isLoading } = usePermissions()

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[300px]'>
        <CircularProgress />
      </div>
    )
  }

  if (adminOnly && !isAdmin) {
    return fallback ? <>{fallback}</> : <DefaultFallback />
  }

  let hasAccess = false

  if (permission) {
    hasAccess = hasPermission(permission)
  } else if (permissions) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions)
  } else {
    hasAccess = true
  }

  if (!hasAccess) {
    return fallback ? <>{fallback}</> : <DefaultFallback />
  }

  return <>{children}</>
}

export default PermissionGuard
