'use client'

// React Imports
import type { ReactNode } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'

// Hook Imports
import { usePermissions } from '@/hooks/usePermissions'

/**
 * Frame for a company portal page: the heading with the company's name, and a
 * plain message for staff who land here (staff use the full Trips and Manifests pages).
 */
const PortalShell = ({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) => {
  const { user, isCompany, isLoading } = usePermissions()

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[300px]'>
        <CircularProgress />
      </div>
    )
  }

  if (!isCompany) {
    return (
      <Card>
        <CardContent className='flex flex-col items-center gap-2 py-12'>
          <i className='ri-building-line text-6xl text-textSecondary' />
          <Typography variant='h5'>This page is for company logins</Typography>
          <Typography variant='body2' color='text.secondary' className='text-center'>
            It shows a company its own trips and manifests. Staff can use the Trips and Manifests pages, filtered by
            company.
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h4 className='text-2xl font-semibold'>{title}</h4>
        <p className='text-textSecondary'>
          {user?.companyName ? `${user.companyName} · ` : ''}
          {subtitle}
        </p>
      </div>
      {children}
    </div>
  )
}

export default PortalShell
