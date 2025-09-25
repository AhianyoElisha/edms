'use client'

// MUI Imports
import Avatar from '@mui/material/Avatar'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import { styled } from '@mui/material/styles'
import TimelineDot from '@mui/lab/TimelineDot'
import TimelineItem from '@mui/lab/TimelineItem'
import Typography from '@mui/material/Typography'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineConnector from '@mui/lab/TimelineConnector'
import MuiTimeline from '@mui/lab/Timeline'
import Link from 'next/link'
import type { TimelineProps } from '@mui/lab/Timeline'
import { RequisitionHistory } from '@/types/apps/ecommerceTypes'
import LoaderDark from '@/components/layout/shared/LoaderDark'
import { useRequisitionHistory } from '@/hooks/useDataFetching'

// Styled Timeline component
const Timeline = styled(MuiTimeline)<TimelineProps>({
  paddingLeft: 0,
  paddingRight: 0,
  '& .MuiTimelineItem-root': {
    width: '100%',
    '&:before': {
      display: 'none'
    }
  }
})

type ActivityTimelineProps = {
  history: RequisitionHistory[] | undefined
  isLoading: boolean
}

// Helper function to format time since
const getTimeSince = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    // Time intervals in seconds
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };
    
    if (seconds < intervals.minute) {
      return `${Math.floor(seconds)} seconds ago`;
    } else if (seconds < intervals.hour) {
      return `${Math.floor(seconds / intervals.minute)} ${Math.floor(seconds / intervals.minute) === 1 ? 'minute' : 'minutes'} ago`;
    } else if (seconds < intervals.day) {
      return `${Math.floor(seconds / intervals.hour)} ${Math.floor(seconds / intervals.hour) === 1 ? 'hour' : 'hours'} ago`;
    } else if (seconds < intervals.week) {
      return `${Math.floor(seconds / intervals.day)} ${Math.floor(seconds / intervals.day) === 1 ? 'day' : 'days'} ago`;
    } else if (seconds < intervals.month) {
      return `${Math.floor(seconds / intervals.week)} ${Math.floor(seconds / intervals.week) === 1 ? 'week' : 'weeks'} ago`;
    } else if (seconds < intervals.year) {
      return `${Math.floor(seconds / intervals.month)} ${Math.floor(seconds / intervals.month) === 1 ? 'month' : 'months'} ago`;
    } else {
      return `${Math.floor(seconds / intervals.year)} ${Math.floor(seconds / intervals.year) === 1 ? 'year' : 'years'} ago`;
    }
  } catch (error) {
    console.error('Error calculating time since:', error);
    return 'Some time ago';
  }
}

// Helper function to generate activity description
const getActivityDescription = (item: RequisitionHistory): string => {
  return `${item.requisitionEvent} 
                  ${item.requisitionType.includes('category') ? `${item.category}` : item.requisitionEvent.includes('spent') ? `GH₵ ${item.noOfBoxes}` : `${item.noOfBoxes} box(es) or package(s)`}
                  ${item.requisitionType.includes('category') ? '' : item.requisitionEvent.includes('spent') ? ` on ${item.requisitionType} `: ` of ${item.category} `}
                  ${item.requisitionEvent.includes('added') 
                    ? 'to' 
                    : item.requisitionEvent.includes('created') 
                    ? 'in' 
                    : item.requisitionEvent.includes('distributed') 
                      ? 'into'
                    : item.requisitionEvent.includes('spent') ? ''
                      : 'from'} 
                  ${item.requisitionEvent.includes('spent') ? item.category : item.requisitionType}`
}

// Function to determine timeline dot color based on event type
const getDotColor = (event: string) => {
  if (event.includes('added') || event.includes('created')) {
    return 'success';
  } else if (event.includes('approved')) {
    return 'info';
  } else if (event.includes('denied') || event.includes('rejected')) {
    return 'error';
  } else {
    return 'warning';
  }
}

const ActivityTimeline = () => {
  const { data: history, isLoading, error } = useRequisitionHistory()
  
  // Limit to first 5 items if there are more
  const displayHistory = history?.rows?.slice(0, 5);

  // Helper function to safely get role info
  const getRoleInfo = (requisitionist: any) => {
    if (!requisitionist?.role) return 'Unknown Role';
    
    // If role is an object with displayName or name
    if (typeof requisitionist.role === 'object') {
      return requisitionist.role.displayName || requisitionist.role.name || 'Unknown Role';
    }
    
    // If role is just a string ID, we can't display it meaningfully
    return 'Role Loading...';
  };

  const getUserName = (requisitionist: any) => {
    return requisitionist?.name || 'Unknown User';
  };

  return (
    <Card>
      <CardHeader title='Activity Timeline' />
      <CardContent 
        sx={isLoading ? { 
          textAlign: 'center',
        } : { 
          paddingBlockStart: 3 
        }}
      >
        {
          isLoading ? (
            <div>
              <LoaderDark />
              <Typography>Loading...</Typography>
              <Typography>This may take up to 1 minute.</Typography>
            </div>
          ) :
          error ? (
            <Typography color="error">Failed to load activity timeline</Typography>
          ) :
          !displayHistory || displayHistory.length === 0 ? (
          <Typography>No activities</Typography>
        ) : (
          <Timeline>
            {displayHistory.map((item, index) => (
              <TimelineItem key={index}>
                <TimelineSeparator>
                  <TimelineDot color={getDotColor(item.requisitionEvent)} />
                  {index < displayHistory.length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                <TimelineContent>
                  <div className='flex flex-wrap items-center justify-between gap-x-2 mbe-2.5'>
                    <Typography className='font-medium' color='text.primary' style={{ textTransform: 'capitalize' }}>
                      {`${getRoleInfo(item.requisitionist)} ${item.requisitionEvent} ${item.category}`}
                    </Typography>
                    <Typography variant='caption'>
                      {getTimeSince(item.$createdAt!)}
                    </Typography>
                  </div>
                  <Typography className='mbe-2'>
                    {getActivityDescription(item)}
                  </Typography>
                  <div className='flex items-center gap-2.5'>
                    <Avatar 
                      src={item.requisitionist?.avatar || ''} 
                      className='is-8 bs-8'
                      sx={{
                        '& .MuiAvatar-img': {
                          objectFit: 'contain' // Change to 'cover' if you want the image to fill and crop
                        }
                      }}
                    />
                    <div className='flex flex-col flex-wrap'>
                      <Typography variant='body2' className='font-medium' style={{ textTransform: 'capitalize' }}>
                        {getUserName(item.requisitionist)} 
                        {item.requisitionist?.role && typeof item.requisitionist.role === 'object' && 
                          ` (${item.requisitionist.role.displayName || item.requisitionist.role.name})`
                        }
                      </Typography>
                      <Typography variant='body2' style={{ textTransform: 'capitalize' }}>
                        {getRoleInfo(item.requisitionist)}
                      </Typography>
                    </div>
                  </div>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        )}
      </CardContent>
    </Card>
  )
}

export default ActivityTimeline