// Next Imports
import { useParams, useRouter } from 'next/navigation'

// MUI Imports
import { useTheme } from '@mui/material/styles'

// Third-party Imports
import PerfectScrollbar from 'react-perfect-scrollbar'
import { useEffect, useState } from 'react'

// Type Imports
import type { getDictionary } from '@/utils/getDictionary'
import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'

// Component Imports
import { Menu, SubMenu, MenuItem, MenuSection } from '@menu/vertical-menu'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'
import { getUserPermissions } from '@/libs/actions/permissions.actions'

// Styled Component Imports
import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'

// Style Imports
import menuItemStyles from '@core/styles/vertical/menuItemStyles'
import menuSectionStyles from '@core/styles/vertical/menuSectionStyles'
import { useAuth } from '@/contexts/AppwriteProvider'

type RenderExpandIconProps = {
  open?: boolean
  transitionDuration?: VerticalMenuContextProps['transitionDuration']
}

type Props = {
  dictionary: Awaited<ReturnType<typeof getDictionary>>
  scrollMenu: (container: any, isPerfectScrollbar: boolean) => void
}

const RenderExpandIcon = ({ open, transitionDuration }: RenderExpandIconProps) => (
  <StyledVerticalNavExpandIcon open={open} transitionDuration={transitionDuration}>
    <i className='ri-arrow-right-s-line' />
  </StyledVerticalNavExpandIcon>
)

