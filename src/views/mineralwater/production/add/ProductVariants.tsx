'use client'

import { useState } from 'react'
import type { SyntheticEvent } from 'react'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import CustomIconButton from '@core/components/mui/IconButton'

interface Variant {
  type: string
  value: string
}

const ProductVariants = () => {
  const [variants, setVariants] = useState<Variant[]>([{ type: 'Size', value: '' }])

  const addVariant = () => {
    setVariants([...variants, { type: 'Size', value: '' }])
  }

  const deleteVariant = (index: number) => {
    const newVariants = variants.filter((_, i) => i !== index)
    setVariants(newVariants)
  }

  const handleTypeChange = (index: number, newType: string) => {
    const newVariants = [...variants]
    newVariants[index].type = newType
    setVariants(newVariants)
  }

  const handleValueChange = (index: number, newValue: string) => {
    const newVariants = [...variants]
    newVariants[index].value = newValue
    setVariants(newVariants)
  }

  const logVariants = () => {
    console.log(variants)
  }

  return (
    <Card>
      <CardHeader title='Variants' />
      <CardContent>
        <Grid container spacing={6}>
          {variants.map((variant, index) => (
            <Grid key={index} item xs={12} className='repeater-item'>
              <Grid container spacing={6}>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Select Variant</InputLabel>
                    <Select
                      label='Select Variant'
                      value={variant.type}
                      onChange={(e) => handleTypeChange(index, e.target.value)}
                    >
                      <MenuItem value='Size'>Size</MenuItem>
                      <MenuItem value='Color'>Color</MenuItem>
                      <MenuItem value='Weight'>Weight</MenuItem>
                      <MenuItem value='Smell'>Smell</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={8}>
                  <div className='flex items-center gap-6'>
                    <TextField
                      fullWidth
                      label='Variant Value'
                      placeholder='Enter Variant Value'
                      value={variant.value}
                      onChange={(e) => handleValueChange(index, e.target.value)}
                    />
                    <CustomIconButton onClick={() => deleteVariant(index)} className='min-is-fit'>
                      <i className='ri-close-line' />
                    </CustomIconButton>
                  </div>
                </Grid>
              </Grid>
            </Grid>
          ))}
          <Grid item xs={12}>
            <Button variant='contained' onClick={addVariant} startIcon={<i className='ri-add-line' />}>
              Add Another Option
            </Button>
            <Button variant='contained' onClick={logVariants} style={{ marginLeft: '10px' }}>
              Log Variants
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default ProductVariants