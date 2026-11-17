'use client'

// Hook Imports
import { usePermissions } from '@/hooks/usePermissions'

/**
 * Who may do what on the driver loss sheet.
 *
 * Office staff who can see trips can read the sheet; those who can edit trips can
 * price items, add losses, change shortages and record payments. A driver sees
 * only their own losses and payments, read-only.
 */
export const useLossAccess = () => {
  const { user, isDriver, hasAnyPermission, isLoading } = usePermissions()

  const canManage = !isDriver && hasAnyPermission(['trips.edit', 'trips.manage'])
  const canViewSheet = !isDriver && hasAnyPermission(['trips.view', 'trips.edit', 'trips.manage'])

  return {
    isLoading,
    isDriver,
    canManage,
    canViewSheet,
    userId: user?.$id as string | undefined,
    actorName: (user?.name || user?.email || undefined) as string | undefined
  }
}