const VerticalMenu = ({ dictionary, scrollMenu }: Props) => {
  // Hooks
  const theme = useTheme()
  const verticalNavOptions = useVerticalNav()
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()

  const [userPermissions, setUserPermissions] = useState<string[]>([])
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true)

  useEffect(() => {
    // Fetch user permissions dynamically
    const fetchUserPermissions = async () => {
      if (user?.$id) {
        try {
          setIsLoadingPermissions(true)
          
          // Try to fetch permissions from API
          const permissions = await getUserPermissions(user.$id)
          const permissionNames = permissions.map((p: any) => `${p.module}.${p.action}`)
          setUserPermissions(permissionNames)
        } catch (error) {
          console.error('Error fetching user permissions:', error)
          // Fallback: Use role-based permissions
          const fallbackPermissions = getFallbackPermissions(user.role?.name || 'user')
          setUserPermissions(fallbackPermissions)
        } finally {
          setIsLoadingPermissions(false)
        }
      } else {
        // No user, set empty permissions
        setUserPermissions([])
        setIsLoadingPermissions(false)
      }
    }

    fetchUserPermissions()
  }, [user])

  // Navigation helper function
  const handleNavigation = (path: string) => {
    router.push(path)
  }

  // Helper function to check permissions
  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    
    // Admin has all permissions
    if (user.role?.name === 'admin') return true
    
    // Check if user has the specific permission
    return userPermissions.includes(permission)
  }

  // Helper function to check if user has any of the given permissions
  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false
    
    // Admin has all permissions
    if (user.role?.name === 'admin') return true
    
    // Check if user has any of the permissions
    return permissions.some(permission => userPermissions.includes(permission))
  }

  // Fallback permissions based on role (in case API fails)
  const getFallbackPermissions = (roleName: string): string[] => {
    switch (roleName?.toLowerCase()) {
      case 'admin':
        return [
          'dashboard.view', 'packages.view', 'packages.create', 'packages.manage',
          'manifests.view', 'manifests.create', 'manifests.manage',
          'routes.view', 'routes.create', 'routes.manage', 'vehicles.view', 'vehicles.create',
          'trips.view', 'trips.create', 'deliveries.view', 
          'pickuplocations.view', 'dropofflocations.view',
          'expenses.view', 'expenses.create', 'ratecards.view', 'ratecards.manage',
          'users.view', 'users.create', 'users.edit', 'roles.view', 'roles.manage',
          'permissions.view', 'permissions.manage', 'reports.view', 'notifications.view'
        ]
      case 'operations manager':
      case 'operationsmanager':
        return [
          'dashboard.view', 'packages.view', 'packages.create', 'manifests.view', 
          'manifests.create', 'routes.view', 'vehicles.view', 'users.view',
          'trips.view', 'deliveries.view', 'expenses.view'
        ]
      case 'route manager':
      case 'routemanager':
        return [
          'dashboard.view', 'routes.view', 'routes.create', 'vehicles.view',
          'users.view', 'trips.view', 'manifests.view', 'expenses.view'
        ]
      case 'driver':
        return [
          'dashboard.view', 'packages.view', 'manifests.view', 'deliveries.view',
          'trips.view', 'expenses.create'
        ]
      case 'pickup agent':
      case 'pickupagent':
        return [
          'dashboard.view', 'packages.view', 'packages.create', 'manifests.view',
          'pickuplocations.view'
        ]
      case 'delivery agent':
      case 'deliveryagent':
        return [
          'dashboard.view', 'packages.view', 'deliveries.view', 'dropofflocations.view'
        ]

      default:
        return ['dashboard.view']
    }
  }
  
  // Get user role for admin checks
  const isAdmin = user?.role?.name === 'admin'

  // Vars
  const { isBreakpointReached, transitionDuration } = verticalNavOptions
  const { lang: locale } = params

  const ScrollWrapper = isBreakpointReached ? 'div' : PerfectScrollbar

  // Show loading state if permissions are still being fetched
  if (isLoadingPermissions) {
    return (
      <ScrollWrapper
        {...(isBreakpointReached
          ? {
              className: 'bs-full overflow-y-auto overflow-x-hidden',
              onScroll: container => scrollMenu(container, false)
            }
          : {
              options: { wheelPropagation: false, suppressScrollX: true },
              onScrollY: container => scrollMenu(container, true)
            })}
      >
        <Menu
          popoutMenuOffset={{ mainAxis: 17 }}
          menuItemStyles={menuItemStyles(verticalNavOptions, theme)}
          renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
          renderExpandedMenuItemIcon={{ icon: <i className='ri-circle-fill' /> }}
          menuSectionStyles={menuSectionStyles(verticalNavOptions, theme)}
        >
          <MenuItem icon={<i className='ri-loader-line' />}>
            Loading Menu...
          </MenuItem>
        </Menu>
      </ScrollWrapper>
    )
  }

  // Debug: Log current user info and permissions
  console.log('Current User:', user)
  console.log('User Role:', user?.role?.name)
  console.log('User Permissions:', userPermissions)
  console.log('Is Admin:', isAdmin)

  return (
    <ScrollWrapper
      {...(isBreakpointReached
        ? {
            className: 'bs-full overflow-y-auto overflow-x-hidden',
            onScroll: container => scrollMenu(container, false)
          }
        : {
            options: { wheelPropagation: false, suppressScrollX: true },
            onScrollY: container => scrollMenu(container, true)
          })}
    >
      <Menu
        popoutMenuOffset={{ mainAxis: 17 }}
        menuItemStyles={menuItemStyles(verticalNavOptions, theme)}
        renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
        renderExpandedMenuItemIcon={{ icon: <i className='ri-circle-fill' /> }}
        menuSectionStyles={menuSectionStyles(verticalNavOptions, theme)}
      >
        {/* Dashboard - Always accessible if user has permission */}
        {hasPermission('dashboard.view') && (
          <MenuItem onClick={() => handleNavigation('/dashboard')} icon={<i className='ri-dashboard-line' />}>
            {dictionary['navigation'].dashboard}
          </MenuItem>
        )}

        {/* Package Management Section */}
        {(hasAnyPermission(['packages.view', 'packages.create', 'packages.manage']) || hasAnyPermission(['manifests.view', 'manifests.create', 'manifests.manage'])) && (
          <MenuSection label="Package Management">
            {/* Packages SubMenu */}
            {hasAnyPermission(['packages.view', 'packages.create', 'packages.manage']) && (
              <SubMenu label="Packages" icon={<i className='ri-package-line' />}>
                {hasAnyPermission(['packages.create']) && (
                  <MenuItem onClick={() => handleNavigation('/packages/add')}>Create Package</MenuItem>
                )}
                {hasAnyPermission(['packages.view', 'packages.manage']) && (
                  <MenuItem onClick={() => handleNavigation('/packages/list')}>Package List</MenuItem>
                )}
                {hasAnyPermission(['packages.view']) && (
                  <MenuItem onClick={() => handleNavigation('/packages/tracking')}>Package Tracking</MenuItem>
                )}
                {hasAnyPermission(['packages.view']) && (
                  <MenuItem onClick={() => handleNavigation('/packages/history')}>Package History</MenuItem>
                )}
              </SubMenu>
            )}

            {/* Manifests SubMenu */}
            {hasAnyPermission(['manifests.view', 'manifests.create', 'manifests.manage']) && (
              <SubMenu label="Manifests" icon={<i className='ri-file-list-3-line' />}>
                {hasAnyPermission(['manifests.create']) && (
                  <MenuItem onClick={() => handleNavigation('/manifests/create')}>Create Manifest</MenuItem>
                )}
                {hasAnyPermission(['manifests.view', 'manifests.manage']) && (
                  <MenuItem onClick={() => handleNavigation('/manifests/list')}>Manifest List</MenuItem>
                )}
                {hasAnyPermission(['manifests.view']) && (
                  <MenuItem onClick={() => handleNavigation('/manifests/active')}>Active Manifests</MenuItem>
                )}
              </SubMenu>
            )}

            {/* Pickup & Dropoff Locations */}
            {(hasAnyPermission(['pickuplocations.view']) || hasAnyPermission(['dropofflocations.view'])) && (
              <SubMenu label="Locations" icon={<i className='ri-map-pin-line' />}>
                {hasAnyPermission(['pickuplocations.view']) && (
                  <MenuItem onClick={() => handleNavigation('/locations/pickup')}>Pickup Locations</MenuItem>
                )}
                {hasAnyPermission(['dropofflocations.view']) && (
                  <MenuItem onClick={() => handleNavigation('/locations/dropoff')}>Dropoff Locations</MenuItem>
                )}
              </SubMenu>
            )}
          </MenuSection>
        )}

        {/* Logistics & Operations Section */}
        {(hasAnyPermission(['vehicles.view', 'vehicles.create']) || hasAnyPermission(['routes.view', 'routes.create']) || hasAnyPermission(['trips.view', 'trips.create'])) && (
          <MenuSection label="Logistics & Operations">
            {/* Vehicles SubMenu */}
            {hasAnyPermission(['vehicles.view', 'vehicles.create']) && (
              <SubMenu label="Vehicles" icon={<i className='ri-truck-line' />}>
                {hasAnyPermission(['vehicles.view']) && (
                  <MenuItem onClick={() => handleNavigation('/vehicles')}>Vehicle Overview</MenuItem>
                )}
                {hasAnyPermission(['vehicles.view']) && (
                  <MenuItem onClick={() => handleNavigation('/vehicles/vehicles')}>Vehicle List</MenuItem>
                )}
                {hasAnyPermission(['vehicles.view']) && (
                  <MenuItem onClick={() => handleNavigation('/vehicles/fleet')}>Fleet Management</MenuItem>
                )}
              </SubMenu>
            )}



            {/* Routes SubMenu */}
            {hasAnyPermission(['routes.view', 'routes.create']) && (
              <SubMenu label="Routes" icon={<i className='ri-route-line' />}>
                {hasAnyPermission(['routes.create']) && (
                  <MenuItem onClick={() => handleNavigation('/routes/add')}>Add Route</MenuItem>
                )}
                {hasAnyPermission(['routes.view']) && (
                  <MenuItem onClick={() => handleNavigation('/routes/list')}>Route List</MenuItem>
                )}
                {hasAnyPermission(['ratecards.view']) && (
                  <MenuItem onClick={() => handleNavigation('/routes/ratecards')}>Rate Cards</MenuItem>
                )}
              </SubMenu>
            )}

            {/* Trips SubMenu */}
            {hasAnyPermission(['trips.view', 'trips.create']) && (
              <SubMenu label="Trips" icon={<i className='ri-map-pin-range-line' />}>
                {hasAnyPermission(['trips.create']) && (
                  <MenuItem onClick={() => handleNavigation('/trips/plan')}>Plan Trip</MenuItem>
                )}
                {hasAnyPermission(['trips.view']) && (
                  <MenuItem onClick={() => handleNavigation('/trips/list')}>Trip List</MenuItem>
                )}
                {hasAnyPermission(['trips.view']) && (
                  <MenuItem onClick={() => handleNavigation('/trips/active')}>Active Trips</MenuItem>
                )}
              </SubMenu>
            )}

            {/* Deliveries SubMenu */}
            {hasAnyPermission(['deliveries.view']) && (
              <SubMenu label="Deliveries" icon={<i className='ri-truck-line' />}>
                {hasAnyPermission(['deliveries.view']) && (
                  <MenuItem onClick={() => handleNavigation('/deliveries/active')}>Active Deliveries</MenuItem>
                )}
                {hasAnyPermission(['deliveries.view']) && (
                  <MenuItem onClick={() => handleNavigation('/deliveries/completed')}>Completed Deliveries</MenuItem>
                )}
                {hasAnyPermission(['deliveries.view']) && (
                  <MenuItem onClick={() => handleNavigation('/deliveries/failed')}>Failed Deliveries</MenuItem>
                )}
              </SubMenu>
            )}

            {/* Expenses SubMenu */}
            {hasPermission('expenses.view') && (
              <SubMenu label="Trip Expenses" icon={<i className='ri-coins-line' />}>
                {hasPermission('expenses.create') && (
                  <MenuItem onClick={() => handleNavigation('/expenses/add')}>Add Expense</MenuItem>
                )}
                {hasPermission('expenses.view') && (
                  <MenuItem onClick={() => handleNavigation('/expenses/list')}>Expense List</MenuItem>
                )}
                {hasPermission('expenses.view') && (
                  <MenuItem onClick={() => handleNavigation('/expenses/report')}>Expense Reports</MenuItem>
                )}
              </SubMenu>
            )}
          </MenuSection>
        )}



        {/* Package History & Tracking Section */}
        {hasPermission('packages.view') && (
          <MenuSection label="Tracking & History">
            <MenuItem onClick={() => handleNavigation('/tracking/realtime')} icon={<i className='ri-gps-line' />}>
              Real-time Tracking
            </MenuItem>
            <MenuItem onClick={() => handleNavigation('/tracking/history')} icon={<i className='ri-file-chart-line' />}>
              Delivery History
            </MenuItem>
          </MenuSection>
        )}

        {/* User Management Section */}
        {(hasPermission('users.view') || hasPermission('roles.view') || hasPermission('permissions.view') || isAdmin) && (
          <MenuSection label="User Management">
            {/* Users Management - Includes drivers as users with driver role */}
            {(hasPermission('users.view') || isAdmin) && (
              <SubMenu label="Staff Management" icon={<i className='ri-user-settings-line' />}>
                <MenuItem onClick={() => handleNavigation('/user/list')}>All Users</MenuItem>
                <MenuItem onClick={() => handleNavigation('/user/drivers')}>Drivers</MenuItem>
                <MenuItem onClick={() => handleNavigation('/user/add')}>Add User</MenuItem>
              </SubMenu>
            )}
            {/* Roles Management */}
            {(hasPermission('roles.view') || isAdmin) && (
              <MenuItem onClick={() => handleNavigation('/roles')} icon={<i className='ri-group-3-line' />}>
                Roles & Permissions
              </MenuItem>
            )}
            {/* Permissions Management */}
            {(hasPermission('permissions.view') || isAdmin) && (
              <MenuItem onClick={() => handleNavigation('/permissions')} icon={<i className='ri-lock-2-line' />}>
                Access Control
              </MenuItem>
            )}

            {/* Notifications */}
            {hasPermission('notifications.view') && (
              <MenuItem onClick={() => handleNavigation('/notifications')} icon={<i className='ri-notification-3-line' />}>
                Notification Center
              </MenuItem>
            )}
          </MenuSection>
        )}

        {/* Reports & Analytics Section */}
        {hasPermission('reports.view') && (
          <MenuSection label="Reports & Analytics">
            <SubMenu label="Operational Reports" icon={<i className='ri-bar-chart-line' />}>
              <MenuItem onClick={() => handleNavigation('/reports/daily')}>Daily Operations</MenuItem>
              <MenuItem onClick={() => handleNavigation('/reports/delivery-performance')}>Delivery Performance</MenuItem>
              <MenuItem onClick={() => handleNavigation('/reports/driver-performance')}>User Performance (Drivers)</MenuItem>
              <MenuItem onClick={() => handleNavigation('/reports/route-analysis')}>Route Analysis</MenuItem>
            </SubMenu>
            <SubMenu label="Financial Reports" icon={<i className='ri-money-dollar-circle-line' />}>
              <MenuItem onClick={() => handleNavigation('/reports/revenue')}>Revenue Reports</MenuItem>
              <MenuItem onClick={() => handleNavigation('/reports/expenses')}>Expense Reports</MenuItem>
              <MenuItem onClick={() => handleNavigation('/reports/profitability')}>Profitability Analysis</MenuItem>
              <MenuItem onClick={() => handleNavigation('/reports/invoicing')}>Invoicing Reports</MenuItem>
            </SubMenu>
            <SubMenu label="Package Reports" icon={<i className='ri-package-line' />}>
              <MenuItem onClick={() => handleNavigation('/reports/package-volume')}>Package Volume</MenuItem>
              <MenuItem onClick={() => handleNavigation('/reports/package-tracking')}>Package Tracking Analytics</MenuItem>
            </SubMenu>
          </MenuSection>
        )}

        {/* Debug Section - Show current role and permissions count */}
        {/* <MenuSection label="User Info">
          <MenuItem icon={<i className='ri-user-line' />}>
            Role: {user?.role?.name || 'None'}
          </MenuItem>
          <MenuItem icon={<i className='ri-shield-line' />}>
            Permissions: {userPermissions.length}
          </MenuItem>
          <MenuItem icon={<i className='ri-list-check' />}>
            {userPermissions.join(', ')}
          </MenuItem>
        </MenuSection> */}
      </Menu>
    </ScrollWrapper>
  )
}

export default VerticalMenu
