// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import VehicleDetailHeader from './DistributedProductsDetailHeader'
import DistributedProductsCard from './DistributedProductsDetailsCard'
import SalesActivity from './SalesActivity'
import AssignedStaff from './AssignedStaff'
import EndRouteAddress from './EndRouteAddress'
import StartRouteAddress from './StartRouteAddress'
import { Breadcrumbs } from '@mui/material'
import StyledBreadcrumb from '@/components/layout/shared/Breadcrumbs'
import { useRouter } from 'next/navigation'

const VehicleDetails = ({ vehicleData, vehicleId }: { vehicleData?: any; vehicleId: string }) => {
  const router = useRouter()
  
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <VehicleDetailHeader vehicleData={vehicleData} vehicleId={vehicleId} />
      </Grid>
      <Grid item xs={12}>
        <div role="presentation">
          <Breadcrumbs aria-label="breadcrumb">
            <StyledBreadcrumb 
              component="a"
              onClick={() => router.back()}
              icon={<i className='ri-menu-4-line' />}
              className='cursor-pointer'
              label="Back" 
            />
            <StyledBreadcrumb
              label="Details"
              icon={<i className='ri-stack-line' />}
              className='cursor-pointer'
              disabled
            />
          </Breadcrumbs>
        </div>
      </Grid>
      <Grid item xs={12} md={8}>
        <Grid container spacing={6}>
          <Grid item xs={12}>
            <DistributedProductsCard vehicleData={vehicleData} />
          </Grid>
          <Grid item xs={12}>
            <SalesActivity vehicleId={vehicleId} soldproducts={vehicleData?.soldproducts || []} />
          </Grid>
        </Grid>
      </Grid>
      <Grid item xs={12} md={4}>
        <Grid container spacing={6}>
          <Grid item xs={12}>
            <AssignedStaff vehicleData={vehicleData} />
          </Grid>
          <Grid item xs={12}>
            <EndRouteAddress vehicleData={vehicleData} />
          </Grid>
          <Grid item xs={12}>
            <StartRouteAddress vehicleData={vehicleData} />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  )
}

export default VehicleDetails