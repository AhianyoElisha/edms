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

// Type Imports
import type { CategoryType, InventoryListType } from '@/types/apps/ecommerceTypes'
import { LicenseInfo } from '@mui/x-license'
import dayjs, { Dayjs } from 'dayjs'


LicenseInfo.setLicenseKey('e0d9bb8070ce0054c9d9ecb6e82cb58fTz0wLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxLVj0y');


type DateRange = [Dayjs | null, Dayjs | null]
type ProductStockType = { [key: string]: boolean }

// Vars
const productStockObj: ProductStockType = {
  'In Stock': true,
  'Out of Stock': false
}

const TableFilters = ({
  setData,
  productData,
  categoryData
}: {
  setData: (data: InventoryListType[]) => void
    productData?: InventoryListType[]
    categoryData?: CategoryType[]
}) => {
  // States
  const [category, setCategory] = useState<InventoryListType['category']>('')
  const [date, setDate] = useState<DateRange>([null, null])
  const [status, setStatus] = useState<InventoryListType['paymentStatus']>('')

  useEffect(
    () => {
      const filteredData = productData?.filter(inventory => {
        // @ts-ignore
        if (category && inventory.category.categoryTitle !== category) return false
        // if (stock && product.stock !== productStockObj[stock]) return false
        if (status && inventory.paymentStatus !== status) return false

      // Date filtering
      if (date[0] && date[1]) {
        const inventoryDate = dayjs(inventory.$createdAt)
        if (inventoryDate.isBefore(date[0]) || inventoryDate.isAfter(date[1])) {
          return false
        }
      }
        return true
      })

      setData(filteredData ?? [])
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [category, date, status, productData]
  )

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <CardContent>
        <Grid container spacing={6}>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel id='status-select'>Status</InputLabel>
              <Select
                fullWidth
                id='select-status'
                label='Status'
                value={status}
                onChange={e => setStatus(e.target.value)}
                labelId='status-select'
              >
                <MenuItem value=''>Select Status</MenuItem>
                <MenuItem value='paid'>Paid</MenuItem>
                <MenuItem value='credit'>On Credit</MenuItem>
                <MenuItem value='partial'>Partial Payment</MenuItem>
                <MenuItem value='postdated'>Post Dated Cheque</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel id='category-select'>Category</InputLabel>
              <Select
                fullWidth
                id='select-category'
                value={category}
                onChange={e => setCategory(e.target.value)}
                label='Category'
                labelId='category-select'
              >
                <MenuItem value=''>Select Category</MenuItem>
                {
                  categoryData?.map(category => {
                    return <MenuItem key={category.$id} value={category.categoryTitle}>{category.categoryTitle}</MenuItem>
                  })
              }
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
        </Grid>
      </CardContent>
    </LocalizationProvider>
  )
}

export default TableFilters
