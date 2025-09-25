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
import ProductAddHeader from '@/views/mineralwater/manage-requisitions/production/production-warehouse/ProductAddHeader'
import ProductInformation from '@/views/mineralwater/manage-requisitions/production/production-warehouse/ProductInformation'
import ProductCategory from '@/views/mineralwater/manage-requisitions/production/production-warehouse/RequisitionCategory'
import { useRouter } from 'next/navigation'
import { createInventoryList, makeStoreRequisitionList } from '@/libs/actions/stores.actions'
import Loader from '@/components/layout/shared/Loader'
import { ProductionRequisitionDataParams, RequisitionDataParams } from '@/types/apps/ecommerceTypes'
import { useAuth } from '@/contexts/AppwriteProvider'
import { toast } from 'react-toastify'
import { makeProductionRequisitionList } from '@/libs/actions/warehouse.actions'


interface ProductionToWarehouseRequisitionDetailsProps {
  onSuccessfulSubmit: () => void;
}

const productionDetailSchema = z
  .object({
    noOfBoxes: z.coerce.number().min(1, { message: "Package quantity is required" }),
    inventoryCategory: z.string().min(1, { message: "Inventory category is required" }),
  })



const formSchema = z.object({
  details: z.array(productionDetailSchema).min(1, { message: "At least one inventory requisition item is required" }),
});

const ProductionToWarehouseRequisitionDetails = ({ onSuccessfulSubmit }: ProductionToWarehouseRequisitionDetailsProps) => {
  const [loading, setLoading] = useState(false)
  

  
  const user = useAuth()
  console.log(user)
  const router = useRouter()
  const { control, handleSubmit, formState: { errors }, setValue, reset } = useForm<ProductionRequisitionDataParams>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      details: [
        {
          noOfBoxes: 0,
          productionCategory: '',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "details",
  });


  async function onSubmit(data: ProductionRequisitionDataParams) {
    setLoading(true)
    try {
      const res = await makeProductionRequisitionList(data, user.user.$id!);
      toast.success('Requisition made successfully')
      reset({
        details: [
          {
            noOfBoxes: 0,
            productionCategory: '',
          },
        ],
      });
      onSuccessfulSubmit()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error? error.message : 'Failed to process inventory')
      setLoading(false)
      // Handle error (e.g., show error message)
    } finally {
      setLoading(false)
    }


  }

  const onError = (errors: FieldErrors<RequisitionDataParams>) => {
    console.log('Form errors:', errors);
  };

  return (
    <Card elevation={0}>
      <CardHeader
        title='Manufactured Products Requisition Details'
      />
      <CardContent>
        {fields.map((field, index) => (
          <>
          <Divider component="hr" className='mb-5' />
            <Grid key={field.id} item xs={12} container spacing={6} mb={10} className='repeater-item'>
              <Grid item xs={12}>
                <ProductAddHeader index={index} remove={remove} />
              </Grid>
              <Grid item xs={12} md={8}>
                <Grid container spacing={4}>
                  <Grid item xs={12} sm={6}>
                    <ProductCategory
                      control={control}
                      index={index}
                      name={`details.${index}.inventoryCategory`}
                      error={errors.details?.[index]?.productionCategory}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <ProductInformation
                      control={control}
                      index={index}
                      names={{
                        noOfBoxes: `details.${index}.noOfBoxes`,
                      }}
                      errors={errors.details?.[index]}
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </>
        ))}
        <Divider component="hr" className='my-10' />
        <Grid item xs={12} className='flex justify-end gap-4'>
          <Button variant='contained' onClick={() => append({
            noOfBoxes: 0,
            productionCategory: '',
          })} startIcon={<i className='ri-add-line' />}>
            Add Another Production Requisition Item
          </Button>
          <Button variant='contained' color='success' onClick={handleSubmit(onSubmit, onError)} disabled={loading}  startIcon={<i className='ri-save-line' />}>
            {loading? 'Saving...' : 'Save'}
          </Button>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default ProductionToWarehouseRequisitionDetails