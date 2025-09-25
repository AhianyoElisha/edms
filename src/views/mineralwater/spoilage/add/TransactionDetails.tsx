'use client'

import React, { useState } from 'react'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import { Divider, Typography } from '@mui/material'
import { z } from 'zod'
import { useForm, useFieldArray, FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { DamagedItemDetailType, DamagedProductDataParams, InventoryDataParams, ReturnProductDataParams, TransactionProductDataParams } from '@/types/apps/ecommerceTypes'
import { useAuth } from '@/contexts/AppwriteProvider'
import { toast } from 'react-toastify'
import TransactionAddHeader from './TransactionAddHeader'
import TransactionCategory from './TransactionCategory'
import { createReturnedProductList } from '@/libs/actions/dailysales.actions'
import TransactionHorizontal from './TransactionHorizontal'
import { Controller } from 'react-hook-form'
import TextField from '@mui/material/TextField'
import { createDamagedProductList } from '@/libs/actions/warehouse.actions'
import { DatePicker } from '@mui/x-date-pickers-pro'
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers-pro'
import { LicenseInfo } from '@mui/x-license'
import dayjs, { Dayjs } from 'dayjs'

LicenseInfo.setLicenseKey('e0d9bb8070ce0054c9d9ecb6e82cb58fTz0wLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxLVj0y');






const productionDetailSchema = z.object({
  quantity: z.coerce.number().min(1, { message: "Damaged Quantity is required" }),
  category: z.string().min(1, { message: "Product Category is required" }),
  damageDate: z.string().min(1, { message: "Damage Date is required" }),
});

const formSchema = z.object({
  details: z.array(productionDetailSchema).min(1, { message: "At least one damaged item is required" }),
});

interface CombinedSelectionData {
  category?: any;
}

const DailySalesDetails: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [selectedData, setSelectedData] = useState<Record<number, CombinedSelectionData>>({});

  const user = useAuth()
  const router = useRouter()
  
  const { control, handleSubmit, formState: { errors }, setValue } = useForm<DamagedProductDataParams>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      details: [
        {
          quantity: 0,
          category: '',
          damageDate: new Date(),
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "details",
  });

  const handleCategorySelect = (index: number) => async (categoryData: any) => {
    setSelectedData(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        category: categoryData
      }
    }));
  };


  const handleRemove = (index: number) => {
    setSelectedData(prev => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
    remove(index);
  };

  async function onSubmit(data: DamagedProductDataParams) {
    setLoading(true);
    try {
      const res = await createDamagedProductList(data, user.user.$id!);
      toast.success('Damaged product successfully removed from warehouse');
      router.push(`/warehouse/spoilagereport`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to process damaged product');
      setLoading(false);
    }
  }

  const onError = (errors: FieldErrors<InventoryDataParams>) => {
    console.log('Form errors:', errors);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Card elevation={0}>
        <CardHeader title='Damaged and Leaking Products' />
        <CardContent>
          <Divider component="hr" className='mb-5' />
          {fields.map((field, index) => (
            <Grid key={field.id} item xs={12} container spacing={6} mb={10} className='repeater-item'>
              <Grid item xs={12}>
                <TransactionAddHeader index={index} remove={handleRemove} />
              </Grid>
              <Grid item xs={8}>
                <Grid container spacing={6}>
                  <Grid item xs={12} sm={6}>
                    <TransactionCategory
                      control={control}
                      index={index}
                      name={`details.${index}.category`}
                      error={errors.details?.[index]?.category}
                      onCategorySelect={handleCategorySelect(index)}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TransactionHorizontal selectedData={selectedData[index]} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant='h6' className='mb-2'>Damage Date</Typography>
                    <Controller
                      name={`details.${index}.damageDate`}
                      control={control}
                      render={({ field }) => (
                        <DatePicker 
                          label='Damage date'
                          value={field.value ? dayjs(field.value) : null}
                          onChange={(date) => {
                            // Ensure we always store as ISO string
                            const isoDate = date ? date.toISOString() : null;
                            console.log('Setting damage date:', isoDate); // For debugging
                            field.onChange(isoDate);
                          }}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              error: !!errors?.details?.[index]?.damageDate,
                              helperText: errors?.details?.[index]?.damageDate?.message
                            }
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant='h6' className='mb-2'>Quantity Damaged</Typography>
                    <Grid item xs={12}>
                        <Controller
                          name={`details.${index}.quantity`}
                          control={control}
                          render={({ field }) => (
                            <TextField 
                              fullWidth
                              label='Number of Packages' 
                              type='tel' 
                              placeholder='Enter the number of packages' 
                              {...field} 
                              error={!!errors?.details?.[index]?.quantity}
                              helperText={errors?.details?.[index]?.quantity?.message}
                            />
                          )}
                        />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          ))}
          <Divider component="hr" className='my-10' />
          <Grid item xs={12} className='flex justify-end gap-4'>
            <Button 
              variant='contained' 
              onClick={() => append({
                quantity: 0,
                damageDate: new Date(),
                category: '',
              })} 
              startIcon={<i className='ri-add-line' />}
            >
              Add Damages Item
            </Button>
            <Button 
              variant='contained' 
              className='bg-success' 
              onClick={handleSubmit(onSubmit, onError)} 
              startIcon={<i className='ri-save-line' />}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </Grid>
        </CardContent>
      </Card>
    </LocalizationProvider>
  );
};

export default DailySalesDetails;

