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
import Loader from '@/components/layout/shared/Loader'
import { InventoryDataParams, TransactionProductDataParams, WorkerDataParams } from '@/types/apps/ecommerceTypes'
import { useAuth } from '@/contexts/AppwriteProvider'
import { toast } from 'react-toastify'
import TransactionAddHeader from './TransactionAddHeader'
import TransactionCategory from './TransactionCategory'
import { createOfficeSalesProductList } from '@/libs/actions/dailysales.actions'
import WorkerSelect from './TransactionSalesCategory'
import { Control, Controller } from 'react-hook-form'
import TextField from '@mui/material/TextField'
import { createWorkersProductionList } from '@/libs/actions/production.actions'
import { DatePicker } from '@mui/x-date-pickers-pro'
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers-pro'
import { LicenseInfo } from '@mui/x-license'
import dayjs, { Dayjs } from 'dayjs'



LicenseInfo.setLicenseKey('e0d9bb8070ce0054c9d9ecb6e82cb58fTz0wLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxLVj0y');


const productionDetailSchema = z.object({
  quantity: z.coerce.number().min(1, { message: "Quantity is required" }),
  productionDate: z.string().min(1, { message: "Purchase Date is required" }),
  category: z.string().min(1, { message: "Product Category is required" }),
  worker: z.string().min(1, { message: "worker is required" }),
  });

const formSchema = z.object({
  details: z.array(productionDetailSchema).min(1, { message: "At least one worker's production item is required" }),
});


interface CombinedSelectionData {
  category?: any;
}

const DailySalesDetails: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [selectedData, setSelectedData] = useState<Record<number, CombinedSelectionData>>({});

  const user = useAuth()
  const router = useRouter()

  
  const { control, handleSubmit, formState: { errors }, setValue } = useForm<WorkerDataParams>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      details: [
        {
          quantity: 0,
          category: '',
          productionDate: new Date(),
          worker: '',
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

  async function onSubmit(data: WorkerDataParams) {
    setLoading(true);
    try {
      const res = await createWorkersProductionList(data, user.user.$id!);
      toast.success(`worker's production added successfully`);
      router.push(`/workersproduction/report`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : `Failed to process worker's production`);
      setLoading(false);
    }
  }

  const onError = (errors: FieldErrors<InventoryDataParams>) => {
    console.log('Form errors:', errors);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Card elevation={0}>
        <CardHeader title={`Worker's Production Tracking`} />
        <CardContent>
          <Divider component="hr" className='mb-5' />
          {fields.map((field, index) => (
            <Grid key={field.id} item xs={12} container spacing={6} mb={10} className='repeater-item'>
              <Grid item xs={12}>
                <TransactionAddHeader index={index} remove={handleRemove} />
              </Grid>
              <Grid item xs={12}>
                <Grid container spacing={6}>
                    <Grid item xs={12} md={6}>
                      <TransactionCategory
                        control={control}
                        index={index}
                        name={`details.${index}.category`}
                        error={errors.details?.[index]?.category}
                        onCategorySelect={handleCategorySelect(index)}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <WorkerSelect
                        control={control}
                        index={index}
                        name={`details.${index}.worker`}
                        error={errors?.details?.[index]?.worker}
                      />
                  </Grid>
                  <Grid item xs={12} sm={6} gap={3} className='flex flex-col'>
                    <Typography variant='h6'>Production Date</Typography>
                    <Controller
                      name={`details.${index}.productionDate`}
                      control={control}
                      render={({ field }) => (
                        <DatePicker 
                          label='Production date'
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
                              error: !!errors?.details?.[index]?.productionDate,
                              helperText: errors?.details?.[index]?.productionDate?.message
                            }
                          }}
                        />
                      )}
                    />
                  </Grid>
                    <Grid item xs={12} md={6}>
                    <Grid item xs={12} gap={3} className='flex flex-col'>
                          <Typography variant='h6'>Quantity Produced</Typography>
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
                category: '',
                productionDate: new Date(),
                worker: '',
              })} 
              startIcon={<i className='ri-add-line' />}
            >
              Add Another Production
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