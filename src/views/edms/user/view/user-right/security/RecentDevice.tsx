// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Chip from '@mui/material/Chip'

// Type Imports
import type { Users } from '@/types/apps/ecommerceTypes'

// Actions
import { getUserSessions, deleteUserSession } from '@/libs/actions/user.actions'
import { toast } from 'react-toastify'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

const RecentDevice = ({ userData }: { userData: Users }) => {
  const [sessions, setSessions] = useState<any[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState<string[]>([])

  // Fetch user sessions
  useEffect(() => {
    const fetchSessions = async () => {
      if (userData.accountId) {
        try {
          setSessionsLoading(true)
          const result = await getUserSessions(userData.accountId)
          if (result.success) {
            setSessions(result.sessions)
          }
        } catch (error) {
          console.error('Error fetching sessions:', error)
        } finally {
          setSessionsLoading(false)
        }
      }
    }

    fetchSessions()
  }, [userData.accountId])

  const handleLogoutDevice = async (sessionId: string) => {
    try {
      setLoadingSessions(prev => [...prev, sessionId])
      await deleteUserSession(userData.accountId, sessionId)
      toast.success('Device logged out successfully')
      
      // Refresh sessions
      const result = await getUserSessions(userData.accountId)
      if (result.success) {
        setSessions(result.sessions)
      }
    } catch (error: any) {
      console.error('Error logging out device:', error)
      toast.error(error.message || 'Failed to logout device')
    } finally {
      setLoadingSessions(prev => prev.filter(id => id !== sessionId))
    }
  }

  const getDeviceIcon = (clientName: string) => {
    const name = clientName.toLowerCase()
    if (name.includes('chrome')) return '/images/logos/chrome.png'
    if (name.includes('firefox')) return '/images/logos/firefox.png'
    if (name.includes('safari')) return '/images/logos/safari.png'
    if (name.includes('edge')) return '/images/logos/edge.png'
    return '/images/logos/chrome.png' // default
  }

  if (sessionsLoading) {
    return (
      <Card>
        <CardHeader title='Recent Devices' />
        <div className='flex justify-center items-center p-8'>
          <CircularProgress />
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader 
        title='Recent Devices' 
        subheader={`${sessions.length} active ${sessions.length === 1 ? 'session' : 'sessions'}`}
      />
      <div className='overflow-x-auto'>
        {sessions.length === 0 ? (
          <div className='flex justify-center items-center p-8'>
            <Typography color='text.secondary'>No active sessions found</Typography>
          </div>
        ) : (
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Browser</th>
                <th>Device</th>
                <th>Location</th>
                <th>Recent Activity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session: any) => (
                <tr key={session.$id}>
                  <td>
                    <div className='flex items-center gap-4'>
                      <img 
                        alt={session.clientName} 
                        width='22px' 
                        src={getDeviceIcon(session.clientName)} 
                      />
                      <div>
                        <Typography color='text.primary' className='font-medium'>
                          {session.clientName || 'Unknown Browser'}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {session.clientVersion}
                        </Typography>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>
                      <Typography>
                        {session.osName || 'Unknown'} {session.osVersion}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {session.deviceName || session.deviceModel || 'Desktop'}
                      </Typography>
                    </div>
                  </td>
                  <td>
                    <div>
                      <Typography>{session.ip || 'Unknown'}</Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {session.countryName || session.countryCode || 'Unknown Location'}
                      </Typography>
                    </div>
                  </td>
                  <td>
                    <div>
                      <Typography>
                        {new Date(session.$createdAt).toLocaleDateString()}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {new Date(session.$createdAt).toLocaleTimeString()}
                      </Typography>
                      {session.current && (
                        <Chip 
                          label='Current' 
                          size='small' 
                          color='success' 
                          variant='tonal' 
                          className='ml-2'
                        />
                      )}
                    </div>
                  </td>
                  <td>
                    {!session.current ? (
                      <>
                      <Tooltip title='Logout this device'>
                        <IconButton
                          size='small'
                          color='error'
                          onClick={() => handleLogoutDevice(session.$id)}
                          disabled={loadingSessions.includes(session.$id)}
                        >
                          {loadingSessions.includes(session.$id) ? (
                            <CircularProgress size={20} />
                          ) : (
                            <i className='ri-logout-box-line' />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Typography variant='caption' color='text.secondary'>
                        Logout
                      </Typography>
                    </>
                    ) : (
                      <Typography variant='caption' color='text.secondary'>
                        Active now
                      </Typography>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  )
}

export default RecentDevice

