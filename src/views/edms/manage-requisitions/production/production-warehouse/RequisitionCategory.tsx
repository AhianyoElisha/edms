import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import FormHelperText from '@mui/material/FormHelperText'
import { Control, Controller, FieldError } from 'react-hook-form'
import { ProductionCategoryType } from '@/types/apps/ecommerceTypes'
import { useCallback, useEffect, useState } from 'react'
import { getProductionCategoryList } from '@/libs/actions/production.actions'

interface ProductCategoryProps {
  control: Control<any>
  index: number
  name: string
  error?: FieldError
  onCategorySelect?: (categoryData: any) => void 
}





const ProductCategory = ({ control, index, name, error }: ProductCategoryProps) => {
  const [productionData, setProductionData] = useState<ProductionCategoryType[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchInventoryData = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getProductionCategoryList(false, false)
      setProductionData(data?.productionList.documents as unknown as ProductionCategoryType[])
    } catch (error) {
      console.error('Error fetching inventory data:', error)
      setProductionData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInventoryData()
  }, [fetchInventoryData])

  return (
    <Card>
      <CardHeader title="Manufacture Category" />
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
                {productionData?.map((item) => (
                  <MenuItem key={item.$id} value={item.$id}>
                    {item.title}
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