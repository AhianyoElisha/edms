// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import { DateRangePicker } from '@mui/x-date-pickers-pro'
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers-pro'
import { LicenseInfo } from '@mui/x-license'
import dayjs, { Dayjs } from 'dayjs'

// Type Imports
import type { RequisitionHistory } from '@/types/apps/ecommerceTypes'

LicenseInfo.setLicenseKey('e0d9bb8070ce0054c9d9ecb6e82cb58fTz0wLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxLVj0y');

type DateRange = [Dayjs | null, Dayjs | null]

const TableFilters = ({
  setData,
  historyData
}: {
  setData: (data: RequisitionHistory[]) => void
  historyData: RequisitionHistory[]
}) => {
  // States
  const [date, setDate] = useState<DateRange>([null, null])
  const [status, setStatus] = useState<RequisitionHistory['requisitionType']>('')

  useEffect(() => {
    const filteredData = historyData?.filter(history => {
      if (status && history.requisitionType !== status) return false
      
      // Date filtering
      if (date[0] && date[1]) {
        const productDate = dayjs(history.$createdAt)
        if (productDate.isBefore(date[0]) || productDate.isAfter(date[1])) {
          return false
        }
      }

      return true
    })

    setData(filteredData ?? [])
  }, [date, status, historyData, setData])

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <CardContent>
        <div className='flex justify-between flex-wrap gap-6'>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel id='status-select'>Requisition Type</InputLabel>
              <Select
                fullWidth
                id='select-status'
                label='Requisition Type'
                value={status}
                onChange={e => setStatus(e.target.value)}
                labelId='status-select'
              >
                <MenuItem value=''>Select Requisition Type</MenuItem>
                <MenuItem value='stores'>Stores</MenuItem>
                <MenuItem value='production'>Production</MenuItem>
                <MenuItem value='warehouse'>Warehouse</MenuItem>
                <MenuItem value='sales'>Sales</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <DateRangePicker
                value={date}
                onChange={(newValue: DateRange) => setDate(newValue)}
                localeText={{ start: 'Start Date', end: 'End Date' }}
              />
            </FormControl>
          </Grid>
        </div>
      </CardContent>
    </LocalizationProvider>
  )
}

export default TableFilters