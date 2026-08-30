// Next Imports
import { useParams, useRouter } from 'next/navigation'

// MUI Imports
import { useTheme } from '@mui/material/styles'

// Third-party Imports
import PerfectScrollbar from 'react-perfect-scrollbar'

// Type Imports
import type { getDictionary } from '@/utils/getDictionary'
import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'

// Component Imports
import { Menu, SubMenu, MenuItem, MenuSection } from '@menu/vertical-menu'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'
import { usePermissions } from '@/hooks/usePermissions'

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
  const { hasPermission: hookHasPermission, hasAnyPermission: hookHasAnyPermission, isAdmin, isDriver, isLoading: isLoadingPermissions } = usePermissions()

  // Navigation helper function
  const handleNavigation = (path: string) => {
    router.push(path)
  }

  // Use permissions from the centralized hook
  const hasPermission = hookHasPermission
  const hasAnyPermission = hookHasAnyPermission

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
            {/* Packages SubMenu - TODO: Create package pages */}
            {/* {hasAnyPermission(['packages.view', 'packages.create', 'packages.manage']) && (
              <SubMenu label="Packages" icon={<i className='ri-package-line' />}>
                {hasAnyPermission(['packages.view', 'packages.manage']) && (
                  <MenuItem onClick={() => handleNavigation('/edms/packages')}>All Packages</MenuItem>
                )}
                {hasAnyPermission(['packages.view']) && (
                  <MenuItem onClick={() => handleNavigation('/edms/packages/tracking')}>Package Tracking</MenuItem>
                )}
              </SubMenu>
            )} */}

            {/* Manifests SubMenu */}
            {hasAnyPermission(['manifests.view', 'manifests.create', 'manifests.manage']) && (
              <SubMenu label="Manifests" icon={<i className='ri-file-list-3-line' />}>
                {hasAnyPermission(['manifests.view', 'manifests.manage']) && (
                  <MenuItem onClick={() => handleNavigation('/delivery/manifests')}>All Manifests</MenuItem>
                )}
                {/* Deliveries drivers logged in the field with a photo, still missing their package
                    figures. Explicitly not for drivers: the driver role carries manifests.edit in
                    the live rolePermissions data, and the whole point of the queue is that data
                    entry is the office's job, not the driver's. */}
                {!isDriver && hasAnyPermission(['manifests.edit', 'manifests.manage']) && (
                  <MenuItem onClick={() => handleNavigation('/edms/manifests/review')}>Needs Review</MenuItem>
                )}
                {/* {hasAnyPermission(['manifests.view']) && (
                  <MenuItem onClick={() => handleNavigation('/delivery/manifests/active')}>Active Manifests</MenuItem>
                )} */}
              </SubMenu>
            )}

            {/* Pickup & Dropoff Locations */}
            {(hasAnyPermission(['pickuplocations.view']) || hasAnyPermission(['dropofflocations.view'])) && (
              <SubMenu label="Locations" icon={<i className='ri-map-pin-line' />}>
                {hasAnyPermission(['pickuplocations.view']) && (
                  <MenuItem onClick={() => handleNavigation('/locations/pickup')}>Warehouse</MenuItem>
                )}
                {hasAnyPermission(['dropofflocations.view']) && (
                  <MenuItem onClick={() => handleNavigation('/locations/dropoff')}>Pickup Locations</MenuItem>
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
                  <MenuItem onClick={() => handleNavigation('/vehicles')}>All Vehicles</MenuItem>
                )}
                {hasAnyPermission(['vehicles.view']) && (
                  <MenuItem onClick={() => handleNavigation('/vehicles/fleet')}>Fleet View</MenuItem>
                )}
              </SubMenu>
            )}



            {/* Routes SubMenu */}
            {hasAnyPermission(['routes.view', 'routes.create']) && (
              <SubMenu label="Routes" icon={<i className='ri-route-line' />}>
                {hasAnyPermission(['routes.view']) && (
                  <MenuItem onClick={() => handleNavigation('/edms/routes')}>All Routes</MenuItem>
                )}
                {hasAnyPermission(['routes.create']) && (
                  <MenuItem onClick={() => handleNavigation('/edms/routes/create')}>Create Route</MenuItem>
                )}
                {hasAnyPermission(['ratecards.view']) && (
                <SubMenu label="Rate Cards">
                  {hasAnyPermission(['ratecards.view']) && (
                    <MenuItem onClick={() => handleNavigation('/edms/routes/rate-cards')}>All Rate Cards</MenuItem>
                  )}
                  {hasAnyPermission(['ratecards.manage']) && (
                    <MenuItem onClick={() => handleNavigation('/edms/routes/rate-cards/create')}>Add Rate Card</MenuItem>
                  )}
                </SubMenu>

                 )}
              </SubMenu>
            )}

            {/* Trips SubMenu */}
            {hasAnyPermission(['trips.view', 'trips.create']) && (
              <SubMenu label="Trips" icon={<i className='ri-map-pin-range-line' />}>
                {hasAnyPermission(['trips.view']) && (
                  <MenuItem onClick={() => handleNavigation('/edms/trips')}>All Trips</MenuItem>
                )}
                {hasAnyPermission(['trips.create']) && (
                  <MenuItem onClick={() => handleNavigation('/edms/trips/create')}>Create Trip</MenuItem>
                )}
              </SubMenu>
            )}

            {/* Return Waybills SubMenu */}
            {hasAnyPermission(['deliveries.view', 'trips.view']) && (
              <SubMenu label="Return Waybills" icon={<i className='ri-arrow-go-back-line' />}>
                {hasAnyPermission(['deliveries.view', 'trips.view']) && (
                  <MenuItem onClick={() => handleNavigation('/edms/returns/waybills')}>All Returns</MenuItem>
                )}
                {/* Returns drivers logged from the field with only a photo. Entering the
                    figures is the office's job, not the driver's. */}
                {!isDriver && hasAnyPermission(['deliveries.edit', 'deliveries.manage']) && (
                  <MenuItem onClick={() => handleNavigation('/edms/returns/waybills/review')}>Needs Review</MenuItem>
                )}
                {/* {hasAnyPermission(['deliveries.view', 'trips.create']) && (
                  <MenuItem onClick={() => handleNavigation('/edms/returns/waybills/create')}>Create Return</MenuItem>
                )} */}
              </SubMenu>
            )}

            {/* Deliveries SubMenu */}
            {hasAnyPermission(['deliveries.view']) && (
              <SubMenu label="Deliveries" icon={<i className='ri-truck-line' />}>
                {/* {hasAnyPermission(['deliveries.view']) && (
                  <MenuItem onClick={() => handleNavigation('/deliveries/active')}>Active Deliveries</MenuItem>
                )} */}
                {hasAnyPermission(['deliveries.view']) && (
                  <MenuItem onClick={() => handleNavigation('/deliveries/completed')}>Completed Deliveries</MenuItem>
                )}
                {/* {hasAnyPermission(['deliveries.view']) && (
                  <MenuItem onClick={() => handleNavigation('/deliveries/failed')}>Failed Deliveries</MenuItem>
                )} */}
              </SubMenu>
            )}

            {/* Expenses SubMenu */}
            {hasPermission('expenses.view') && (
              <SubMenu label="Trip Expenses" icon={<i className='ri-coins-line' />}>
                {hasPermission('expenses.create') && (
                  <MenuItem onClick={() => handleNavigation('/edms/expenses/create')}>Add Expense</MenuItem>
                )}
                {hasPermission('expenses.view') && (
                  <MenuItem onClick={() => handleNavigation('/edms/expenses')}>Expense List</MenuItem>
                )}
                {/* {hasPermission('expenses.view') && (
                  <MenuItem onClick={() => handleNavigation('/edms/expenses/report')}>Expense Reports</MenuItem>
                )} */}
              </SubMenu>
            )}
          </MenuSection>
        )}


        {/* User Management Section */}
        {(hasPermission('users.view') || hasPermission('roles.view') || hasPermission('permissions.view') || isAdmin) && (
          <MenuSection label="User Management">
            {/* Users Management - Includes drivers as users with driver role */}
            {(hasPermission('users.view') || isAdmin) && (
              <SubMenu label="Staff Management" icon={<i className='ri-user-settings-line' />}>
                <MenuItem onClick={() => handleNavigation('/user/list')}>All Users</MenuItem>
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
          </MenuSection>
        )}

        {/* Reports & Analytics Section */}
        {hasPermission('reports.view') && (
          <MenuSection label="Reports & Analytics">
            <SubMenu label="Operational Reports" icon={<i className='ri-bar-chart-line' />}>
              <MenuItem onClick={() => handleNavigation('/edms/reports/daily-operations')}>Daily Operations</MenuItem>
              <MenuItem onClick={() => handleNavigation('/edms/reports/delivery-performance')}>Delivery Performance</MenuItem>
              <MenuItem onClick={() => handleNavigation('/edms/reports/driver-performance')}>Driver Performance</MenuItem>
              <MenuItem onClick={() => handleNavigation('/edms/reports/route-analysis')}>Route Analysis</MenuItem>
            </SubMenu>
            <SubMenu label="Financial Reports" icon={<i className='ri-money-dollar-circle-line' />}>
              <MenuItem onClick={() => handleNavigation('/edms/reports/revenue')}>Revenue Reports</MenuItem>
              <MenuItem onClick={() => handleNavigation('/edms/reports/expense-report')}>Expense Reports</MenuItem>
              <MenuItem onClick={() => handleNavigation('/edms/reports/profitability')}>Profitability Analysis</MenuItem>
              <MenuItem onClick={() => handleNavigation('/edms/reports/invoicing')}>Invoicing Reports</MenuItem>
            </SubMenu>
          </MenuSection>
        )}

      </Menu>
    </ScrollWrapper>
  )
}

export default VerticalMenu
