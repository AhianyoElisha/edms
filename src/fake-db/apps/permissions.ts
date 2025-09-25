// Type Imports
import type { PermissionRowType } from '@/types/apps/permissionTypes'

export const db: PermissionRowType[] = [
  {
    id: 1,
    name: 'Management(Director)',
    assignedTo: 'administrator',
    createdDate: '14 Apr 2021, 8:43 PM'
  },
  {
    id: 2,
    assignedTo: 'administrator',
    name: 'Manage Billing & Roles',
    createdDate: '16 Sep 2021, 5:20 PM'
  },
  {
    id: 3,
    name: 'Add & Remove Users',
    createdDate: '14 Oct 2021, 10:20 AM',
    assignedTo: ['administrator', 'manager']
  },
  {
    id: 4,
    name: 'Stores Representative',
    createdDate: '14 Oct 2021, 10:20 AM',
    assignedTo: ['administrator', 'users', 'support']
  },
  {
    id: 5,
    name: 'Production Representative',
    createdDate: '23 Aug 2021, 2:00 PM',
    assignedTo: ['administrator', 'users', 'support']
  },
  {
    id: 6,
    name: 'Sales Representative',
    createdDate: '15 Apr 2021, 11:30 AM',
    assignedTo: ['administrator', 'manager']
  },
  {
    id: 7,
    name: 'Warehouse Representative',
    createdDate: '04 Dec 2021, 8:15 PM',
    assignedTo: ['administrator', 'restricted-user']
  },
  {
    id: 8,
    name: 'Manage Others’ Tasks',
    createdDate: '04 Nov 2021, 11:45 AM',
    assignedTo: ['administrator', 'support']
  }
]
