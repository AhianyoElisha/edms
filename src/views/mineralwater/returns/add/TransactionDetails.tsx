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
import { InventoryDataParams, ReturnProductDataParams, TransactionProductDataParams } from '@/types/apps/ecommerceTypes'
import { useAuth } from '@/contexts/AppwriteProvider'
import { toast } from 'react-toastify'
import TransactionAddHeader from './TransactionAddHeader'
import TransactionCategory from './TransactionCategory'
import { createOfficeSalesProductList, createReturnedProductList } from '@/libs/actions/dailysales.actions'
import TransactionHorizontal from './TransactionHorizontal'
import { Control, Controller } from 'react-hook-form'
import TextField from '@mui/material/TextField'
import TransactionVehicle from './TransactionVehicle'
import { getVehicleById } from '@/libs/actions/customer.action'
import { DatePicker } from '@mui/x-date-pickers-pro'
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers-pro'
import { LicenseInfo } from '@mui/x-license'
import dayjs, { Dayjs } from 'dayjs'

LicenseInfo.setLicenseKey('e0d9bb8070ce0054c9d9ecb6e82cb58fTz0wLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxLVj0y');


const productionDetailSchema = z.object({
  quantity: z.coerce.number().min(1, { message: "Package Quantity is required" }),
  category: z.string().min(1, { message: "Product Category is required" }),
  vehicle: z.string().min(1, { message: "Vehicle is required" }),    
  returnDate: z.string().min(1, { message: "Return Date is required" }),
});

const formSchema = z.object({
  details: z.array(productionDetailSchema).min(1, { message: "At least one inventory item is required" }),
});

interface VehicleData {
  [key: number]: any; // Replace 'any' with your actual category data type
}

interface CombinedSelectionData {
  category?: any;
  vehicle?: any;
}

const DailySalesDetails: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [selectedData, setSelectedData] = useState<Record<number, CombinedSelectionData>>({});

  const user = useAuth()
  const router = useRouter()
  
  const { control, handleSubmit, formState: { errors }, setValue } = useForm<ReturnProductDataParams>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      details: [
        {
          quantity: 0,
          category: '',
          vehicle: '',
          returnDate: new Date(),
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
    
    // If we have both category and vehicle, fetch distributed product
    if (selectedData[index]?.vehicle) {
      await fetchDistributedProduct(index, categoryData.$id, selectedData[index].vehicle.$id);
    }
  };

  const handleVehicleSelect = (index: number) => async (vehicleData: any) => {
    setSelectedData(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        vehicle: vehicleData
      }
    }));
    
    // If we have both category and vehicle, fetch distributed product
    if (selectedData[index]?.category) {
      await fetchDistributedProduct(index, selectedData[index].category.$id, vehicleData.$id);
    }
  };

  const fetchDistributedProduct = async (index: number, categoryId: string, vehicleId: string) => {
    try {
      const vehicle = await getVehicleById(vehicleId);
      const distributedProducts = vehicle?.distributedproducts;
      
      // Find the distributed product that matches the category
      const matchingProduct = distributedProducts.find((product: any) => 
        product.category === categoryId
      );

      setSelectedData(prev => ({
        ...prev,
        [index]: {
          ...prev[index],
          distributedProduct: matchingProduct
        }
      }));
    } catch (error) {
      console.error('Error fetching distributed product:', error);
    }
  };


  const handleRemove = (index: number) => {
    setSelectedData(prev => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
    remove(index);
  };

  async function onSubmit(data: ReturnProductDataParams) {
    setLoading(true);
    try {
      const res = await createReturnedProductList(data, user.user.$id!);
      toast.success('Products returned successfully');
      router.push(`/returns/returnsreport`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to process sales');
      setLoading(false);
    }
  }

  const onError = (errors: FieldErrors<InventoryDataParams>) => {
    console.log('Form errors:', errors);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Card elevation={0}>
        <CardHeader title='Goods Returned' />
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
                    <TransactionVehicle
                      control={control}
                      index={index}
                      name={`details.${index}.vehicle`}
                      error={!!errors?.details?.[index]?.vehicle}
                      onVehicleSelect={handleVehicleSelect(index)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant='h6' className='mb-2'>Return Date</Typography>
                    <Controller
                      name={`details.${index}.returnDate`}
                      control={control}
                      render={({ field }) => (
                        <DatePicker 
                          label='Return date'
                          value={field.value ? dayjs(field.value) : null}
                          onChange={(date) => {
                            // Ensure we always store as ISO string
                            const isoDate = date ? date.toISOString() : null;
                            console.log('Setting return date:', isoDate); // For debugging
                            field.onChange(isoDate);
                          }}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              error: !!errors?.details?.[index]?.returnDate,
                              helperText: errors?.details?.[index]?.returnDate?.message
                            }
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TransactionHorizontal selectedData={selectedData[index]} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Grid item xs={12} gap={3} className='flex flex-col'>
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
                returnDate: new Date(),
                vehicle: '',
              })} 
              startIcon={<i className='ri-add-line' />}
            >
              Add Return Item
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

