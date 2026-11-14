import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import { Control, Controller, FieldError } from 'react-hook-form'
import { CategoryType, Logistics, ProductionCategoryType } from '@/types/apps/ecommerceTypes'
import LoaderDark from '@/components/layout/shared/LoaderDark'
import { useCallback, useEffect, useState } from 'react'
import VehicleSelect from '@/components/edms/VehicleSelect'
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
            <VehicleSelect
              vehicles={vehicleData || []}
              value={value || ''}
              label='Select Vehicle'
              loading={isLoading}
              error={!!error}
              helperText={error?.message}
              inputRef={ref}
              onChange={vehicleId => {
                onChange(vehicleId)
              }}
            />
          )}
        />
      </CardContent>
    </Card>
  )
}

export default DistributionVehicle