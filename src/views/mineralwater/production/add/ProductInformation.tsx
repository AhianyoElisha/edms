import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { Control, Controller } from 'react-hook-form'
import {  ProductionCategoryType } from '@/types/apps/ecommerceTypes'
import { useEffect } from 'react'
import { DatePicker } from '@mui/x-date-pickers-pro'
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers-pro'
import { LicenseInfo } from '@mui/x-license'
import dayjs, { Dayjs } from 'dayjs'






LicenseInfo.setLicenseKey('e0d9bb8070ce0054c9d9ecb6e82cb58fTz0wLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxLVj0y');


interface ProductionItemErrors {
  batchNumber?: { message?: string };
  packageQuantity?: { message?: string };
  qtyPerPackage?: { message?: string };
  pricePerBox?: { message?: string };
  description?: { message?: string };
  manufactureDate?: { message?: string };
}

interface ProductInfoProps {
  control: Control<any>
  index: number
  names: {
    packageQuantity: string
    qtyPerPackage: string
    manufactureDate: string
    pricePerBox: string
    description: string
    batchNumber: string
  }
  errors?: ProductionItemErrors
  productCategoryData?: ProductionCategoryType
}

const ProductInformation = ({ control, index, names, errors, productCategoryData }: ProductInfoProps) => {

    // Use useEffect to update form values when categoryData changes
  useEffect(() => {
    if (productCategoryData) {
      control._formValues.setValue(names.qtyPerPackage, productCategoryData.qtyPerPackage)
      control._formValues.setValue(names.pricePerBox, productCategoryData.pricePerBox)
    }
  }, [productCategoryData, control, names])
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Card>
        <CardHeader title='Manufactured Item Information' />
        <CardContent>
          <Grid container spacing={5} className='mbe-5'>
            <Grid item xs={12} sm={6}>
              <Controller
                name={names.batchNumber}
                control={control}
                render={({ field }) => (
                  <TextField 
                    fullWidth 
                    label='Batch Number' 
                    placeholder='0123-4567' 
                    {...field} 
                    error={!!errors?.batchNumber}
                    helperText={errors?.batchNumber?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6} gap={3} className='flex flex-col'>
              <Typography variant='h6'>Manufacturing Date</Typography>
              <Controller
                name={`details.${index}.manufactureDate`}
                control={control}
                render={({ field }) => (
                  <DatePicker 
                    label='Manufacture date'
                    value={field.value ? dayjs(field.value) : null}
                    onChange={(date) => {
                      // Ensure we always store as ISO string
                      const isoDate = date ? date.toISOString() : null;
                      console.log('Setting production date:', isoDate); // For debugging
                      field.onChange(isoDate);
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors?.manufactureDate,
                        helperText: errors?.manufactureDate?.message
                      }
                    }}
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
                name={names.qtyPerPackage}
                control={control}
                render={({ field }) => (
                  <TextField 
                    fullWidth 
                    type='tel' 
                    label='Quantity in each box' 
                    placeholder='Enter the quantity in each box' 
                    disabled
                    {...field} 
                    error={!!errors?.qtyPerPackage}
                    helperText={errors?.qtyPerPackage?.message}
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
                    label='Selling price per box(GH₵)' 
                    type='tel' 
                    placeholder='Enter the selling price per box in GH₵' 
                    {...field} 
                    disabled
                    error={!!errors?.pricePerBox}
                    helperText={errors?.pricePerBox?.message}
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
