// Type Imports
import type { ThemeColor } from '@core/types'

export type UsersType = {
  id: number
  role: string
  email: string
  status: string
  avatar: string
  access?: string
  company: string
  country: string
  contact: string
  fullName: string
  username: string
  avatarColor?: ThemeColor
}
