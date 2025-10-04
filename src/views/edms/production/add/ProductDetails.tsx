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
import ProductAddHeader from '@/views/edms/production/add/ProductAddHeader'
import ProductInformation from '@/views/edms/production/add/ProductInformation'
import ProductImage from '@/views/edms/production/add/ProductImage'
import ProductCategory from '@/views/edms/production/add/ProductCategory'
import { useRouter } from 'next/navigation'
import { createManufacturedProductList } from '@/libs/actions/production.actions'
import Loader from '@/components/layout/shared/Loader'
import { InventoryDataParams, ManufacturedProductDataParams } from '@/types/apps/ecommerceTypes'
import ProductPaymentStatus from './ProductPaymentStatus'
import { useAuth } from '@/contexts/AppwriteProvider'
import { toast } from 'react-toastify'

const productionDetailSchema = z.object({
  description: z.string().min(1, { message: "Description is required" }),
  manufactureDate: z.string().min(1, { message: "Manufacture Date is required" }),
  packageQuantity: z.coerce.number().min(1, { message: "Package Quantity is required" }),
  qtyPerPackage: z.coerce.number().min(1, { message: "Quantity Per Package is required" }),
  pricePerBox: z.coerce.number().min(1, { message: "Price Per Box is required" }),
  productCategory: z.string().min(1, { message: "Product Category is required" }),
  batchNumber: z.string().optional(),
});

const formSchema = z.object({
  details: z.array(productionDetailSchema).min(1, { message: "At least one inventory item is required" }),
});

const ProductDetails: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const user = useAuth()
  const router = useRouter()
  const { control, handleSubmit, formState: { errors }, setValue } = useForm<ManufacturedProductDataParams>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      details: [
        {
          description: '',
          packageQuantity: 0,
          qtyPerPackage: 0,
          pricePerBox: 0,
          manufactureDate: new Date(),
          batchNumber: '',
          productCategory: '',
          productImages: [],
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "details",
  });


  async function onSubmit(data: ManufacturedProductDataParams) {
    console.log('Form data:', data);
    setLoading(true)
    try {
      const res = await createManufacturedProductList(data, user.user.$id!);
      if (!res) throw new Error()
      toast.success('Product added successfully')
        router.push(`/production/list`)
      
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error? error.message : 'Failed to process Manufactured Product')
      setLoading(false)
      // Handle error (e.g., show error message)
    }

  }

  const onError = (errors: FieldErrors<InventoryDataParams>) => {
    console.log('Form errors:', errors);
  };


  const handleCategorySelect = (index: number) => async (data: any) => {
    // Update the form values for the specific index
    setValue(`details.${index}.qtyPerPackage`, data.qtyPerPackage)
    setValue(`details.${index}.pricePerBox`, data.pricePerBox)
    setValue(`details.${index}.description`, data.description)
  }

  return (
    <Card elevation={0}>
      <CardHeader
        title='Manufactured Product Details'
        // action={
        //   <Button variant='contained' onClick={handleSubmit(onSubmit, onError)}  startIcon={<i className='ri-check-circle' />}>
        //     {loading? (<div className=' px-12'><Loader /></div>) : 'Save'}
        //   </Button>
        // }
      />
      <CardContent>
        <Divider component="hr" className='mb-5' />
        {fields.map((field, index) => (
          <Grid key={field.id} item xs={12} container spacing={6} mb={10} className='repeater-item'>
            <Grid item xs={12}>
              <ProductAddHeader index={index} remove={remove} />
            </Grid>
            <Grid item xs={12} md={8}>
              <Grid container spacing={6}>
                <Grid item xs={12}>
                  <ProductCategory
                    control={control}
                    index={index}
                    name={`details.${index}.productCategory`}
                    error={errors.details?.[index]?.productCategory}
                    onCategorySelect={handleCategorySelect(index)}
                  />
                </Grid>
                {/* <Grid item xs={12} sm={6}>
                  <ProductPaymentStatus
                    control={control}
                    index={index}
                    name={`details.${index}.paymentStatus`}
                    error={errors.details?.[index]?.paymentStatus}
                  />
                </Grid> */}
                <Grid item xs={12}>
                  <ProductInformation
                    control={control}
                    index={index}
                    names={{
                      batchNumber: `details.${index}.batchNumber`,
                      description: `details.${index}.description`,
                      packageQuantity: `details.${index}.packageQuantity`,
                      qtyPerPackage: `details.${index}.qtyPerPackage`,
                      pricePerBox: `details.${index}.pricePerBox`,
                      manufactureDate: `details.${index}.manufactureDate`,
                    }}
                    errors={errors.details?.[index]}
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12} md={4}>
              <Grid container spacing={6}>
                <Grid item xs={12}>
                  <ProductImage
                    control={control}
                    index={index}
                    name={`details.${index}.productImages`}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        ))}
        <Divider component="hr" className='my-10' />
        <Grid item xs={12} className='flex justify-end gap-4'>
          <Button variant='contained' onClick={() => append({
            description: '',
            packageQuantity: 0,
            qtyPerPackage: 0,
            pricePerBox: 0,
            productCategory: '',
            manufactureDate: new Date(),
            productImages: [],
          })} startIcon={<i className='ri-add-line' />}>
            Add Another Inventory Item
          </Button>
          <Button variant='contained' className='bg-success' disabled={loading} onClick={handleSubmit(onSubmit, onError)}  startIcon={<i className='ri-save-line' />}>
            {loading? 'Saving...' : 'Save'}
          </Button>

        </Grid>
      </CardContent>
    </Card>
  )
}

export default ProductDetails