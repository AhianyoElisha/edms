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
import { InventoryDataParams, TransactionProductDataParams } from '@/types/apps/ecommerceTypes'
import { useAuth } from '@/contexts/AppwriteProvider'
import { toast } from 'react-toastify'
import TransactionAddHeader from './TransactionAddHeader'
import TransactionInformation from './TransactionInformation'
import TransactionCategory from './TransactionCategory'
import TransactionPaymentStatus from './TransactionPaymentStatus'
import TransactionPaymentMode from './TransactionPaymentMode'
import PaymentInformation from './PaymentInformation'
import { getVehicleById } from '@/libs/actions/customer.action'
import { createDailySalesProductList } from '@/libs/actions/dailysales.actions'

const productionDetailSchema = z.object({
  quantity: z.coerce.number().min(1, { message: "Package Quantity is required" }),
  category: z.string().min(1, { message: "Product Category is required" }),
  vehicle: z.string().min(1, { message: "Vehicle is required" }),
  salesCategory: z.string().min(1, { message: "Sales Category is required" }),
  paymentStatus: z.string().min(1, { message: "Payment Status is required" }),
  salesDate: z.string().min(1, { message: "Sales Date is required" }),
  paymentMode: z.string().optional(),
  cash: z.coerce.number().optional(),
  momo: z.coerce.number().optional(),
  cheque: z.coerce.number().optional(),
  chequematurity: z.date().min(new Date(), { message: "Cheque Maturity Date is required" }),
  bank: z.coerce.number().optional(),
  paymentModeImages: z.array(z.any()).optional(),
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
  distributedProduct?: any;
}

const DailySalesDetails: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [selectedVehicles, setSelectedVehicles] = useState<VehicleData>({})
  const [paymentStatuses, setPaymentStatuses] = useState<Record<number, string>>({});
  const [paymentModes, setPaymentModes] = useState<Record<number, string>>({});
  const [selectedData, setSelectedData] = useState<Record<number, CombinedSelectionData>>({});

  const user = useAuth()
  const router = useRouter()

    const handlePaymentStatusChange = (index: number, value: string) => {
    setPaymentStatuses(prev => ({
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
  
  const { control, handleSubmit, formState: { errors }, setValue } = useForm<TransactionProductDataParams>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      details: [
        {
          quantity: 0,
          category: '',
          vehicle: '',
          salesCategory: '',
          salesDate: new Date(),
          paymentStatus: '',
          paymentMode: '',
          cash: 0,
          momo: 0,
          bank: 0,
          cheque: 0,
          chequematurity: new Date(),
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
      console.log('Distributed Products:', distributedProducts);
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

  async function onSubmit(data: TransactionProductDataParams) {
    setLoading(true);
    try {
      const res = await createDailySalesProductList(data, user.user.$id!);
      console.log('Create Daily Sales Response:', res);
      if (res.length === 0) {
        throw new Error('Failed to create sales - no response received');
      }
      toast.success('Sales made successfully');
      router.push(`/salesreport`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to process sales');
    } finally {
      setLoading(false);
    }
  }

  const onError = (errors: FieldErrors<InventoryDataParams>) => {
    console.log('Form errors:', errors);
  };

  return (
    <Card elevation={0}>
      <CardHeader title='Daily Sales Details(Sachet)' />
      <CardContent>
        <Divider component="hr" className='mb-5' />
        {fields.map((field, index) => (
          <Grid key={field.id} item xs={12} container spacing={6} mb={10} className='repeater-item'>
            <Grid item xs={12}>
              <TransactionAddHeader index={index} remove={handleRemove} />
            </Grid>
            <Grid item xs={12}>
              <Grid container spacing={6}>
                <Grid item xs={12} sm={paymentStatuses[index] !== 'credit' ? 4 : 6}>
                  <TransactionCategory
                    control={control}
                    index={index}
                    name={`details.${index}.category`}
                    error={errors.details?.[index]?.category}
                    onCategorySelect={handleCategorySelect(index)}
                  />
                </Grid>
                <Grid item xs={12} sm={ paymentStatuses[index] !== 'credit'? 4: 6}>
                  <TransactionPaymentStatus
                    control={control}
                    index={index}
                    name={`details.${index}.paymentStatus`}
                    error={errors.details?.[index]?.paymentStatus}
                    onStatusChange={(value) => handlePaymentStatusChange(index, value)}
                  />
                </Grid>
                {paymentStatuses[index] !== 'credit' && (
                  <Grid item xs={12} sm={4}>
                    <TransactionPaymentMode
                      control={control}
                      index={index}
                      name={`details.${index}.paymentMode`}
                      error={errors.details?.[index]?.paymentMode}
                      onModeChange={(value) => handlePaymentModeChange(index, value)}
                    />
                  </Grid>
                )}
                <Grid item xs={12}>
                  <TransactionInformation
                    control={control}
                    index={index}
                    names={{
                      packageQuantity: `details.${index}.quantity`,
                      vehicle: `details.${index}.vehicle`,
                      salesCategory: `details.${index}.salesCategory`,
                      salesDate: `details.${index}.salesDate`,
                    }}
                    errors={errors.details?.[index]}
                    selectedData={selectedData[index]}
                    onVehicleSelect={handleVehicleSelect(index)}
                  />
                </Grid>
                {paymentModes[index] && paymentModes[index] !== "" && paymentStatuses[index] !== 'credit' && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <PaymentInformation
                        control={control}
                        index={index}
                        names={{
                          cash: `details.${index}.cash`,
                          cheque: `details.${index}.cheque`,
                          momo: `details.${index}.momo`,
                          bank: `details.${index}.bank`,
                        }}
                        errors={errors.details?.[index]}
                        showPaymentMode={paymentModes[index]}
                      />
                    </Grid>
                  </>
                )}
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
              vehicle: '',
              salesCategory: '',
              totalPrice: 0,
              paymentStatus: '',
              salesDate: new Date(),
              paymentMode: '',
              cash: 0,
              bank: 0,
              momo: 0,
              cheque: 0,
              chequematurity: new Date(),
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
  );
};

export default DailySalesDetails;