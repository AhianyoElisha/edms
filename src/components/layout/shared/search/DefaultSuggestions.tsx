// Next Imports
import Link from 'next/link'
import { useParams } from 'next/navigation'

// Third-party Imports
import classnames from 'classnames'

// Type Imports
import type { Locale } from '@configs/i18n'

type DefaultSuggestionsType = {
  sectionLabel: string
  items: {
    label: string
    href: string
    icon?: string
  }[]
}

const defaultSuggestions: DefaultSuggestionsType[] = [
  {
    sectionLabel: 'Popular Searches',
    items: [

      {
        label: 'Stores',
        href: '/stores/list',
        icon: 'ri-shopping-bag-3-line'
      },
      {
        label: 'Stores Requisition',
        href: '/stores/requisitions',
        icon: 'ri-file-user-line'
      }
    ]
  },
  {
    sectionLabel: 'Production',
    items: [
      {
        label: 'Stores Request',
        href: '/production/store-requisition',
        icon: 'ri-user-3-line'
      },
      {
        label: 'Warehouse Requisition',
        href: '/production/warehouse-requisition',
        icon: 'ri-settings-4-line'
      },
      
    ]
  },
  {
    sectionLabel: 'Warehouse',
    items: [
      {
        label: 'Form Layouts',
        href: '/forms/form-layouts',
        icon: 'ri-file-text-line'
      },
      {
        label: 'Form Validation',
        href: '/forms/form-validation',
        icon: 'ri-checkbox-multiple-line'
      },

    ]
  },
  {
    sectionLabel: 'Human Resource',
    items: [

      {
        label: 'User List',
        href: '/apps/user/list',
        icon: 'ri-file-user-line'
      },
      {
        label: 'Roles & Permissions',
        href: '/apps/roles',
        icon: 'ri-lock-unlock-line'
      }
    ]
  },
    {
    sectionLabel: 'Production',
    items: [
      {
        label: 'User Profile',
        href: '/pages/user-profile',
        icon: 'ri-user-3-line'
      },
      {
        label: 'Account ',
        href: '/pages/account-settings',
        icon: 'ri-settings-4-line'
      },

    ]
  },
  {
    sectionLabel: 'Account Information',
    items: [
      {
        label: 'User Profile',
        href: '/pages/user-profile',
        icon: 'ri-user-3-line'
      },
      {
        label: 'Account Settings',
        href: '/pages/account-settings',
        icon: 'ri-settings-4-line'
      },

    ]
  },
]

const DefaultSuggestions = ({ setOpen }: { setOpen: (value: boolean) => void }) => {
  // Hooks
  const { lang: locale } = useParams()

  return (
    <div className='flex grow flex-wrap gap-x-[48px] gap-y-8 plb-14 pli-16 overflow-y-auto overflow-x-hidden bs-full'>
      {defaultSuggestions.map((section, index) => (
        <div
          key={index}
          className='flex flex-col justify-center overflow-x-hidden gap-4 basis-full sm:basis-[calc((100%-3rem)/2)]'
        >
          <p className='text-xs uppercase text-textDisabled tracking-[0.8px]'>{section.sectionLabel}</p>
          <ul className='flex flex-col gap-4'>
            {section.items.map((item, i) => (
              <li key={i} className='flex'>
                <Link
                  href={item.href}
                  className='flex items-center overflow-x-hidden cursor-pointer gap-2 hover:text-primary focus-visible:text-primary focus-visible:outline-0'
                  onClick={() => setOpen(false)}
                >
                  {item.icon && <i className={classnames(item.icon, 'flex text-xl')} />}
                  <p className='text-[15px] overflow-hidden whitespace-nowrap overflow-ellipsis'>{item.label}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default DefaultSuggestions
