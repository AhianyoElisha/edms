import { useState, useEffect, useCallback } from 'react'
import { requestCache } from '@/libs/cache/requestCache'

interface UseDataFetchingOptions<T> {
  initialData?: T
  enabled?: boolean
  cacheTime?: number
  staleTime?: number
  onError?: (error: Error) => void
  onSuccess?: (data: T) => void
}

export function useDataFetching<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseDataFetchingOptions<T> = {}
) {
  const {
    initialData,
    enabled = true,
    cacheTime = 5 * 60 * 1000, // 5 minutes
    staleTime = 1 * 60 * 1000,  // 1 minute
    onError,
    onSuccess
  } = options

  const [data, setData] = useState<T | undefined>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastFetch, setLastFetch] = useState<number>(0)

  const fetchData = useCallback(async (force = false) => {
    if (!enabled) return

    // Check if data is still fresh
    if (!force && data && Date.now() - lastFetch < staleTime) {
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const result = await requestCache.get(key, fetcher, cacheTime)
      
      setData(result)
      setLastFetch(Date.now())
      
      if (onSuccess) {
        onSuccess(result)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      
      if (onError) {
        onError(error)
      }
    } finally {
      setIsLoading(false)
    }
  }, [key, fetcher, enabled, data, lastFetch, staleTime, cacheTime, onError, onSuccess])

  const invalidate = useCallback(() => {
    requestCache.invalidate(key)
    setLastFetch(0)
  }, [key])

  const refetch = useCallback(() => {
    return fetchData(true)
  }, [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
    refetch,
    invalidate,
    isStale: Date.now() - lastFetch > staleTime
  }
}

// Specialized hooks for common data fetching patterns
export function useUsers() {
  return useDataFetching(
    'users-list',
    async () => {
      const { getUserList } = await import('@/libs/actions/customer.action')
      return getUserList()
    },
    {
      cacheTime: 3 * 60 * 1000, // 3 minutes
      staleTime: 1 * 60 * 1000   // 1 minute
    }
  )
}

export function useRequisitionHistory() {
  return useDataFetching(
    'requisition-history',
    async () => {
      const { getRequisitionHistoryList } = await import('@/libs/actions/stores.actions')
      return getRequisitionHistoryList()
    },
    {
      cacheTime: 5 * 60 * 1000, // 5 minutes
      staleTime: 2 * 60 * 1000   // 2 minutes
    }
  )
}

export function useVehicles() {
  return useDataFetching(
    'vehicles-list',
    async () => {
      const { getLogisticsList } = await import('@/libs/actions/customer.action')
      return getLogisticsList()
    },
    {
      cacheTime: 5 * 60 * 1000, // 5 minutes
      staleTime: 2 * 60 * 1000   // 2 minutes
    }
  )
}
