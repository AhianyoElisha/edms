import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import FormHelperText from '@mui/material/FormHelperText'
import { Control, Controller, FieldError } from 'react-hook-form'
import { CategoryType } from '@/types/apps/ecommerceTypes'
import LoaderDark from '@/components/layout/shared/LoaderDark'
import { useCallback, useEffect, useState } from 'react'
import { getInventoryCategoryById, getInventoryCategoryList } from '@/libs/actions/stores.actions'
import { Autocomplete, TextField, Typography } from '@mui/material'

interface ProductCategoryProps {
  control: Control<any>
  index: number
  name: string
  error?: FieldError
  onCategorySelect?: (categoryData: any) => void 
}





const ProductCategory = ({ control, index, name, error, onCategorySelect }: ProductCategoryProps) => {
  const [inventoryData, setInventoryData] = useState<CategoryType[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchInventoryData = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getInventoryCategoryList(false, false)
      setInventoryData(data?.inventoryList.documents as unknown as CategoryType[])
    } catch (error) {
      console.error('Error fetching inventory data:', error)
      setInventoryData([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInventoryData()
  }, [fetchInventoryData])


    const handleCategoryChange = async (categoryId: string) => {
    if (categoryId) {
      try {
        const categoryDetails = await getInventoryCategoryById(categoryId)
        if (onCategorySelect) {
          onCategorySelect(categoryDetails)
        }
      } catch (error) {
        console.error('Error fetching category details:', error)
      }
    }
  }

  return (
    <Card>
      <CardHeader title="Inventory Category" />
      <CardContent>
        <Controller
          name={name}
          control={control}
          render={({ field: { onChange, value } }) => (
            <Autocomplete
              id="category-select"
              options={inventoryData || []}
              getOptionLabel={(option) => option.categoryTitle}
              isOptionEqualToValue={(option, value) => 
              option.$id === value?.$id
              }
              value={inventoryData?.find(category => category.$id === value) || null}
              onChange={(_, newValue) => {
                onChange(newValue?.$id || '')
                handleCategoryChange(newValue?.$id || '')
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Category"
                  error={!!error}
                  fullWidth
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <div className="flex flex-col">
                    <Typography variant="body1">{option.categoryTitle}</Typography>
                  </div>
                </li>
              )}
              loading={isLoading}
              loadingText="Loading categories..."
              noOptionsText="No available category found"
            />
          )}
        />
      </CardContent>
    </Card>
  )
}

export default ProductCategory