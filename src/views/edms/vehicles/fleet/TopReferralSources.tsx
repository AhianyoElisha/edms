'use client'

import { useState } from 'react'
import type { SyntheticEvent } from 'react'
import Tab from '@mui/material/Tab'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import TabList from '@mui/lab/TabList'
import TabPanel from '@mui/lab/TabPanel'
import TabContext from '@mui/lab/TabContext'
import classnames from 'classnames'
import type { ThemeColor } from '@core/types'
import CustomAvatar from '@core/components/mui/Avatar'
import tableStyles from '@core/styles/table.module.css'
import { Button, ButtonProps, Typography } from '@mui/material'
import { DistributedDetail, DistributedItemDetailType, Logistics, Users } from '@/types/apps/ecommerceTypes'
import OpenDialogOnElementClick from '@/components/dialogs/OpenDialogOnElementClick'
import InventoryCategoryExportDialog from '@/components/dialogs/stores-dialog/category'
import AddStaffCard from '@/components/dialogs/staff-card'


interface Props {
  selectedLogistics: Logistics | null
  onStaffUpdate: () => Promise<void>
}

interface TabAvatarType {
  category: string
}

const tabAvatars: TabAvatarType[] = [
  {
    category: 'vehicle staff'
  },
  {
    category: 'distribution'
  }
]

  // Vars
  const buttonProps: ButtonProps = {
    variant: 'contained',
    children: 'Assign Staff',
    className: 'max-sm:is-full is-auto',
    color: 'primary',
    startIcon: <i className='ri-user-line' />
  }

const RenderVehicleStaffTable = ({
  data,
  logisticsId,
  onStaffUpdate
}: { data: Users[]; logisticsId: string; onStaffUpdate?: () => Promise<void> }) => {
  const buttonProps: ButtonProps = {
    variant: 'contained',
    children: 'Assign Staff',
    className: 'max-sm:is-full is-auto',
    color: 'primary',
    startIcon: <i className='ri-user-line' />
  }

  return (
    <>
      <div className='flex items-start justify-end max-sm:flex-col sm:items-center gap-y-4 p-5'>
        <div className='flex items-start max-sm:flex-col gap-4 max-sm:is-full'>
          <OpenDialogOnElementClick 
            element={Button} 
            elementProps={buttonProps} 
            dialog={AddStaffCard} 
            dialogProps={{
              logisticsId,
              onSuccess: onStaffUpdate
             }} 
          />
        </div>
      </div>
      <div className='overflow-x-auto'>
        <table className={tableStyles.table}>
          <thead className='border-be border-bs'>
            <tr>
              <th className='uppercase bg-transparent'>Name</th>
              <th className='uppercase bg-transparent'>Role</th>
              <th className='uppercase bg-transparent'>Email</th>
              <th className='uppercase bg-transparent'>Phone</th>
              <th className='uppercase bg-transparent text-end'>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row: Users) => (
              <tr key={row.$id}>
                <td>{row.name}</td>
                <td>{row.role}</td>
                <td>{row.email}</td>
                <td>{row.phone}</td>
                <td className='text-end'>
                  <Chip 
                    label={row.status} 
                    color={row.status.toLowerCase() === 'active' ? 'success' : 'warning'} 
                    size='small' 
                    variant='tonal' 
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

const RenderDistributionTable = ({ data, vehicleNumber }: { data: DistributedDetail[], vehicleNumber: string }) => {
  console.log(data)
  return (
    <div className='overflow-x-auto'>
      <table className={tableStyles.table}>
        <thead className='border-be border-bs'>
          <tr>
            <th className='uppercase bg-transparent'>Product Category</th>
            <th className='uppercase bg-transparent'>Package Quantity</th>
            <th className='uppercase bg-transparent'>Vehicle</th>
            <th className='uppercase bg-transparent text-end'>Total Price</th>
            <th className='uppercase bg-transparent text-end'>Created By</th>
            <th className='uppercase bg-transparent text-end'>Created At</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row: DistributedDetail, index) => (
            <tr key={row.$id || index}>
              <td>{
                // @ts-ignore
                row.category.title
              }</td>
              <td>{
                // @ts-ignore
                row.quantity
              }</td>
              <td>{
                // @ts-ignore
                vehicleNumber ?? 'N/A'
              }</td>
              <td className='text-end'>${row.totalPrice?.toLocaleString()}</td>
              <td className='text-end'>{
              // @ts-ignore
                row.creator.name
              }</td>
              <td className='text-end'>{new Date(row.$createdAt || '').toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const TopReferralSources = ({ selectedLogistics, onStaffUpdate }: Props) => {
  const [value, setValue] = useState<string>('vehicle staff')

  const handleChange = (event: SyntheticEvent, newValue: string) => {
    setValue(newValue)
  }

  const RenderTabName = ({ data }: { data: TabAvatarType }) => (
    <div
      className={classnames(
        value === data.category ? 'border-solid border-primary flex items-center justify-center' : 'border-dashed',
        'is-[150px] bs-[40px] border-2 bg-transparent rounded flex items-center justify-center'
      )}
    >
      <Typography className='capitalize'>{data.category}</Typography>
    </div>
  )

  return (
    <Card className='mt-4'>
      <CardHeader
        title='Logistics Details'
        subheader={`Vehicle Number: ${selectedLogistics?.vehicleNumber || 'N/A'}`}
      />
      <TabContext value={value}>
        <TabList
          variant='scrollable'
          scrollButtons='auto'
          onChange={handleChange}
          aria-label='logistics details tabs'
          className='!border-be-0 pli-5'
          sx={{
            '& .MuiTab-root:not(:last-child)': { mr: 4 },
            '& .MuiTab-root:hover': { border: 0 },
            '& .MuiTabs-indicator': { display: 'none !important' }
          }}
        >
          <Tab 
            disableRipple 
            value='vehicle staff' 
            className='p-0' 
            label={<RenderTabName data={tabAvatars[0]} />} 
          />
          <Tab 
            disableRipple 
            value='distribution' 
            className='p-0' 
            label={<RenderTabName data={tabAvatars[1]} />} 
          />
        </TabList>

        <TabPanel sx={{ p: 0 }} value='vehicle staff'>
          {selectedLogistics?.driver ? (
          <RenderVehicleStaffTable 
            data={selectedLogistics.driver as unknown as Users[]} 
              logisticsId={selectedLogistics.$id} 
              onStaffUpdate={onStaffUpdate}
            />
          ) : (
            <Typography className='p-4 text-center text-textSecondary'>No driver data available</Typography>
          )}
        </TabPanel>
        {/* <TabPanel sx={{ p: 0 }} value='distribution'>
          {selectedLogistics?.distribution ? (
            <RenderDistributionTable data={selectedLogistics.distribution as unknown as DistributedDetail[]} vehicleNumber={selectedLogistics.vehicleNumber} />
          ) : (
            <Typography className='p-4 text-center text-textSecondary'>No distribution data available</Typography>
          )}
        </TabPanel> */}
      </TabContext>
    </Card>
  )
}

export default TopReferralSources