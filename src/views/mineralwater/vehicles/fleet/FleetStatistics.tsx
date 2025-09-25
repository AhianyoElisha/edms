// React Imports
import { useRef, useEffect } from 'react'

// Third-party Imports
import type { MapRef } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

// Types Imports
import type { viewStateType } from './index'
import type { VehicleAnalyticsData } from './index'

// Style Imports
import './styles.css'
import { Grid } from '@mui/material'
import LogisticsShipmentStatistics from '../LogisticsShipmentStatistics'
import { Logistics } from '@/types/apps/ecommerceTypes'

type Props = {
  viewState: viewStateType
  carIndex: number | false
  selectedLogistics: Logistics | null
  vehicleAnalyticsData: VehicleAnalyticsData | null
  isLoadingAnalytics: boolean
}

const FleetStatistics = (props: Props) => {
  const { 
    viewState, 
    selectedLogistics, 
    vehicleAnalyticsData, 
    isLoadingAnalytics 
  } = props

  return (
    <div className='is-full bs-full'>
      <Grid container>
        <Grid item xs={12}>
          <LogisticsShipmentStatistics 
            selectedLogistics={selectedLogistics}
            vehicleAnalyticsData={vehicleAnalyticsData}
            isLoadingAnalytics={isLoadingAnalytics}
          />
        </Grid>
      </Grid>
    </div>
  )
}

export default FleetStatistics