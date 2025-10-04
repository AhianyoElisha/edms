import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { Control, Controller } from 'react-hook-form'
import {  ProductionCategoryType } from '@/types/apps/ecommerceTypes'
import { useEffect } from 'react'
import TransactionVehicle from './TransactionVehicle'
import TransactionSalesCategory from './TransactionSalesCategory'
import TransactionHorizontal from './TransactionHorizontal'
import { DatePicker } from '@mui/x-date-pickers-pro'
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers-pro'
import { LicenseInfo } from '@mui/x-license'
import dayjs, { Dayjs } from 'dayjs'


LicenseInfo.setLicenseKey('e0d9bb8070ce0054c9d9ecb6e82cb58fTz0wLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxLVj0y');


interface TransactionItemErrors {
  packageQuantity?: { message?: string };
  vehicle?: { message?: string };
  salesCategory?: { message?: string };
  salesDate?: { message?: string };
}

interface TransactionInfoProps {
  control: Control<any>
  index: number
  names: {
    packageQuantity: string
    vehicle: string
    salesCategory: string
    salesDate: string
  }
  errors?: TransactionItemErrors
  onVehicleSelect: (vehicleData: any) => void
  selectedData: any
}

const TransactionInformation = ({ control, index, names, errors, selectedData, onVehicleSelect }: TransactionInfoProps) => {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Card>
        <CardHeader title='Information of Transaction' />
        <CardContent>
          <Grid container spacing={5} className='mbe-5'>
            <Grid item xs={12} md={6}>
              <TransactionVehicle
                control={control}
                index={index}
                name={names.vehicle}
                error={!!errors?.vehicle}
                onVehicleSelect={onVehicleSelect}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TransactionSalesCategory
                control={control}
                index={index}
                name={names.salesCategory}
                error={errors?.salesCategory}
              />
            </Grid>
            <Grid item xs={12} sm={6} gap={3} className='flex flex-col'>
                <Typography variant='h6'>Sales Date</Typography>
                <Controller
                  name={names.salesDate}
                  control={control}
                  render={({ field }) => (
                    <DatePicker 
                      label='Sales date'
                      value={field.value ? dayjs(field.value) : null}
                      onChange={(date) => {
                        // Ensure we always store as ISO string
                        const isoDate = date ? date.toISOString() : null;
                        console.log('Setting sales date:', isoDate); // For debugging
                        field.onChange(isoDate);
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors?.salesDate,
                          helperText: errors?.salesDate?.message
                        }
                      }}
                    />
                  )}
                />
              </Grid>
            <Grid item xs={12} sm={6}>
              <TransactionHorizontal selectedData={selectedData} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Grid item xs={12} gap={3} className='flex flex-col'>
                  <Controller
                    name={names.packageQuantity}
                    control={control}
                    render={({ field }) => (
                      <TextField 
                        fullWidth 
                        label='Number of Packages' 
                        type='tel' 
                        placeholder='Enter the number of packages' 
                        {...field} 
                        error={!!errors?.packageQuantity}
                        helperText={errors?.packageQuantity?.message}
                      />
                    )}
                  />
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </LocalizationProvider>
  )
}

export default TransactionInformation
