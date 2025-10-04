'use client'

import { useCallback, useEffect, useState, type ReactElement } from 'react'
import dynamic from 'next/dynamic'
import Grid from '@mui/material/Grid'
import { toast } from 'react-toastify'
import { useRouter } from 'next/navigation'
import type { Customer, TransactionItemDetailType } from '@/types/apps/ecommerceTypes'

// Component Imports
import CustomerDetailsHeader from './CustomerDetailsHeader'
import CustomerLeftOverview from './customer-left-overview'
import CustomerRight from './customer-right'
import { getTransactionProductListByCustomerId } from '@/libs/actions/distribution.actions'
import { getCustomerDetailsById } from '@/libs/actions/customer.action'

// Dynamically imported components
const OverViewTab = dynamic(() => import('@/views/edms/customers/details/customer-right/overview'))

interface AddressBillingTabProps {
  customerData: Customer
  isLoading: boolean
}
const AddressBillingTab = dynamic<AddressBillingTabProps>(() => import('@/views/edms/customers/details/customer-right/address-billing'))

const CustomerDetails = ({ customerId }: { customerId: string }) => {
  const [orderData, setOrderData] = useState<TransactionItemDetailType[]>([])
  const [customerData, setCustomerData] = useState<Customer | null>(null)
  const [isLoadingOrders, setIsLoadingOrders] = useState(true)
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(true)
  const [hasError, setHasError] = useState(false)
  const router = useRouter()

  // Fetch customer data
  const fetchCustomerData = useCallback(async () => {
    try {
      setIsLoadingCustomer(true)
      setHasError(false)
      const response = await getCustomerDetailsById(customerId)
      if (response) {
        setCustomerData(response as unknown as Customer)
      } else {
        setHasError(true)
        toast.error('Customer not found')
      }
    } catch (error) {
      console.error('Error fetching customer data:', error)
      setHasError(true)
      toast.error('Failed to fetch customer data')
    } finally {
      setIsLoadingCustomer(false)
    }
  }, [customerId])

  // Fetch orders data
  const fetchOrdersData = useCallback(async () => {
    try {
      setIsLoadingOrders(true)
      setHasError(false)
      const response = await getTransactionProductListByCustomerId(customerId)
      if (response?.documents) {
        setOrderData(response.documents as unknown as TransactionItemDetailType[])
      } else {
        setOrderData([])
      }
    } catch (error) {
      console.error('Error fetching transaction data:', error)
      setHasError(true)
      toast.error('Failed to fetch order data')
      setOrderData([])
    } finally {
      setIsLoadingOrders(false)
    }
  }, [customerId])

  // Refresh both customer and orders data
  const handleDataRefresh = useCallback(() => {
    fetchCustomerData()
    fetchOrdersData()
  }, [fetchCustomerData, fetchOrdersData])

  useEffect(() => {
    if (customerId) {
      fetchCustomerData()
      fetchOrdersData()
    }
  }, [customerId, fetchCustomerData, fetchOrdersData])

  const tabContentList = (): { [key: string]: ReactElement } => ({
    overview: (
      <OverViewTab 
        orderData={orderData}
        isLoading={isLoadingOrders}
        onUpdate={handleDataRefresh}
      />
    ),
    addressBilling: (
      <AddressBillingTab 
        customerData={customerData!}
        isLoading={isLoadingCustomer}
      />
    ),
  })

  // Show error state if there's an issue and nothing is loading
  if (hasError && !isLoadingCustomer && !isLoadingOrders) {
    return (
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <div className="text-center p-8">
            <h2 className="text-xl font-semibold mb-2">Error Loading Customer</h2>
            <p className="text-gray-600 mb-4">Unable to load customer details</p>
            <button 
              onClick={handleDataRefresh}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try Again
            </button>
          </div>
        </Grid>
      </Grid>
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <CustomerDetailsHeader customerId={customerId} />
      </Grid>
      <Grid item xs={12} md={4}>
        <CustomerLeftOverview 
          customerData={customerData}
          isLoading={isLoadingCustomer}
        />
      </Grid>
      <Grid item xs={12} md={8}>
        <CustomerRight tabContentList={tabContentList()} />
      </Grid>
    </Grid>
  )
}

export default CustomerDetails