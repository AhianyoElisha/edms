'use client'

import React, { useState } from 'react'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import { Divider } from '@mui/material'
import { z } from 'zod'
import { useForm, useFieldArray, FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Loader from '@/components/layout/shared/Loader'
import { ExpensesDataParams, InventoryDataParams, TransactionProductDataParams } from '@/types/apps/ecommerceTypes'
import { useAuth } from '@/contexts/AppwriteProvider'
import { toast } from 'react-toastify'
import TransactionAddHeader from './TransactionAddHeader'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { Control, Controller } from 'react-hook-form'
import TransactionPaymentStatus from './TransactionPaymentStatus'
import TransactionPaymentMode from './TransactionPaymentMode'
import PaymentInformation from './PaymentInformation'
import { getVehicleById } from '@/libs/actions/customer.action'
import { createDailySalesProductList, createExpenseList } from '@/libs/actions/dailysales.actions'
import TransactionVehicle from './TransactionVehicle'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { LicenseInfo } from '@mui/x-license'
import dayjs, { Dayjs } from 'dayjs'

const productionDetailSchema = z.object({
  amount: z.coerce.number().min(1, { message: "Expense amount is required" }),
  vehicle: z.string().optional(),
  description: z.string().min(1, { message: "Description is required" }),
  expenseType: z.string().min(1, { message: "Expense Type is required" }),
  expenseDate: z.string().min(1, { message: "Expense Date is required" }),
  paymentMode: z.string().min(1, { message: "Payment Mode is required" }),
  cash: z.coerce.number().optional(),
  cheque: z.coerce.number().optional(),
  bank: z.coerce.number().optional(),
});

const formSchema = z.object({
  details: z.array(productionDetailSchema).min(1, { message: "At least one expense item is required" }),
});

interface VehicleData {
  [key: number]: any; // Replace 'any' with your actual category data type
}

interface CombinedSelectionData {
  category?: any;
  vehicle?: any;
  distributedProduct?: any;
}
// Expense type
// 

const DailySalesDetails: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [selectedVehicles, setSelectedVehicles] = useState<VehicleData>({})
  const [expenseType, setExpenseType] = useState<Record<number, string>>({});
  const [paymentModes, setPaymentModes] = useState<Record<number, string>>({});
  const [selectedData, setSelectedData] = useState<Record<number, CombinedSelectionData>>({});

  const user = useAuth()
  const router = useRouter()

    const handleExpenseTypeChange = (index: number, value: string) => {
    setExpenseType(prev => ({
      ...prev,
      [index]: value
    }));
  };


  const handlePaymentModeChange = (index: number, value: string) => {
    setPaymentModes(prev => ({
      ...prev,
      [index]: value
    }));
  };
  
  const { control, handleSubmit, formState: { errors }, setValue } = useForm<ExpensesDataParams>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      details: [
        {
          amount: 0,
          vehicle: '',
          description: '',
          expenseType: '',
          expenseDate: new Date(),
          paymentMode: '',
          cash: 0,
          momo: 0,
          bank: 0,
          cheque: 0,
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

  async function onSubmit(data: ExpensesDataParams) {
    setLoading(true);
    try {
      const res = await createExpenseList(data, user.user.$id!);
      // if (!res) throw new Error();
      toast.success('Sales made successfully');
      router.push(`expenses/expensesreport`);
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
        <CardHeader title='Operations Expenses' />
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
                    <TransactionPaymentStatus
                      control={control}
                      index={index}
                      name={`details.${index}.expenseType`}
                      error={errors.details?.[index]?.expenseType}
                      onStatusChange={(value) => handleExpenseTypeChange(index, value)}
                    />
                  </Grid>
                    <Grid item xs={12} sm={6}>
                      <TransactionPaymentMode
                        control={control}
                        index={index}
                        name={`details.${index}.paymentMode`}
                        error={errors.details?.[index]?.paymentMode}
                        onModeChange={(value) => handlePaymentModeChange(index, value)}
                        />
                  </Grid>
                  <Grid item xs={12} sm={6} gap={3} className='flex flex-col'>
                    <Typography variant='h6'>Expense Date</Typography>
                    <Controller
                      name={`details.${index}.expenseDate`}
                      control={control}
                      render={({ field }) => (
                        <DatePicker 
                          label='Expense date'
                          value={field.value ? dayjs(field.value) : null}
                          onChange={(date) => {
                            // Ensure we always store as ISO string
                            const isoDate = date ? date.toISOString() : null;
                            console.log('Setting expense date:', isoDate); // For debugging
                            field.onChange(isoDate);
                          }}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              error: !!errors?.details?.[index]?.expenseDate,
                              helperText: errors?.details?.[index]?.expenseDate?.message
                            }
                          }}
                        />
                      )}
                    />
                  </Grid>
                  {expenseType[index] !== 'general' && expenseType[index] !== 'others' && (
                    <Grid item xs={12} md={6}>
                      <TransactionVehicle
                        control={control}
                        index={index}
                        name={`details.${index}.vehicle`}
                        error={!!errors?.details?.[index]?.vehicle}
                        onVehicleSelect={handleVehicleSelect(index)}
                        />
                    </Grid>
                  )}
                  <Grid item xs={12} md={6} gap={3} className='flex flex-col mb-4'>
                      <Typography variant='h6'>Expense Amount</Typography>
                        <Controller
                          name={`details.${index}.amount`}
                          control={control}
                          render={({ field }) => (
                            <TextField 
                              fullWidth 
                              label='Expense Amount' 
                              type='tel' 
                              placeholder='Enter the expense amount' 
                              {...field} 
                              error={!!errors?.details?.[index]?.amount}
                              helperText={errors?.details?.[index]?.amount?.message}
                            />
                          )}
                        />
                    </Grid>
                  </Grid>
                  <Grid item xs={12} sm={6} className='mb-4'>
                    <PaymentInformation
                      control={control}
                      index={index}
                      names={{
                        cash: `details.${index}.cash`,
                        cheque: `details.${index}.cheque`,
                        bank: `details.${index}.bank`,
                        momo: `details.${index}.momo`,
                      }}
                      errors={errors.details?.[index]}
                      showPaymentMode={paymentModes[index]}
                    />
                  </Grid>
                  <Grid item xs={12} gap={3} className='flex flex-col'>
                    <Typography variant='h6'>Reason for expense</Typography>
                    <Controller
                      name={`details.${index}.description`}
                      control={control}
                      render={({ field }) => (
                        <TextField 
                          fullWidth 
                          label='' 
                          placeholder='Enter expense Description' 
                          {...field} 
                          error={!!errors?.details?.[index]?.description}
                          helperText={errors?.details?.[index]?.description?.message}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Grid>
          ))}
          <Divider component="hr" className='my-10' />
          <Grid item xs={12} className='flex justify-end gap-4'>
            <Button 
              variant='contained' 
              onClick={() => append({
                amount: 0,
                description: '',
                vehicle: '',
                expenseType: '',
                expenseDate: new Date(),
                paymentMode: '',
                cash: 0,
                momo: 0,
                bank: 0,
                cheque: 0,
              })} 
              startIcon={<i className='ri-add-line' />}
            >
              Add Another Transaction
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