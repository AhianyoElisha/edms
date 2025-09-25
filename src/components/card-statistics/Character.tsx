// MUI Imports
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'

// Types Imports
import type { CardStatsCharacterProps } from '@/types/pages/widgetTypes'
import { ReactNode } from 'react'

const CardStatWithImage = (props: CardStatsCharacterProps) => {
  // Props
  const { title, src, stats, subtitle, trendNumber, trend, chipText, chipColor } = props
  const renderStats = (stats: string | ReactNode) => {
    if (typeof stats === 'string') {
      return <Typography variant='h4'>GH₵ {stats}</Typography>
    }
    return stats
  }
    const renderTitle = (title: string | ReactNode) => {
      if (typeof title === 'string') {
        return <Typography color='text.primary' className='text-nowrap text-sm font-medium'>
        {title}
      </Typography>
      }
      return title
    }
    const renderSubtitle = (subtitle: string | ReactNode) => {
      if (typeof subtitle === 'string') {
        return <Typography color='text.primary' className='text-nowrap font-small'>
        {subtitle}
      </Typography>
      }
      return subtitle
    }
    const renderImage = (src: string | ReactNode) => {
      if (typeof src === 'string') {
       return <img src={src} alt={'image'} className='absolute block-end-0 inline-end-5 self-end bs-[130px] is-auto' />
      }
      return src
    }
    const renderChip = (chipColor: string | ReactNode, chipText: string | ReactNode) => {
      if (typeof chipColor === 'string' && typeof chipText === 'string') {
        // @ts-ignore
        return <Chip size='small' variant='tonal' label={chipText} color={chipColor} />
      }
      return chipText
    }
    const renderTrendNumber = (trendNumber: string | ReactNode) => {
      if (typeof trendNumber === 'string') {
        // @ts-ignore
        return <Typography color={trend === 'negative' ? 'error.main' : 'success.main'}>
        {`${trend === 'negative' ? '-' : '+'}${trendNumber}`}
        </Typography>
      }
      return trendNumber
    }
  return (
    <Card className='relative bs-full'>
      <CardContent>
        <Grid container >
          <Grid item xs={7} className='flex flex-col justify-between gap-5 mb-3'>
            <div className='flex flex-col items-start gap-2'>
              {renderTitle(title)}
              {renderSubtitle(subtitle)}
              {renderChip(chipColor, chipText)}
            </div>
            <div className='flex flex-wrap items-center gap-x-2'>
              {renderStats(stats)}
              {/* {renderTrendNumber(trendNumber)} */}
            </div>
          </Grid>
          {renderImage(src)}
        </Grid>
      </CardContent>
    </Card>
  )
}

export default CardStatWithImage
