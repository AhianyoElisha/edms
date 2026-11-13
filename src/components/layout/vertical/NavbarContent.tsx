// Third-party Imports
import classnames from 'classnames'

// Type Imports
import type { ShortcutsType } from '@components/layout/shared/ShortcutsDropdown'

// Component Imports
import NavToggle from './NavToggle'
import NavSearch from '@components/layout/shared/search'
import LanguageDropdown from '@components/layout/shared/LanguageDropdown'
import ModeDropdown from '@components/layout/shared/ModeDropdown'
import ShortcutsDropdown from '@components/layout/shared/ShortcutsDropdown'
import LiveNotifications from '@components/layout/shared/LiveNotifications'
import UserDropdown from '@components/layout/shared/UserDropdown'

// Util Imports
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'

// Vars
const shortcuts: ShortcutsType[] = [
  {
    url: '/stores/list',
    icon: 'ri-shopping-bag-3-line',
    title: 'Stores',
    subtitle: 'Inventory Stocks'
  },
  {
    url: '/production/list',
    icon: 'ri-building-2-line',
    title: 'Production',
    subtitle: 'Manufactured Products'
  },
  {
    url: '/dailysales',
    icon: 'ri-contrast-drop-2-line',
    title: 'Sales',
    subtitle: 'Sachet Sales'
  },
  {
    url: '/marketingsales',
    icon: 'ri-ink-bottle-line',
    title: 'Marketing Sales',
    subtitle: 'Vehicle Bottling Sales'
  },
]

const NavbarContent = () => {
  return (
    <div className={classnames(verticalLayoutClasses.navbarContent, 'flex items-center justify-between gap-4 is-full')}>
      <div className='flex items-center gap-[7px]'>
        <NavToggle />
        <NavSearch />
      </div>
      <div className='flex items-center'>
        <ModeDropdown />
        <ShortcutsDropdown shortcuts={shortcuts} />
        <LiveNotifications />
        <UserDropdown />
      </div>
    </div>
  )
}

export default NavbarContent
