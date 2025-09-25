// Third-party Imports
import classnames from 'classnames'

// Type Imports
import type { ShortcutsType } from '@components/layout/shared/ShortcutsDropdown'
import type { NotificationsType } from '@components/layout/shared/NotificationsDropdown'

// Component Imports
import NavToggle from './NavToggle'
import NavSearch from '@components/layout/shared/search'
import LanguageDropdown from '@components/layout/shared/LanguageDropdown'
import ModeDropdown from '@components/layout/shared/ModeDropdown'
import ShortcutsDropdown from '@components/layout/shared/ShortcutsDropdown'
import NotificationsDropdown from '@components/layout/shared/NotificationsDropdown'
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

const notifications: NotificationsType[] = [
  {
    avatarImage: '/images/avatars/2.png',
    title: 'Akwaaba 🎉',
    subtitle: `You're welcome to the Ezar Delivery Services software`,
    time: '1h ago',
    read: false
  },
  // {
  //   title: 'Cecilia Becker',
  //   subtitle: 'Accepted your connection',
  //   time: '12h ago',
  //   read: false
  // },
  // {
  //   avatarImage: '/images/avatars/3.png',
  //   title: 'Bernard Woods',
  //   subtitle: 'You have new message from Bernard Woods',
  //   time: 'May 18, 8:26 AM',
  //   read: true
  // },
  // {
  //   avatarIcon: 'ri-bar-chart-line',
  //   avatarColor: 'info',
  //   title: 'Monthly report generated',
  //   subtitle: 'July month financial report is generated',
  //   time: 'Apr 24, 10:30 AM',
  //   read: true
  // },
  // {
  //   avatarText: 'MG',
  //   avatarColor: 'success',
  //   title: 'Application has been approved 🚀',
  //   subtitle: 'Your Meta Gadgets project application has been approved.',
  //   time: 'Feb 17, 12:17 PM',
  //   read: true
  // },
  // {
  //   avatarIcon: 'ri-mail-line',
  //   avatarColor: 'error',
  //   title: 'New message from Harry',
  //   subtitle: 'You have new message from Harry',
  //   time: 'Jan 6, 1:48 PM',
  //   read: true
  // }
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
        <NotificationsDropdown notifications={notifications} />
        <UserDropdown />
      </div>
    </div>
  )
}

export default NavbarContent
