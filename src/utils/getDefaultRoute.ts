import { getUserPermissions } from '@/libs/actions/permissions.actions'
import { FALLBACK_PERMISSIONS } from '@/hooks/usePermissions'

/**
 * Ordered priority list mapping a permission to the landing page a non-admin
 * user should be redirected to after login. The first entry the user has
 * permission for wins. Dashboard is intentionally NOT in this list: only admins
 * land on the dashboard; every other role is sent to the most relevant working
 * page they can access (e.g. drivers land on the Trips page via `trips.view`).
 */
export const LANDING_ROUTE_PRIORITY: { permission: string; route: string }[] = [
  { permission: 'trips.view', route: '/edms/trips' },
  { permission: 'manifests.view', route: '/delivery/manifests' },
  { permission: 'deliveries.view', route: '/deliveries/completed' },
  { permission: 'routes.view', route: '/edms/routes' },
  { permission: 'vehicles.view', route: '/vehicles' },
  { permission: 'expenses.view', route: '/edms/expenses' },
  { permission: 'ratecards.view', route: '/edms/routes/rate-cards' },
  { permission: 'pickuplocations.view', route: '/locations/pickup' },
  { permission: 'dropofflocations.view', route: '/locations/dropoff' },
  { permission: 'users.view', route: '/user/list' },
  { permission: 'roles.view', route: '/roles' },
  { permission: 'permissions.view', route: '/permissions' },
  { permission: 'reports.view', route: '/edms/reports/daily-operations' }
]

/**
 * Compute the landing route for a user given their role and resolved permission
 * names (`module.action`). Admins always go to the dashboard. Other roles are
 * routed to the first page in LANDING_ROUTE_PRIORITY they have access to,
 * falling back to the dashboard if they have `dashboard.view` and nothing else.
 */
export function getDefaultRoute(user: any, permissions: string[]): string {
  const roleName = user?.role?.name?.toLowerCase()

  if (roleName === 'admin') return '/dashboard'

  for (const { permission, route } of LANDING_ROUTE_PRIORITY) {
    if (permissions.includes(permission)) return route
  }

  // No specific working page available – fall back to the dashboard.
  return '/dashboard'
}

/**
 * Resolve a user's permission names (`module.action`), mirroring the logic in
 * usePermissions: try the API first and fall back to role-based defaults when
 * the API fails or returns nothing.
 */
export async function resolveUserPermissions(user: any): Promise<string[]> {
  const roleName = user?.role?.name?.toLowerCase() || 'user'
  const fallback = FALLBACK_PERMISSIONS[roleName] || ['dashboard.view']

  if (!user?.$id) return fallback

  try {
    const perms = await getUserPermissions(user.$id)
    const permNames = perms.map((p: any) => `${p.module}.${p.action}`)

    return permNames.length > 0 ? permNames : fallback
  } catch {
    return fallback
  }
}

/**
 * Convenience helper: resolve permissions for a user and return their landing route.
 */
export async function getLandingRouteForUser(user: any): Promise<string> {
  if (user?.role?.name?.toLowerCase() === 'admin') return '/dashboard'

  const permissions = await resolveUserPermissions(user)

  return getDefaultRoute(user, permissions)
}
