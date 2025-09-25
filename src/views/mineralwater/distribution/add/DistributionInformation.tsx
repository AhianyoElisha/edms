import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { Control, Controller } from 'react-hook-form'
import {  ProductionCategoryType } from '@/types/apps/ecommerceTypes'
import { useEffect } from 'react'
import DistributionVehicle from './DistributionVehicle'
import { DatePicker } from '@mui/x-date-pickers-pro'
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers-pro'
import { LicenseInfo } from '@mui/x-license'
import dayjs, { Dayjs } from 'dayjs'



LicenseInfo.setLicenseKey('e0d9bb8070ce0054c9d9ecb6e82cb58fTz0wLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxLVj0y');



interface DistributionItemErrors {
  packageQuantity?: { message?: string };
  vehicle?: { message?: string };
  distributionDate?: { message?: string };
}

interface DistributionInfoProps {
  control: Control<any>
  index: number
  names: {
    packageQuantity: string
    vehicle: string
    distributionDate: string
  }
  errors?: DistributionItemErrors
  categoryData?: ProductionCategoryType
}

const DistributionInformation = ({ control, index, names, errors, categoryData }: DistributionInfoProps) => {

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Card>
        <CardHeader title='Information of Item to Distribute' />
        <CardContent>
          <Grid container spacing={5} className='mbe-5'>
            <Grid item xs={12} md={6}>
              <DistributionVehicle
                control={control}
                index={index}
                name={names.vehicle}
                error={!!errors?.vehicle}
              />
            </Grid>
            <Grid item xs={12} md={6}>
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
            <Grid item xs={12} sm={6}>
              <Controller
                name={names.distributionDate}
                control={control}
                render={({ field }) => (
                  <DatePicker 
                    label='Distribution date'
                    value={field.value ? dayjs(field.value) : null}
                    onChange={(date) => {
                      // Ensure we always store as ISO string
                      const isoDate = date ? date.toISOString() : null;
                      console.log('Setting distribution date:', isoDate); // For debugging
                      field.onChange(isoDate);
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors?.distributionDate,
                        helperText: errors?.distributionDate?.message
                      }
                    }}
                  />
                )}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </LocalizationProvider>
  )
}

export default DistributionInformation
