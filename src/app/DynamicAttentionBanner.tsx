'use client'

import { useCallback, useEffect, useState } from 'react'
import AttentionBanner from './AttentionBanner'
import { getInventoryCategoryList } from '@/libs/actions/stores.actions'
import { CategoryType } from '@/types/apps/ecommerceTypes'
import { useAuth } from '@/contexts/AppwriteProvider'
import { usePathname } from 'next/navigation'

const DynamicAttentionBanner = () => {
  const [shouldShow, setShouldShow] = useState(false)
  const [inventoryData, setInventoryData] = useState<CategoryType[] | null>(null)
  const { isLoading } = useAuth()
  const pathname  = usePathname()

  // Function to fetch inventory data
  const fetchInventoryData = useCallback(async () => {
    try {
      const data = await getInventoryCategoryList(false, false)
      setInventoryData(data?.inventoryList.documents as unknown as CategoryType[])
      // console.log(data as unknown as CategoryType[])
    } catch (error) {
      console.error('Error fetching inventory data:', error)
      setInventoryData(null)
    }
  }, [])

  // Fetch data on initial load
  useEffect(() => {
    fetchInventoryData()
  }, [fetchInventoryData, isLoading, pathname])
    
  const filteredInventoryData = inventoryData?.filter((item) => item.totalProducts! <= item.stockLimit!)

  useEffect(() => {
    // Check conditions and update state
    if (filteredInventoryData?.length! > 0) {
      setShouldShow(true)
    }
  }, [filteredInventoryData])

  if (!shouldShow) return null

  return filteredInventoryData?.length! > 0 && (
    <AttentionBanner>
      {filteredInventoryData?.map((inventory, index) => (
        <div key={index} className="ml-44">
            You're low on {inventory.categoryTitle} stock. Please replenish!
        </div>
      ))}
    </AttentionBanner>
  )
}

export default DynamicAttentionBanner