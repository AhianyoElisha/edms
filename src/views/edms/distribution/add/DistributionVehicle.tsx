import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import FormHelperText from '@mui/material/FormHelperText'
import { Control, Controller, FieldError } from 'react-hook-form'
import { CategoryType, Logistics, ProductionCategoryType } from '@/types/apps/ecommerceTypes'
import LoaderDark from '@/components/layout/shared/LoaderDark'
import { useCallback, useEffect, useState } from 'react'
import { getLogisticsDetailsById, getLogisticsList } from '@/libs/actions/customer.action'

interface ProductVehicleProps {
  control: Control<any>
  index: number
  name: string
  error?: any
  onVehicleSelect?: (categoryData: any) => void 
}





const DistributionVehicle = ({ control, index, name, error, onVehicleSelect }: ProductVehicleProps) => {
  const [vehicleData, setVehicleData] = useState<Logistics[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchVehicleData = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getLogisticsList()
      setVehicleData(data?.rows as unknown as Logistics[])
    } catch (error) {
      console.error('Error fetching inventory data:', error)
      setVehicleData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVehicleData()
  }, [fetchVehicleData])


    const handleCategoryChange = async (categoryId: string) => {
    if (categoryId) {
      try {
        const vehicleDetails = await getLogisticsDetailsById(categoryId)
        if (onVehicleSelect) {
          onVehicleSelect(vehicleDetails)
        }
      } catch (error) {
        console.error('Error fetching vehicle details:', error)
      }
    }
  }

  return (
    <Card>
      <CardHeader title="Manufactured Products Category" />
      <CardContent>
        <Controller
          name={name}
          control={control}
          defaultValue=""
          render={({ field: { onChange, value, ref } }) => (
            <FormControl fullWidth error={!!error}>
              <InputLabel id="category-label">Select Vehicle</InputLabel>
              <Select
                labelId="category-label"
                id="category-select"
                label="Select Vehicle"
                value={value}
                onChange={(e: SelectChangeEvent) => {
                  onChange(e.target.value)
                }}
                inputRef={ref}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {vehicleData?.map((item) => (
                  <MenuItem key={item.$id} value={item.$id}>
                    {item.vehicleType === 'truck' ? <i className="ri-truck-line text-[14px]"></i> : <i className="ri-e-bike-line text-[14px]"></i> } {item.vehicleNumber}
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

export default DistributionVehicle