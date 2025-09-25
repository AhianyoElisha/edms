import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { Control, Controller, FieldErrors } from 'react-hook-form'
import { CategoryType, MachineryCategoryType } from '@/types/apps/ecommerceTypes'
import { useEffect } from 'react'
import ProductSupplier from './ProductSupplier'
import { DatePicker } from '@mui/x-date-pickers-pro'
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers-pro'
import { LicenseInfo } from '@mui/x-license'
import dayjs, { Dayjs } from 'dayjs'

interface MachineryItemErrors {
  vendorName?: { message?: string };
  invoiceNumber?: { message?: string };
  batchNumber?: { message?: string };
  packageQuantity?: { message?: string };
  partialPayment?: { message?: string };
  pricePerOne?: { message?: string };
  description?: { message?: string };
  usdRate?: { message?: string };
  purchaseDate?: { message?: string };
}

interface ProductInfoProps {
  control: Control<any>
  index: number
  names: {
    vendorName: string
    invoiceNumber: string
    packageQuantity: string
    pricePerOne: string
    description: string
    usdRate: string
    purchaseDate: string
  }
  errors?: MachineryItemErrors
  categoryData?: MachineryCategoryType
  showPartialPayment?: boolean
}

LicenseInfo.setLicenseKey('e0d9bb8070ce0054c9d9ecb6e82cb58fTz0wLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxLVj0y');

const ProductInformation = ({ control, index, names, errors, categoryData}: ProductInfoProps) => {

  // Use useEffect to update form values when categoryData changes
  useEffect(() => {
    if (categoryData) {
      control._formValues.setValue(names.pricePerOne, categoryData.pricePerOne)
      control._formValues.setValue(names.usdRate, categoryData.usdRate)
    }
  }, [categoryData, control, names])


  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Card>
        <CardHeader title='Machinery Item Information' />
        <CardContent>
          <Grid container spacing={5} className='mbe-5'>
            <Grid item xs={12}>
              <ProductSupplier
                control={control}
                index={index}
                name={names.vendorName}
                error={!!errors?.vendorName} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller
                name={names.invoiceNumber}
                control={control}
                render={({ field }) => (
                  <TextField 
                    fullWidth 
                    label='Invoice Number' 
                    placeholder='1234-56789' 
                    {...field} 
                    error={!!errors?.invoiceNumber}
                    helperText={errors?.invoiceNumber?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller
                name={names.packageQuantity}
                control={control}
                render={({ field }) => (
                  <TextField 
                    fullWidth 
                    label='Number of Machines/Tools' 
                    type='tel' 
                    placeholder='Enter the number of machines/tools' 
                    {...field} 
                    error={!!errors?.packageQuantity}
                    helperText={errors?.packageQuantity?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller
                name={names.usdRate}
                control={control}
                render={({ field }) => (
                  <TextField 
                    fullWidth 
                    label='USD$/GH₵ rate' 
                    type='tel' 
                    placeholder='Enter USD$/GH₵ rate' 
                    {...field} 
                    error={!!errors?.usdRate}
                    helperText={errors?.usdRate?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name={names.pricePerOne}
                control={control}
                render={({ field }) => (
                  <TextField 
                    fullWidth 
                    label='Purchase price per machine(GH₵)' 
                    type='tel' 
                    placeholder='Enter the price per machine in GH₵' 
                    {...field} 
                    error={!!errors?.pricePerOne}
                    helperText={errors?.pricePerOne?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name={names.purchaseDate}
                control={control}
                render={({ field }) => (
                  <DatePicker 
                    label='Purchase date'
                    value={field.value ? dayjs(field.value) : null}
                    onChange={(date) => {
                      // Ensure we always store as ISO string
                      const isoDate = date ? date.toISOString() : null;
                      console.log('Setting purchase date:', isoDate); // For debugging
                      field.onChange(isoDate);
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors?.purchaseDate,
                        helperText: errors?.purchaseDate?.message
                      }
                    }}
                  />
                )}
              />
            </Grid>
          </Grid> 
          <Typography className='mbe-1'>Description (Optional)</Typography>
          <Controller
            name={names.description}
            control={control}
            render={({ field }) => (
              <TextField 
                fullWidth 
                label='' 
                placeholder='Enter Machinery Item Description' 
                {...field} 
                error={!!errors?.description}
                helperText={errors?.description?.message}
              />
            )}
          />
        </CardContent>
      </Card>
    </LocalizationProvider>
  )
}

export default ProductInformation