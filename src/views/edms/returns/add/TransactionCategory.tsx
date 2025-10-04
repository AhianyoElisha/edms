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
import { getProductionCategoryItemById, getProductionCategoryList } from '@/libs/actions/production.actions'
import { Grid, Typography } from '@mui/material'

interface ProductCategoryProps {
  control: Control<any>
  index: number
  name: string
  error?: FieldError
  onCategorySelect: (categoryData: any) => void 
}





const TransactionCategory = ({ control, index, name, error, onCategorySelect }: ProductCategoryProps) => {
  const [productionData, setProductionData] = useState<ProductionCategoryType[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchProductionData = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getProductionCategoryList(false, false)
      setProductionData(data?.productionList.documents as unknown as ProductionCategoryType[])
    } catch (error) {
      console.error('Error fetching products data:', error)
      setProductionData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProductionData()
  }, [fetchProductionData])


  const handleCategoryChange = async (categoryId: string) => {
    if (categoryId) {
      try {
        const categoryDetails = await getProductionCategoryItemById(categoryId)
        if (categoryDetails) {
          onCategorySelect(categoryDetails)
        }
      } catch (error) {
        console.error('Error fetching category details:', error)
      }
    }
  }

  return (
    <Grid item xs={12} gap={3} className='flex flex-col'>
      <Typography variant="h6">Returned Products Category</Typography>
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
              onChange={(e: SelectChangeEvent) => {
                onChange(e.target.value)
                handleCategoryChange(e.target.value)
              }}
              inputRef={ref}
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
    </Grid>
  )
}

export default TransactionCategory