import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import FormHelperText from '@mui/material/FormHelperText'
import { Control, Controller, FieldError } from 'react-hook-form'
import { CategoryType, MachineryCategoryType } from '@/types/apps/ecommerceTypes'
import LoaderDark from '@/components/layout/shared/LoaderDark'
import { useCallback, useEffect, useState } from 'react'
import { getMachineryCategoryById, getMachineryCategoryList } from '@/libs/actions/machinery.actions'
import { Autocomplete, TextField, Typography } from '@mui/material'

interface ProductCategoryProps {
  control: Control<any>
  index: number
  name: string
  error?: FieldError
  onCategorySelect?: (categoryData: any) => void 
}





const ProductCategory = ({ control, index, name, error, onCategorySelect }: ProductCategoryProps) => {
  const [machineryData, setMachineryData] = useState<MachineryCategoryType[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchMachineryData = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getMachineryCategoryList(false, false)
      setMachineryData(data?.machineryList.documents as unknown as MachineryCategoryType[])
    } catch (error) {
      console.error('Error fetching machinery data:', error)
      setMachineryData([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMachineryData()
  }, [fetchMachineryData])


    const handleCategoryChange = async (categoryId: string) => {
    if (categoryId) {
      try {
        const categoryDetails = await getMachineryCategoryById(categoryId)
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
      <CardHeader title="Machinery Category" />
      <CardContent>
        <Controller
          name={name}
          control={control}
          render={({ field: { onChange, value } }) => (
            <Autocomplete
              id="category-select"
              options={machineryData || []}
              getOptionLabel={(option) => option.categoryTitle}
              isOptionEqualToValue={(option, value) => 
              option.$id === value?.$id
              }
              value={machineryData?.find(category => category.$id === value)}
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