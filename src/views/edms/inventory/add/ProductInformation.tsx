import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { Control, Controller, FieldErrors } from 'react-hook-form'
import { CategoryType } from '@/types/apps/ecommerceTypes'
import { useEffect } from 'react'
import ProductSupplier from './ProductSupplier'
import { DatePicker } from '@mui/x-date-pickers-pro'
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers-pro'
import { LicenseInfo } from '@mui/x-license'
import dayjs, { Dayjs } from 'dayjs'




LicenseInfo.setLicenseKey('e0d9bb8070ce0054c9d9ecb6e82cb58fTz0wLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxLVj0y');


interface InventoryItemErrors {
  vendorName?: { message?: string };
  invoiceNumber?: { message?: string };
  packageQuantity?: { message?: string };
  quantityPerPackage?: { message?: string };
  partialPayment?: { message?: string };
  pricePerBox?: { message?: string };
  description?: { message?: string };
  purchaseDate?: { message?: string };
  usdRate?: { message?: string };
}

interface ProductInfoProps {
  control: Control<any>
  index: number
  names: {
    vendorName: string
    invoiceNumber: string
    packageQuantity: string
    quantityPerPackage: string
    pricePerBox: string
    usdRate: string
    purchaseDate: string
    description: string
  }
  errors?: InventoryItemErrors
  categoryData?: CategoryType
  showPartialPayment?: boolean  // Add this prop
}

const ProductInformation = ({ control, index, names, errors, categoryData, showPartialPayment }: ProductInfoProps, ) => {

    // Use useEffect to update form values when categoryData changes
  useEffect(() => {
    if (categoryData) {
      control._formValues.setValue(names.quantityPerPackage, categoryData.quantityPerPackage)
      control._formValues.setValue(names.pricePerBox, categoryData.pricePerBox)
      control._formValues.setValue(names.usdRate, categoryData.usdRate)
    }
  }, [categoryData, control, names])
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Card>
        <CardHeader title='Inventory Item Information' />
        <CardContent>
          <Grid container spacing={5} className='mbe-5'>
            <Grid item xs={12}>
              <ProductSupplier
                control={control}
                index={index}
                name={names.vendorName}
                error={!!errors?.vendorName} />
            </Grid>
            <Grid item xs={12} sm={6}>
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
            <Grid item xs={12} sm={6}>
              <Controller
                name={names.pricePerBox}
                control={control}
                render={({ field }) => (
                  <TextField 
                    fullWidth 
                    label='Purchase price per box(USD$/GH₵)' 
                    type='tel' 
                    placeholder='Enter the price per package in USD$/GH₵' 
                    {...field} 
                    error={!!errors?.pricePerBox}
                    helperText={errors?.pricePerBox?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
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
                name={names.quantityPerPackage}
                control={control}
                render={({ field }) => (
                  <TextField 
                    fullWidth 
                    type='tel' 
                    label='Quantity in each box' 
                    placeholder='Enter the quantity in each box' 
                    {...field} 
                    error={!!errors?.quantityPerPackage}
                    helperText={errors?.quantityPerPackage?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name={names.usdRate}
                control={control}
                render={({ field }) => (
                  <TextField 
                    fullWidth 
                    type='tel' 
                    label='USD$/GHS Rate' 
                    placeholder='Enter the USD$/GH₵ Rate' 
                    {...field} 
                    error={!!errors?.usdRate}
                    helperText={errors?.usdRate?.message}
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
                placeholder='Enter Inventory Item Description' 
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