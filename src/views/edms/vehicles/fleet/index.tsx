'use client'

import { useState, useEffect, useCallback } from 'react'
import Backdrop from '@mui/material/Backdrop'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { Theme } from '@mui/material/styles'
import classNames from 'classnames'
import CustomIconButton from '@core/components/mui/IconButton'
import FleetSidebar from './FleetSidebar'
import FleetStatistics from './FleetStatistics'
import TopReferralSources from './TopReferralSources'
import { Grid } from '@mui/material'
import { useSettings } from '@core/hooks/useSettings'
import { Logistics, LogisticsType, Users } from '@/types/apps/ecommerceTypes'
import { getLogisticsList } from '@/libs/actions/customer.action'
import { getAllMonthsLogisticsToExpenseEstimate } from '@/libs/actions/dashboard.actions' // Adjust import path as needed
import { toast } from 'react-toastify'

export type viewStateType = {
  driver: LogisticsType['driver'] | null
  // distribution: LogisticsType['distribution'] | null
}

// Type for the analytics data returned from getAllMonthsLogisticsToExpenseEstimate
export type VehicleAnalyticsData = {
  vehicleId: string
  vehicleName: string
  months: Array<{
    monthIndex: number
    monthName: string
    salesTotal: number
    expenseTotal: number
    salesPackages: number
    salesCount: number
    expenseCount: number
    salesToExpenseRatio: string
    profitLoss: number
    daysInMonth: number
    salesData: number[]
    expenseData: number[]
    dayLabels: number[]
    weeklyBreakdown: Array<{
      weekNumber: number
      weekRange: string
      weeklySales: number
      weeklyExpenses: number
      weeklyRatio: string
      weeklyProfit: number
    }>
    hasData: boolean
  }>
  overallSalesTotal: number
  overallExpenseTotal: number
  overallSalesPackages: number
  overallSalesCount: number
  overallExpenseCount: number
  overallSalesToExpenseRatio: string
  overallProfitLoss: number
  year: number
  monthlySalesChart: number[]
  monthlyExpenseChart: number[]
  monthlyProfitChart: number[]
  monthlyRatioChart: number[]
  monthLabels: string[]
  activeMonths: number
}

const Fleet = () => {
  // States
  const [backdropOpen, setBackdropOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expanded, setExpanded] = useState<number | false>(0)
  const [selectedLogistics, setSelectedLogistics] = useState<Logistics | null>(null)
  const [logisticsData, setLogisticsData] = useState<Logistics[]>([])
  const [vehicleAnalyticsData, setVehicleAnalyticsData] = useState<VehicleAnalyticsData | null>(null)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)

  const [viewState, setViewState] = useState<viewStateType>({
    driver: null,
    // distribution: null,
  })

  const fetchLogisticsData = useCallback(async () => {
    try {
      const response = await getLogisticsList()
      const logisticsData = response?.rows as unknown as Logistics[]
      setLogisticsData(logisticsData)
    } catch (error) {
      console.error('Error fetching logistics data:', error)
      toast.error('Failed to fetch logistics data')
    }
  }, [])

  // Function to fetch vehicle analytics data
  const fetchVehicleAnalytics = useCallback(async (vehicleId: string) => {
    if (!vehicleId) return

    setIsLoadingAnalytics(true)
    try {
      const analyticsData = await getAllMonthsLogisticsToExpenseEstimate(vehicleId)
      
      if (analyticsData) {
        setVehicleAnalyticsData(analyticsData)
      } else {
        setVehicleAnalyticsData(null)
        toast.error('Failed to fetch vehicle analytics data')
      }
    } catch (error) {
      console.error('Error fetching vehicle analytics:', error)
      toast.error('Error loading vehicle analytics')
      setVehicleAnalyticsData(null)
    } finally {
      setIsLoadingAnalytics(false)
    }
  }, [])

  useEffect(() => {
    fetchLogisticsData()
  }, [fetchLogisticsData])

  // Hooks
  const { settings } = useSettings()
  const isBelowLgScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('lg'))
  const isBelowMdScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'))
  const isBelowSmScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'))

  // Update selectedLogistics and fetch analytics when expanded changes
  useEffect(() => {
    if (expanded !== false && logisticsData[expanded]) {
      const selectedVehicle = logisticsData[expanded]
      setSelectedLogistics(selectedVehicle)
      
      // Update viewState based on selected logistics data
      // if (selectedVehicle.customers && selectedVehicle.distribution) {
      //   setViewState({
      //     staff: selectedVehicle.staff as unknown as LogisticsType['staff'],
      //     distribution: selectedVehicle.distribution as unknown as LogisticsType['distribution'],
      //   })
      // }

      // Fetch analytics data for the selected vehicle
      // Assuming the vehicle has an ID field - adjust based on your data structure
      const vehicleId = selectedVehicle.$id
      if (vehicleId) {
        fetchVehicleAnalytics(vehicleId)
      }
    } else {
      // Clear data when no vehicle is selected
      setSelectedLogistics(null)
      setVehicleAnalyticsData(null)
    }
  }, [expanded, logisticsData, fetchVehicleAnalytics])

  useEffect(() => {
    if (!isBelowMdScreen && backdropOpen && sidebarOpen) {
      setBackdropOpen(false)
    }
  }, [isBelowMdScreen, backdropOpen, sidebarOpen])

  useEffect(() => {
    if (!isBelowSmScreen && sidebarOpen) {
      setBackdropOpen(true)
    }
  }, [isBelowSmScreen, sidebarOpen])

  return (
    <Grid container spacing={4}>
      <Grid item sm={12} md={4}>
        {isBelowMdScreen ? (
          <CustomIconButton
            variant='contained'
            color='primary'
            className='absolute top-4 left-4 z-10 bg-backgroundPaper text-textPrimary hover:bg-backgroundPaper focus:bg-backgroundPaper active:bg-backgroundPaper'
            onClick={() => {
              setSidebarOpen(true)
              setBackdropOpen(true)
            }}
          >
            <i className='ri-menu-line text-2xl' />
          </CustomIconButton>
        ) : null}
        <FleetSidebar
          backdropOpen={backdropOpen}
          setBackdropOpen={setBackdropOpen}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isBelowMdScreen={isBelowMdScreen}
          isBelowLgScreen={isBelowLgScreen}
          isBelowSmScreen={isBelowSmScreen}
          expanded={expanded}
          setExpanded={setExpanded}
          setViewState={setViewState}
          logisticsData={logisticsData}
          fetchLogisticsData={fetchLogisticsData}
        />
      </Grid>
      <Grid item sm={12} md={8} spacing={6}>
        <Grid item xs={12}>
          <FleetStatistics 
            carIndex={expanded} 
            viewState={viewState} 
            selectedLogistics={selectedLogistics}
            vehicleAnalyticsData={vehicleAnalyticsData}
            isLoadingAnalytics={isLoadingAnalytics}
          />
        </Grid>
        <Grid item xs={12}>
          <TopReferralSources 
            selectedLogistics={selectedLogistics} 
            onStaffUpdate={fetchLogisticsData} 
          />
        </Grid>
      </Grid>
      <Backdrop open={backdropOpen} onClick={() => setBackdropOpen(false)} className='absolute z-10' />
    </Grid>
  )
}

export default Fleet