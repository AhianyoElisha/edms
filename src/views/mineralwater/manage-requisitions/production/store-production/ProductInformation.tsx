import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import { Control, Controller } from 'react-hook-form'
import { CategoryType } from '@/types/apps/ecommerceTypes'


interface InventoryItemErrors {
  noOfBoxes?: { message?: string };
}

interface ProductInfoProps {
  control: Control<any>
  index: number
  names: {
    noOfBoxes: string
  }
  errors?: InventoryItemErrors
  categoryData?: CategoryType
}

const ProductInformation = ({ control, names, errors }: ProductInfoProps, ) => {

    // Use useEffect to update form values when categoryData changes
  return (
    <Card>
      <CardHeader title='Quantity of Requisition Item' />
      <CardContent>
        <Grid container spacing={5}>
          <Grid item xs={12}>
            <Controller
              name={names.noOfBoxes}
              control={control}
              render={({ field }) => (
                <TextField 
                  fullWidth 
                  label='Number of Packages' 
                  type='tel' 
                  placeholder='Enter the number of packages' 
                  {...field} 
                  error={!!errors?.noOfBoxes?.message}
                  helperText={errors?.noOfBoxes?.message}
                />
              )}
            />
          </Grid>
        </Grid> 
      </CardContent>
    </Card>
  )
}

export default ProductInformation