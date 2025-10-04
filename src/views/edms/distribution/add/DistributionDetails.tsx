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
import { createDistributionProductList } from '@/libs/actions/distribution.actions'
import Loader from '@/components/layout/shared/Loader'
import { DistributedProductDataParams, InventoryDataParams } from '@/types/apps/ecommerceTypes'
import { useAuth } from '@/contexts/AppwriteProvider'
import { toast } from 'react-toastify'
import DistributionStock from './DistributionStock'
import DistributionAddHeader from './DistributionAddHeader'
import DistributionInformation from './DistributionInformation'
import DistributionCategory from './DistributionCategory'
import DistributionHorizontal from './DistributionHorizontal'

const productionDetailSchema = z.object({
  packageQuantity: z.coerce.number().min(1, { message: "Package Quantity is required" }),
  productCategory: z.string().min(1, { message: "Product Category is required" }),
  distributionDate: z.string().min(1, { message: "Distribution Date is required" }),
  vehicle: z.string().min(1, { message: "Vehicle is required" }),
});

const formSchema = z.object({
  details: z.array(productionDetailSchema).min(1, { message: "At least one inventory item is required" }),
});

interface CategoryData {
  [key: number]: any; // Replace 'any' with your actual category data type
}

const DistributionDetails: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<CategoryData>({})
  const user = useAuth()
  const router = useRouter()
  
  const { control, handleSubmit, formState: { errors }, setValue } = useForm<DistributedProductDataParams>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      details: [
        {
          packageQuantity: 0,
          productCategory: '',
          distributionDate: new Date(),
          vehicle: '',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "details",
  });

  const handleCategorySelect = (index: number) => async (data: any) => {
    setSelectedCategories(prev => ({
      ...prev,
      [index]: data
    }));
  };

  const handleRemove = (index: number) => {
    // Remove the category data for this index when the field is removed
    setSelectedCategories(prev => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
    remove(index);
  };

  async function onSubmit(data: DistributedProductDataParams) {
    setLoading(true);
    try {
      const res = await createDistributionProductList(data, user.user.$id!);
      if (!res) throw new Error();
      toast.success('Product added successfully');
      router.push(`/distribution/list`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to process Manufactured Product');
      setLoading(false);
    }
  }

  const onError = (errors: FieldErrors<InventoryDataParams>) => {
    console.log('Form errors:', errors);
  };

  return (
    <Card elevation={0}>
      <CardHeader title='Distribution Product Details' />
      <CardContent>
        <Divider component="hr" className='mb-5' />
        {fields.map((field, index) => (
          <Grid key={field.id} item xs={12} container spacing={6} mb={10} className='repeater-item'>
            <Grid item xs={12}>
              <DistributionAddHeader index={index} remove={handleRemove} />
            </Grid>
            <Grid item xs={12}>
              <Grid container spacing={6}>
                <Grid item xs={12} md={6}>
                  <DistributionCategory
                    control={control}
                    index={index}
                    name={`details.${index}.productCategory`}
                    error={errors.details?.[index]?.productCategory}
                    onCategorySelect={handleCategorySelect(index)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <DistributionHorizontal selectedCategory={selectedCategories[index]} />
                </Grid>
                <Grid item xs={12}>
                  <DistributionInformation
                    control={control}
                    index={index}
                    names={{
                      packageQuantity: `details.${index}.packageQuantity`,
                      vehicle: `details.${index}.vehicle`,
                      distributionDate: `details.${index}.distributionDate`,
                    }}
                    errors={errors.details?.[index]}
                    categoryData={selectedCategories[index]}
                  />
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
              packageQuantity: 0,
              productCategory: '',
              distributionDate: new Date(),
              vehicle: '',
            })} 
            startIcon={<i className='ri-add-line' />}
          >
            Add Another Product To Distribute
          </Button>
          <Button 
            variant='contained' 
            className='bg-success' 
            onClick={handleSubmit(onSubmit, onError)} 
            startIcon={<i className='ri-save-line' />}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default DistributionDetails;