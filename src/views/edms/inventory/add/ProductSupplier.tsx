import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import FormHelperText from '@mui/material/FormHelperText'
import { Control, Controller, FieldError } from 'react-hook-form'
import { Supplier } from '@/types/apps/ecommerceTypes'
import { useCallback, useEffect, useState } from 'react'
import { getSupplierList, getSupplierById } from '@/libs/actions/customer.action'
import { Autocomplete, TextField, Typography } from '@mui/material'
interface ProductSupplierProps {
  control: Control<any>
  index: number
  name: string
  error?: any
}





const ProductSupplier = ({ control, index, name, error }: ProductSupplierProps) => {
  const [supplierData, setSupplierData] = useState<Supplier[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchSupplierData = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getSupplierList()
      setSupplierData(data?.documents as unknown as Supplier[])
    } catch (error) {
      console.error('Error fetching supplier data:', error)
      setSupplierData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSupplierData()
  }, [fetchSupplierData])


  //   const handleSupplierChange = async (supplierId: string) => {
  //   if (supplierId) {
  //     try {
  //       const supplierDetails = await getSupplierById(supplierId)
  //       if (onSupplierSelect) {
  //         onSupplierSelect(supplierDetails)
  //       }
  //     } catch (error) {
  //       console.error('Error fetching supplier details:', error)
  //     }
  //   }
  // }

  return (
    <Card>
      <CardHeader title="Inventory Supplier" />
      <CardContent>
        <Controller
          name={name}
          control={control}
          render={({ field: { onChange, value } }) => (
            <Autocomplete
              id="supplier-select"
              options={supplierData || []}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => 
              option.$id === value?.$id
              }
              value={supplierData?.find(supplier => supplier.$id === value) || null}
              onChange={(_, newValue) => {
                onChange(newValue?.name || '')
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Product Supplier"
                  error={!!error}
                  fullWidth
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <div className="flex flex-col">
                    <Typography variant="body1">{option.name}</Typography>
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

export default ProductSupplier