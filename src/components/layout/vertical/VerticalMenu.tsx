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
          'dashboard.view', 'stores.view', 'stores.create', 'stores.manage',
          'production.view', 'production.create', 'production.manage',
          'warehouse.view', 'warehouse.create', 'sales.view', 'sales.dailysales',
          'sales.officesales', 'sales.marketing', 'logistics.view', 'distribution.view',
          'distribution.create', 'workers.view', 'returns.view', 'expenses.view',
          'machinery.view', 'machinery.create', 'requisition.view', 'users.view',
          'users.create', 'users.edit', 'roles.view', 'roles.manage',
          'permissions.view', 'permissions.manage', 'customers.view',
          'customers.create', 'suppliers.view', 'suppliers.create', 'reports.view'
        ]
      case 'stores manager':
      case 'storesmanager':
      case 'storesrep':
        return [
          'dashboard.view', 'stores.view', 'stores.create', 'stores.manage', 
          'requisition.view', 'customers.view', 'suppliers.view'
        ]
      case 'production manager':
      case 'productionmanager':
      case 'productionrep':
        return [
          'dashboard.view', 'stores.view', 'production.view', 'production.create',
          'production.manage', 'warehouse.view', 'requisition.view'
        ]
      case 'warehouse manager':
      case 'warehousemanager':
      case 'warehouserep':
        return [
          'dashboard.view', 'production.view', 'warehouse.view', 'warehouse.create',
          'sales.view', 'requisition.view'
        ]
      case 'sales representative':
      case 'salesrepresentative':
      case 'sachetrep':
        return [
          'dashboard.view', 'production.view', 'warehouse.view', 'sales.view',
          'sales.dailysales', 'workers.view', 'requisition.view', 'customers.view'
        ]
      case 'marketing representative':
      case 'marketingrepresentative':
      case 'marketingrep':
        return [
          'dashboard.view', 'production.view', 'warehouse.view', 'sales.view',
          'sales.marketing', 'workers.view', 'requisition.view', 'customers.view'
        ]
      case 'logistics manager':
      case 'logisticsmanager':
        return [
          'dashboard.view', 'sales.view', 'logistics.view', 'distribution.view',
          'distribution.create', 'expenses.view', 'requisition.view'
        ]
      default:
        return ['dashboard.view']
    }
  }
  
  // Get user role for admin checks
  const isAdmin = user?.role?.name?.toLowerCase() === 'admin'

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

        {/* Apps Pages Section */}
        {(hasAnyPermission(['stores.view', 'stores.create', 'stores.edit', 'stores.manage']) || hasAnyPermission(['production.view', 'production.create', 'production.manage'])) && (
          <MenuSection label={dictionary['navigation'].appsPages}>
            {/* Stores SubMenu */}
            {hasAnyPermission(['stores.view', 'stores.create', 'stores.edit', 'stores.manage']) && (
              <SubMenu label={dictionary['navigation'].stores} icon={<i className='ri-shopping-bag-3-line' />}>
                <SubMenu label={dictionary['navigation'].inventory}>
                  {hasAnyPermission(['stores.create', 'stores.edit']) && (
                    <MenuItem onClick={() => handleNavigation('/stores/add')}>{dictionary['navigation'].inventoryadd}</MenuItem>
                  )}
                  {hasAnyPermission(['stores.view', 'stores.create', 'stores.edit', 'stores.manage']) && (
                    <MenuItem onClick={() => handleNavigation('/stores/category')}>{dictionary['navigation'].inventoryCategory}</MenuItem>
                  )}
                  {hasAnyPermission(['stores.view', 'stores.create', 'stores.edit', 'stores.manage']) && (
                    <MenuItem onClick={() => handleNavigation('/stores/list')}>{dictionary['navigation'].inventorylist}</MenuItem>
                  )}
                </SubMenu>
                <SubMenu label={dictionary['navigation'].requisition}>
                  {hasAnyPermission(['stores.view', 'stores.create', 'stores.edit', 'stores.manage', 'requisition.view']) && (
                    <MenuItem onClick={() => handleNavigation('/stores/requisitions')}>{dictionary['navigation'].productionRequisition}</MenuItem>
                  )}
                  {hasAnyPermission(['stores.manage', 'stores.edit']) && (
                    <MenuItem onClick={() => handleNavigation('/stores/issue')}>{dictionary['navigation'].issue}</MenuItem>
                  )}
                </SubMenu>
              </SubMenu>
            )}

            {/* Production SubMenu */}
            {hasAnyPermission(['production.view', 'production.create', 'production.manage']) && (
              <SubMenu label={dictionary['navigation'].production} icon={<i className='ri-building-2-line' />}>
                <SubMenu label={dictionary['navigation'].products}>
                  {hasAnyPermission(['production.create', 'production.manage']) && (
                    <MenuItem onClick={() => handleNavigation('/production/add')}>{dictionary['navigation'].productadd}</MenuItem>
                  )}
                  {hasAnyPermission(['production.view', 'production.create', 'production.manage']) && (
                    <MenuItem onClick={() => handleNavigation('/production/category')}>{dictionary['navigation'].productCategory}</MenuItem>
                  )}
                  {hasAnyPermission(['production.view', 'production.create', 'production.manage']) && (
                    <MenuItem onClick={() => handleNavigation('/production/list')}>{dictionary['navigation'].productionlist}</MenuItem>
                  )}
                </SubMenu>
                <SubMenu label={dictionary['navigation'].requisition}>
                  {hasAnyPermission(['production.view', 'production.create', 'production.manage', 'requisition.view']) && (
                    <MenuItem onClick={() => handleNavigation('/production/store-requisitions')}>{dictionary['navigation'].storesRequisition}</MenuItem>
                  )}
                  {hasAnyPermission(['production.view', 'production.create', 'production.manage', 'requisition.view']) && (
                    <MenuItem onClick={() => handleNavigation('/production/warehouse-requisitions')}>{dictionary['navigation'].warehouseRequisition}</MenuItem>
                  )}
                  {hasAnyPermission(['production.manage']) && (
                    <MenuItem onClick={() => handleNavigation('/production/issue-warehouse-requisitions')}>{dictionary['navigation'].issue}</MenuItem>
                  )}
                </SubMenu>
              </SubMenu>
            )}
          </MenuSection>
        )}

        {/* Sales Pages Section */}
        {(hasAnyPermission(['warehouse.view', 'warehouse.create']) || hasAnyPermission(['sales.view', 'sales.dailysales', 'sales.officesales', 'sales.marketing']) || hasAnyPermission(['logistics.view']) || hasAnyPermission(['distribution.view', 'distribution.create'])) && (
          <MenuSection label={dictionary['navigation'].salesPages}>
            {/* Warehouse SubMenu */}
            {hasAnyPermission(['warehouse.view', 'warehouse.create']) && (
              <SubMenu label={dictionary['navigation'].warehouse} icon={<i className='ri-building-3-line' />}>
                <SubMenu label={dictionary['navigation'].storage}>
                  {hasAnyPermission(['warehouse.view', 'warehouse.create']) && (
                    <MenuItem onClick={() => handleNavigation('/warehouse/list')}>{dictionary['navigation'].warehouselist}</MenuItem>
                  )}
                  {hasAnyPermission(['warehouse.view', 'warehouse.create']) && (
                    <MenuItem onClick={() => handleNavigation('/warehouse/category')}>{dictionary['navigation'].warehouseCategory}</MenuItem>
                  )}
                </SubMenu>
                <SubMenu label={dictionary['navigation'].requisition}>
                  {hasAnyPermission(['warehouse.view', 'warehouse.create', 'requisition.view']) && (
                    <MenuItem onClick={() => handleNavigation('/warehouse/production-requisitions')}>{dictionary['navigation'].productionRequisition}</MenuItem>
                  )}
                </SubMenu>
                <SubMenu label={dictionary['navigation'].damaged}>
                  {hasPermission('warehouse.create') && (
                    <MenuItem onClick={() => handleNavigation('/warehouse/spoilage')}>{dictionary['navigation'].spoilage}</MenuItem>
                  )}
                  {hasAnyPermission(['warehouse.view', 'warehouse.create']) && (
                    <MenuItem onClick={() => handleNavigation('/warehouse/spoilagereport')}>{dictionary['navigation'].spoilagereport}</MenuItem>
                  )}
                </SubMenu>
              </SubMenu>
            )}

            {/* Sales SubMenu */}
            {hasAnyPermission(['sales.view', 'sales.dailysales', 'sales.officesales', 'sales.marketing']) && (
              <SubMenu label={dictionary['navigation'].sales} icon={<i className='ri-money-dollar-circle-line' />}>
                {hasAnyPermission(['sales.view', 'sales.dailysales', 'sales.officesales', 'sales.marketing']) && (
                  <MenuItem onClick={() => handleNavigation('/sales/category')}>{dictionary['navigation'].salesCategory}</MenuItem>
                )}
                {hasAnyPermission(['sales.view', 'sales.dailysales', 'sales.officesales', 'sales.marketing']) && (
                  <MenuItem onClick={() => handleNavigation('/salesreport')} icon={<i className='ri-exchange-line' />}>
                    {dictionary['navigation'].salesreport}
                  </MenuItem>
                )}
                
                {/* Sachet SubMenu */}
                {(hasPermission('sales.dailysales') || hasPermission('sales.officesales')) && (
                  <SubMenu label={dictionary['navigation'].sachet} icon={<i className='ri-money-dollar-circle-line' />}>
                    {hasPermission('sales.dailysales') && (
                      <MenuItem onClick={() => handleNavigation('/dailysales')} icon={<i className='ri-exchange-line' />}>
                        {dictionary['navigation'].dailysalesadd}
                      </MenuItem>
                    )}
                    {hasPermission('sales.officesales') && (
                      <MenuItem onClick={() => handleNavigation('/officesales')} icon={<i className='ri-exchange-line' />}>
                        {dictionary['navigation'].officesalesadd}
                      </MenuItem>
                    )}
                    {hasPermission('workers.view') && (
                      <SubMenu label={dictionary['navigation'].workersproduction} icon={<i className='ri-user-settings-line' />}>
                        <MenuItem onClick={() => handleNavigation('/workersproduction')}>
                          {dictionary['navigation'].workersproductionadd}
                        </MenuItem>
                        <MenuItem onClick={() => handleNavigation('/workersproduction/report')}>
                          {dictionary['navigation'].workersproductionreport}
                        </MenuItem>
                        <SubMenu label={dictionary['navigation'].workers} icon={<i className='ri-user-settings-line' />}>
                          <MenuItem onClick={() => handleNavigation('/workers/list')}>
                            {dictionary['navigation'].workerslist}
                          </MenuItem>
                        </SubMenu>
                      </SubMenu>
                    )}
                  </SubMenu>
                )}
                
                {/* Marketing Sales SubMenu */}
                {hasPermission('sales.marketing') && (
                  <SubMenu label={dictionary['navigation'].marketingsales} icon={<i className='ri-exchange-line' />}>
                    <MenuItem onClick={() => handleNavigation('/marketingsales')} icon={<i className='ri-exchange-line' />}>
                      {dictionary['navigation'].marketingadd}
                    </MenuItem>
                  </SubMenu>
                )}

                {/* Logistics SubMenu */}
                {hasPermission('logistics.view') && (
                  <SubMenu label={dictionary['navigation'].logistics} icon={<i className='ri-truck-line' />}>
                    <MenuItem onClick={() => handleNavigation('/vehicles/vehicles')}>{dictionary['navigation'].vehicles}</MenuItem>
                    <MenuItem onClick={() => handleNavigation('/vehicles/fleet')}>{dictionary['navigation'].fleet}</MenuItem>
                  </SubMenu>
                )}
                
                {/* Distribution SubMenu */}
                {(hasPermission('distribution.view') || hasPermission('distribution.create')) && (
                  <SubMenu label={dictionary['navigation'].distribution} icon={<i className='ri-instance-line' />}>
                    {hasPermission('distribution.create') && (
                      <MenuItem onClick={() => handleNavigation('/distribution/add')}>{dictionary['navigation'].distributionadd}</MenuItem>
                    )}
                    {hasAnyPermission(['distribution.view', 'distribution.create']) && (
                      <MenuItem onClick={() => handleNavigation('/distribution/list')}>{dictionary['navigation'].distributionlist}</MenuItem>
                    )}
                  </SubMenu>
                )}

                {/* Returns SubMenu */}
                {hasPermission('returns.view') && (
                  <SubMenu label={dictionary['navigation'].goodsreturn} icon={<i className='ri-refund-2-line' />}>
                    <MenuItem onClick={() => handleNavigation('/returns')} icon={<i className='ri-refund-line' />}>
                      {dictionary['navigation'].returns}
                    </MenuItem>
                    <MenuItem onClick={() => handleNavigation('/returns/returnsreport')}>{dictionary['navigation'].returnsreport}</MenuItem>  
                  </SubMenu>
                )}
        
                {/* Expenses SubMenu */}
                {hasPermission('expenses.view') && (
                  <SubMenu label={dictionary['navigation'].allexpenses} icon={<i className='ri-refund-line' />}>
                    <MenuItem onClick={() => handleNavigation('/expenses')} icon={<i className='ri-coins-line' />}>
                      {dictionary['navigation'].expenses}
                    </MenuItem>
                    <MenuItem onClick={() => handleNavigation('/expenses/expensesreport')}>
                      {dictionary['navigation'].expensesreport}
                    </MenuItem>
                  </SubMenu>
                )}
              </SubMenu>
            )}
          </MenuSection>
        )}

        {/* Machinery Pages Section */}
        {(hasPermission('machinery.view') || hasPermission('machinery.create')) && (
          <MenuSection label={dictionary['navigation'].machineryPages}>        
            <SubMenu label={dictionary['navigation'].machinery} icon={<i className='ri-tools-line' />}>
              {hasPermission('machinery.create') && (
                <MenuItem onClick={() => handleNavigation('/machinery/add')}>{dictionary['navigation'].machineryAdd}</MenuItem>
              )}
              {hasAnyPermission(['machinery.view', 'machinery.create']) && (
                <MenuItem onClick={() => handleNavigation('/machinery/category')}>{dictionary['navigation'].machineryCategory}</MenuItem>
              )}
              {hasAnyPermission(['machinery.view', 'machinery.create']) && (
                <MenuItem onClick={() => handleNavigation('/machinery/list')}>{dictionary['navigation'].machineryList}</MenuItem>
              )}
            </SubMenu>
          </MenuSection>
        )}

        {/* Requisition History Section */}
        {hasPermission('requisition.view') && (
          <MenuSection label={dictionary['navigation'].requisitionHistory}>
            <MenuItem onClick={() => handleNavigation('/requisition-history')} icon={<i className='ri-file-chart-line' />}>
              {dictionary['navigation'].requisitionHistory}
            </MenuItem>
          </MenuSection>
        )}

        {/* HRM Pages Section */}
        {(hasPermission('users.view') || hasPermission('roles.view') || hasPermission('permissions.view') || hasPermission('customers.view') || hasPermission('suppliers.view') || isAdmin) && (
          <MenuSection label={dictionary['navigation'].hrmPages}>
            {/* Users Management */}
            {(hasPermission('users.view') || isAdmin) && (
              <MenuItem onClick={() => handleNavigation('/user/list')} icon={<i className='ri-user-settings-line' />}>
                Users Management
              </MenuItem>
            )}
            {/* Roles Management */}
            {(hasPermission('roles.view') || isAdmin) && (
              <MenuItem onClick={() => handleNavigation('/roles')} icon={<i className='ri-group-3-line' />}>
                {dictionary['navigation'].roles}
              </MenuItem>
            )}
            {/* Permissions Management */}
            {(hasPermission('permissions.view') || isAdmin) && (
              <MenuItem onClick={() => handleNavigation('/permissions')} icon={<i className='ri-lock-2-line' />}>
                Permissions
              </MenuItem>
            )}
            {/* Customers */}
            {hasPermission('customers.view') && (
              <MenuItem onClick={() => handleNavigation('/customers/list')} icon={<i className='ri-team-line' />}>
                {dictionary['navigation'].customers}
              </MenuItem>
            )}
            {/* Suppliers */}
            {hasPermission('suppliers.view') && (
              <MenuItem onClick={() => handleNavigation('/suppliers/list')} icon={<i className='ri-group-2-line' />}>
                {dictionary['navigation'].suppliers}
              </MenuItem>
            )}
          </MenuSection>
        )}

        {/* Daily Report Section */}
        {hasPermission('reports.view') && (
          <MenuSection label={dictionary['navigation'].dailyReport}>
            <MenuItem onClick={() => handleNavigation('/reports')} icon={<i className='ri-bar-chart-line' />}>
              Daily Reports
            </MenuItem>
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
