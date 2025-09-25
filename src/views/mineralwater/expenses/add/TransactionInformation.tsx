import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { Control, Controller } from 'react-hook-form'
import {  ProductionCategoryType } from '@/types/apps/ecommerceTypes'
import { useEffect } from 'react'
import TransactionVehicle from './TransactionVehicle'

interface TransactionItemErrors {
  packageQuantity?: { message?: string };
  vehicle?: { message?: string };
  salesCategory?: { message?: string };
}

interface TransactionInfoProps {
  control: Control<any>
  index: number
  names: {
    packageQuantity: string
    vehicle: string
    salesCategory: string
  }
  errors?: TransactionItemErrors
  onVehicleSelect: (vehicleData: any) => void
  selectedData: any
}

const TransactionInformation = ({ control, index, names, errors, selectedData, onVehicleSelect }: TransactionInfoProps) => {
  console.log(selectedData)
  return (
    <Card>
      <CardHeader title='Information of Transaction' />
      <CardContent>
        <Grid container spacing={5} className='mbe-5'>

        </Grid>
      </CardContent>
    </Card>
  )
}

export default TransactionInformation
