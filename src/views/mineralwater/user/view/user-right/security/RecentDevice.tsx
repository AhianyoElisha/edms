// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'

// Type Imports
import type { Users } from '@/types/apps/ecommerceTypes'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

type DataType = {
  device: string
  browser: string
  location: string
  recentActivity: string
}

const RecentDevice = ({ userData }: { userData: Users }) => {
  // Parse login devices from user data if available
  const loginDevices = userData.loginDevices ? JSON.parse(userData.loginDevices) : []

  // Default data if no devices available
  const defaultDevices: DataType[] = [
    {
      device: 'Current Device',
      location: 'Ghana',
      browser: 'Chrome on Windows',
      recentActivity: userData.lastLoginAt || 'Never'
    }
  ]

  const deviceData = loginDevices.length > 0 ? loginDevices : defaultDevices

  return (
    <Card>
      <CardHeader title='Recent Devices' />
      <div className='overflow-x-auto'>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>Browser</th>
              <th>Device</th>
              <th>Location</th>
              <th>Recent Activities</th>
            </tr>
          </thead>
          <tbody>
            {deviceData.map((device: any, index: number) => (
              <tr key={index}>
                <td>
                  <div className='flex items-center gap-4'>
                    <img alt='Chrome' width='22px' src='/images/logos/chrome.png' />
                    <Typography color='text.primary'>{device.browser || 'Chrome Browser'}</Typography>
                  </div>
                </td>
                <td>
                  <Typography>{device.device || 'Unknown Device'}</Typography>
                </td>
                <td>
                  <Typography>{device.location || 'Ghana'}</Typography>
                </td>
                <td>
                  <Typography>
                    {device.lastAccess ? new Date(device.lastAccess).toLocaleString() : 'Never'}
                  </Typography>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export default RecentDevice

