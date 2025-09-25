// MUI Imports
import type { ChipProps } from '@mui/material/Chip'

// Type Imports
import type { ThemeColor } from '@core/types'
import type { CustomAvatarProps } from '@core/components/mui/Avatar'
import { ReactNode } from 'react'

export type CardStatsVerticalProps = {
  title: string
  stats: string
  avatarIcon: string
  chipText: string
  chipColor?: ChipProps['color']
  trendNumber: string
  trend?: 'positive' | 'negative'
  avatarColor?: ThemeColor
  avatarSize?: number
  avatarSkin?: CustomAvatarProps['skin']
}

export type CardStatsCharacterProps = {
  stats: string | ReactNode
  title: string | ReactNode
  subtitle: string | ReactNode
  trendNumber: string | ReactNode
  chipText: string | ReactNode
  src: string | ReactNode
  trend?: 'positive' | 'negative' | ReactNode
  chipColor?: ThemeColor | ReactNode
  isLoading?: boolean
}

export type CardStatsHorizontalProps = {
  title: string
  stats: string
  avatarIcon: string
  trendNumber?: string
  trend?: string
  avatarColor?: ThemeColor
  avatarSize?: number
  avatarSkin?: CustomAvatarProps['skin']
}

export type CardStatsHorizontalWithAvatarProps = {
  stats: string
  title: string
  avatarIcon: string
  avatarColor?: ThemeColor
  avatarVariant?: CustomAvatarProps['variant']
  avatarSkin?: CustomAvatarProps['skin']
  avatarSize?: number
}

export type CardStatsHorizontalWithBorderProps = {
  title: string
  stats: number
  trendNumber: number
  avatarIcon: string
  color?: ThemeColor
}

export type CardStatsCustomerStatsProps = {
  title: string
  avatarIcon: string
  color?: ThemeColor
  description: string
} & (
  | {
      stats?: string
      content?: string
      chipLabel?: never
    }
  | {
      chipLabel?: string
      stats?: never
      content?: never
    }
)

export type CardStatsType = {
  statsVertical: CardStatsVerticalProps[]
  statsCharacter: CardStatsCharacterProps[]
  statsHorizontal: CardStatsHorizontalProps[]
  statsHorizontalWithAvatar: CardStatsHorizontalWithAvatarProps[]
  statsHorizontalWithBorder: CardStatsHorizontalWithBorderProps[]
  customerStats: CardStatsCustomerStatsProps[]
}
