'use client'

import Grid from '@mui/material/Grid'
import ProductListTable from '@/views/mineralwater/production/list/ProductListTable'
import ProductCard from '@/views/mineralwater/inventory/list/ProductCard'

const ProductionListContent = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        {/* @ts-ignore */}
        <ProductCard />
      </Grid>
      <Grid item xs={12}>
        {/* @ts-ignore */}
        <ProductListTable />
      </Grid>
    </Grid>
  )
}

export default ProductionListContent