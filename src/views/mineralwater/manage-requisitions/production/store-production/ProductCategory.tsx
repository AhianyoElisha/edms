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

interface ProductCategoryProps {
  control: Control<any>
  index: number
  name: string
  error?: FieldError
  onCategorySelect?: (categoryData: any) => void 
}





const ProductCategory = ({ control, index, name, error }: ProductCategoryProps) => {
  const [inventoryData, setInventoryData] = useState<CategoryType[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchInventoryData = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getInventoryCategoryList(false, false)
      setInventoryData(data?.inventoryList.documents as unknown as CategoryType[])
    } catch (error) {
      console.error('Error fetching inventory data:', error)
      setInventoryData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInventoryData()
  }, [fetchInventoryData])

  return (
    <Card>
      <CardHeader title="Inventory Category" />
      <CardContent>
        <Controller
          name={name}
          control={control}
          defaultValue=""
          render={({ field: { onChange, value, ref } }) => (
            <FormControl fullWidth error={!!error}>
              <InputLabel id="category-label">Select Category</InputLabel>
              <Select
                labelId="category-label"
                id="category-select"
                label="Select Category"
                value={value}
                inputRef={ref}
                onChange={(e: SelectChangeEvent) => {
                  onChange(e.target.value)
                }}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {inventoryData?.map((item) => (
                  <MenuItem key={item.$id} value={item.$id}>
                    {item.categoryTitle}
                  </MenuItem>
                ))}
              </Select>
              {error && <FormHelperText>{error.message}</FormHelperText>}
            </FormControl>
          )}
        />
      </CardContent>
    </Card>
  )
}

export default ProductCategory