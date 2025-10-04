'use client'

import React, { useState } from 'react'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import { Divider } from '@mui/material'
import { z } from 'zod'
import { useForm, useFieldArray, Control, FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

// Component Imports
import ProductAddHeader from '@/views/edms/inventory/add/ProductAddHeader'
import ProductInformation from '@/views/edms/inventory/add/ProductInformation'
import ProductImage from '@/views/edms/inventory/add/ProductImage'
import ProductCategory from '@/views/edms/inventory/add/ProductCategory'
import { useRouter } from 'next/navigation'
import { createInventoryList } from '@/libs/actions/stores.actions'
import Loader from '@/components/layout/shared/Loader'
import { InventoryDataParams } from '@/types/apps/ecommerceTypes'
import ProductPaymentStatus from './ProductPaymentStatus'
import { useAuth } from '@/contexts/AppwriteProvider'
import { toast } from 'react-toastify'
import ProductPaymentMode from './ProductPaymentMode'
import PaymentInformation from './PaymentInformation'
import PaymentModeImage from './PaymentModeImage'

const inventoryDetailSchema = z
  .object({
    vendorName: z.string().min(1, { message: "Vendor name is required." }),
    invoiceNumber: z.string().min(1, { message: "Invoice Number is required" }),
    description: z.string().min(1, { message: "Description is required" }),
    packageQuantity: z.coerce.number().min(1, { message: "Package Quantity is required" }),
    quantityPerPackage: z.coerce.number().min(1, { message: "Quantity Per Package is required" }),
    pricePerBox: z.coerce.number().min(1, { message: "Price Per Box is required" }),
    inventoryCategory: z.string().min(1, { message: "Inventory Category is required" }),
    paymentStatus: z.string().min(1, { message: "Payment Status is required" }),
    usdRate: z.coerce.number().min(1, { message: "USD Rate is required" }),
    purchaseDate: z.string().min(1, { message: "Purchase Date is required" }),
    paymentMode: z.string().optional(),
    paymentModeCash: z.coerce.number().optional(),
    paymentModeCheque: z.coerce.number().optional(),
    paymentModeBank: z.coerce.number().optional(),
    paymentModeImages: z.array(z.any()).optional(),
  })
  .superRefine((data, ctx) => {
    // Only validate payment mode and related fields if payment status is not 'credit'
    if (data.paymentStatus !== 'credit') {
      if (!data.paymentMode) {
        ctx.addIssue({
          code: "custom",
          path: ["paymentMode"],
          message: "Payment Mode is required when not on credit",
        });
      }

      if (data.paymentMode?.includes("cash")) {
        if (!data.paymentModeCash) {
          ctx.addIssue({
            code: "custom",
            path: ["paymentModeCash"],
            message: "Cash Payment amount required.",
          });
        }
      } else if (data.paymentMode?.includes("cheque")) {
        if (!data.paymentModeCheque) {
          ctx.addIssue({
            code: "custom",
            path: ["paymentModeCheque"],
            message: "Cheque Payment amount required.",
          });
        }
      } else if (data.paymentMode?.includes("bank")) {
        if (!data.paymentModeBank) {
          ctx.addIssue({
            code: "custom",
            path: ["paymentModeBank"],
            message: "Bank Payment amount required.",
          });
        }
      }

      // Check for paymentModeImages only if payment mode is selected and not on credit
      if (data.paymentMode && ["cheque", "bank", "cash"].includes(data.paymentMode)) {
        if (!data.paymentModeImages || data.paymentModeImages.length === 0) {
          ctx.addIssue({
            code: "custom",
            path: ["paymentModeImages"],
            message: "At least one payment receipt image is required",
          });
        }
      }
    }
  });

const formSchema = z.object({
  details: z.array(inventoryDetailSchema).min(1, { message: "At least one inventory item is required" }),
});

const ProductDetails: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [paymentStatuses, setPaymentStatuses] = useState<Record<number, string>>({});
  const [paymentModes, setPaymentModes] = useState<Record<number, string>>({});
  
  
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

  
  const user = useAuth()
  console.log(user)
  const router = useRouter()
  const { control, handleSubmit, formState: { errors }, setValue } = useForm<InventoryDataParams>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      details: [
        {
          vendorName: '',
          invoiceNumber: '',
          description: '',
          packageQuantity: 0,
          quantityPerPackage: 0,
          pricePerBox: 0,
          paymentStatus: '',
          paymentMode: '',
          paymentModeCash: 0,
          paymentModeCheque: 0,
          paymentModeBank: 0,
          usdRate: 0,
          purchaseDate: new Date(),
          paymentModeImages: [],
          inventoryCategory: '',
          inventoryImages: [],
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "details",
  });


  async function onSubmit(data: InventoryDataParams) {
    setLoading(true)
    try {
      const res = await createInventoryList(data, user.user.$id!);
      if (!res) throw new Error();

      // @ts-ignore
      toast.success('Inventory added successfully')
      router.push(`/stores/list`)
      
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error? error.message : 'Failed to process inventory')
      setLoading(false)
      // Handle error (e.g., show error message)
    }

  }

  const onError = (errors: FieldErrors<InventoryDataParams>) => {
    console.log('Form errors:', errors);
  };


  const handleCategorySelect = (index: number) => async (data: any) => {
    // Update the form values for the specific index
    setValue(`details.${index}.quantityPerPackage`, data.qtyPerBox)
    setValue(`details.${index}.pricePerBox`, data.pricePerBox)
    setValue(`details.${index}.description`, data.description)
    setValue(`details.${index}.usdRate`, data.usdRate)
  }

  return (
    <Card elevation={0}>
      <CardHeader title='Inventory Details' />
      <CardContent>
        <Divider component="hr" className='mb-5' />
        {fields.map((field, index) => (
          <Grid key={field.id} item xs={12} container spacing={6} mb={10} className='repeater-item'>
            <Grid item xs={12}>
              <ProductAddHeader index={index} remove={remove} />
            </Grid>
            <Grid item xs={12} md={8}>
              <Grid container spacing={4}>
                <Grid item xs={12} sm={paymentStatuses[index] !== 'credit'? 4 : 6}>
                  <ProductCategory
                    control={control}
                    index={index}
                    name={`details.${index}.inventoryCategory`}
                    error={errors.details?.[index]?.inventoryCategory}
                    onCategorySelect={handleCategorySelect(index)}
                  />
                </Grid>
                <Grid item xs={12} sm={ paymentStatuses[index] !== 'credit'? 4: 6}>
                  <ProductPaymentStatus
                    control={control}
                    index={index}
                    name={`details.${index}.paymentStatus`}
                    error={errors.details?.[index]?.paymentStatus}
                    onStatusChange={(value) => handlePaymentStatusChange(index, value)}
                  />
                </Grid>
                {paymentStatuses[index] !== 'credit' && (
                  <Grid item xs={12} sm={4}>
                    <ProductPaymentMode
                      control={control}
                      index={index}
                      name={`details.${index}.paymentMode`}
                      error={errors.details?.[index]?.paymentMode}
                      onModeChange={(value) => handlePaymentModeChange(index, value)}
                    />
                  </Grid>
                )}
                <Grid item xs={12}>
                  <ProductInformation
                    control={control}
                    index={index}
                    names={{
                      vendorName: `details.${index}.vendorName`,
                      description: `details.${index}.description`,
                      invoiceNumber: `details.${index}.invoiceNumber`,
                      packageQuantity: `details.${index}.packageQuantity`,
                      purchaseDate: `details.${index}.purchaseDate`,
                      usdRate: `details.${index}.usdRate`,
                      quantityPerPackage: `details.${index}.quantityPerPackage`,
                      pricePerBox: `details.${index}.pricePerBox`,
                    }}
                    errors={errors.details?.[index]}
                    showPartialPayment={paymentStatuses[index] === 'partial'}
                  />
                </Grid>
                {paymentModes[index] && paymentModes[index] !== "" && paymentStatuses[index] !== 'credit' && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <PaymentModeImage
                        control={control}
                        index={index}
                        name={`details.${index}.paymentModeImages`}
                      />                  
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <PaymentInformation
                        control={control}
                        index={index}
                        names={{
                          paymentModeCash: `details.${index}.paymentModeCash`,
                          paymentModeCheque: `details.${index}.paymentModeCheque`,
                          paymentModeBank: `details.${index}.paymentModeBank`,
                        }}
                        showPaymentMode={paymentModes[index]}
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            </Grid>
            <Grid item xs={12} md={4}>
              <Grid container spacing={6}>
                <Grid item xs={12}>
                  <ProductImage
                    control={control}
                    index={index}
                    name={`details.${index}.inventoryImages`}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        ))}
        <Divider component="hr" className='my-10' />
        <Grid item xs={12} className='flex justify-end gap-4'>
          <Button variant='contained' onClick={() => append({
            vendorName: '',
            invoiceNumber: '',
            description: '',
            packageQuantity: 0,
            quantityPerPackage: 0,
            paymentStatus: '',
            paymentMode: '',
            pricePerBox: 0,
            partialPayment: 0,
            inventoryCategory: '',
            inventoryImages: [],
            paymentModeCash: 0,
            paymentModeCheque: 0,
            paymentModeBank: 0,
            paymentModeImages: [],
            usdRate: 0,
            purchaseDate: new Date()
          })} startIcon={<i className='ri-add-line' />}>
            Add Another Inventory Item
          </Button>
          <Button variant='contained' color='success' onClick={handleSubmit(onSubmit, onError)} disabled={loading}  startIcon={<i className='ri-save-line' />}>
            {loading? 'Saving...' : 'Save'}
          </Button>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default ProductDetails