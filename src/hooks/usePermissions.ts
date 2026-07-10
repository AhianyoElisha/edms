'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AppwriteProvider'
import { getUserPermissions } from '@/libs/actions/permissions.actions'

// Fallback permissions based on role (in case API fails)
export const FALLBACK_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'dashboard.view', 'dashboard.analytics',
    'packages.view', 'packages.create', 'packages.edit', 'packages.delete', 'packages.manage', 'packages.tracking', 'packages.history', 'packages.bulkimport', 'packages.export',
    'manifests.view', 'manifests.create', 'manifests.edit', 'manifests.delete', 'manifests.manage', 'manifests.approve', 'manifests.assign', 'manifests.load', 'manifests.complete',
    'pickuplocations.view', 'pickuplocations.create', 'pickuplocations.edit', 'pickuplocations.delete', 'pickuplocations.manage',
    'dropofflocations.view', 'dropofflocations.create', 'dropofflocations.edit', 'dropofflocations.delete', 'dropofflocations.manage',
    'vehicles.view', 'vehicles.create', 'vehicles.edit', 'vehicles.delete', 'vehicles.manage', 'vehicles.assign', 'vehicles.maintenance', 'vehicles.tracking', 'vehicles.fuel',
    'routes.view', 'routes.create', 'routes.edit', 'routes.delete', 'routes.manage', 'routes.optimize', 'routes.analytics',
    'ratecards.view', 'ratecards.create', 'ratecards.edit', 'ratecards.delete', 'ratecards.manage', 'ratecards.approve',
    'trips.view', 'trips.create', 'trips.edit', 'trips.delete', 'trips.manage', 'trips.start', 'trips.complete', 'trips.cancel', 'trips.tracking',
    'deliveries.view', 'deliveries.create', 'deliveries.edit', 'deliveries.delete', 'deliveries.manage', 'deliveries.assign', 'deliveries.complete', 'deliveries.tracking', 'deliveries.proof',
    'expenses.view', 'expenses.create', 'expenses.edit', 'expenses.delete', 'expenses.manage', 'expenses.approve', 'expenses.reports',
    'tracking.view', 'tracking.realtime', 'tracking.history', 'tracking.geofence',
    'notifications.view', 'notifications.create', 'notifications.manage', 'notifications.sms', 'notifications.email', 'notifications.push', 'notifications.bulk',
    'permissions.view', 'permissions.create', 'permissions.edit', 'permissions.delete', 'permissions.manage', 'permissions.assign',
    'roles.view', 'roles.create', 'roles.edit', 'roles.delete', 'roles.manage',
    'users.view', 'users.create', 'users.edit', 'users.delete', 'users.manage', 'users.roles', 'users.permissions',
    'reports.view', 'reports.daily', 'reports.deliveryperformance', 'reports.driverperformance', 'reports.routeanalysis', 'reports.revenue', 'reports.expenses', 'reports.profitability', 'reports.invoicing', 'reports.packagevolume', 'reports.export', 'reports.schedule'
  ],
  'operations manager': [
    'dashboard.view', 'dashboard.analytics',
    'packages.view', 'packages.create', 'packages.manage',
    'manifests.view', 'manifests.create', 'manifests.manage', 'manifests.approve', 'manifests.assign', 'manifests.load', 'manifests.complete',
    'routes.view', 'vehicles.view', 'users.view',
    'trips.view', 'trips.create', 'trips.edit', 'trips.manage', 'trips.start', 'trips.complete',
    'deliveries.view', 'deliveries.manage', 'deliveries.assign', 'deliveries.complete',
    'expenses.view', 'expenses.create', 'expenses.manage', 'expenses.approve',
    'ratecards.view', 'ratecards.manage',
    'dropofflocations.view', 'pickuplocations.view',
    'reports.view', 'reports.daily', 'reports.deliveryperformance', 'reports.driverperformance', 'reports.routeanalysis', 'reports.revenue', 'reports.expenses'
  ],
  'route manager': [
    'dashboard.view',
    'routes.view', 'routes.create', 'routes.edit', 'routes.manage', 'routes.optimize', 'routes.analytics',
    'vehicles.view',
    'users.view',
    'trips.view', 'trips.create', 'trips.edit',
    'manifests.view',
    'expenses.view', 'expenses.create',
    'ratecards.view', 'ratecards.create', 'ratecards.edit',
    'dropofflocations.view', 'pickuplocations.view',
    'reports.view', 'reports.routeanalysis'
  ],
  driver: [
    'dashboard.view',
    'packages.view',
    'manifests.view', 'manifests.load', 'manifests.complete',
    'deliveries.view', 'deliveries.complete', 'deliveries.tracking', 'deliveries.proof',
    'trips.view', 'trips.tracking',
    'expenses.view', 'expenses.create',
    'tracking.view'
  ],
  'pickup agent': [
    'dashboard.view',
    'packages.view', 'packages.create',
    'manifests.view',
    'pickuplocations.view'
  ],
  'delivery agent': [
    'dashboard.view',
    'packages.view',
    'deliveries.view', 'deliveries.complete', 'deliveries.proof',
    'dropofflocations.view'
  ]
}

export function usePermissions() {
  const { user } = useAuth()
  const [permissions, setPermissions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPermissions = async () => {
      if (user?.$id) {
        try {
          setIsLoading(true)
          const perms = await getUserPermissions(user.$id)
          const permNames = perms.map((p: any) => `${p.module}.${p.action}`)
          setPermissions(permNames)
        } catch {
          // Fallback to role-based permissions
          const roleName = user.role?.name?.toLowerCase() || 'user'
          setPermissions(FALLBACK_PERMISSIONS[roleName] || ['dashboard.view'])
        } finally {
          setIsLoading(false)
        }
      } else {
        setPermissions([])
        setIsLoading(false)
      }
    }

    fetchPermissions()
  }, [user])

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false
    if (user.role?.name === 'admin') return true
    return permissions.includes(permission)
  }, [user, permissions])

  const hasAnyPermission = useCallback((perms: string[]): boolean => {
    if (!user) return false
    if (user.role?.name === 'admin') return true
    return perms.some(p => permissions.includes(p))
  }, [user, permissions])

  const hasAllPermissions = useCallback((perms: string[]): boolean => {
    if (!user) return false
    if (user.role?.name === 'admin') return true
    return perms.every(p => permissions.includes(p))
  }, [user, permissions])

  return {
    permissions,
    isLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin: user?.role?.name === 'admin',
    user
  }
}
