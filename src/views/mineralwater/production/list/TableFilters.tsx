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
import type { ManufacturedProductListType, ProductionCategoryType } from '@/types/apps/ecommerceTypes'

LicenseInfo.setLicenseKey('e0d9bb8070ce0054c9d9ecb6e82cb58fTz0wLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxLVj0y');

type ProductStockType = { [key: string]: boolean }
type DateRange = [Dayjs | null, Dayjs | null]

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
  setData: (data: ManufacturedProductListType[]) => void
    productData?: ManufacturedProductListType[]
    categoryData?: ProductionCategoryType[]
}) => {
  // States
  const [category, setCategory] = useState<ManufacturedProductListType['category']>('')
  const [date, setDate] = useState<DateRange>([null, null])

  useEffect(() => {
    const filteredData = productData?.filter(product => {
        // @ts-ignore
      if (category && product.productCategory.title !== category) return false
      
      // Date filtering
      if (date[0] && date[1]) {
        const productDate = dayjs(product.manufactureDate)
        if (productDate.isBefore(date[0]) || productDate.isAfter(date[1])) {
          return false
        }
      }

      return true
    })

    setData(filteredData ?? [])
  }, [category, date, productData, setData])

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <CardContent>
        <div className='flex flex-wrap sm:items-center justify-between max-sm:flex-col gap-6'>
          <Grid item xs={12} sm={4}>
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
                    return <MenuItem key={category.$id} value={category.title}>{category.title}</MenuItem>
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
        </div>
      </CardContent>
    </LocalizationProvider>
  )
}

export default TableFilters