/**
 * @deprecated Package actions are deprecated.
 * Package information is now stored directly on manifests.
 * Each manifest tracks: packageSize, packageCount, and deliveredCount
 * 
 * For package-related queries, use manifest.actions.ts instead.
 * - manifest.packageSize: 'small' | 'medium' | 'big'
 * - manifest.packageCount: Total number of packages on this manifest
 * - manifest.deliveredCount: Number of packages delivered
 */

import { Query } from 'appwrite'
import { appwriteConfig, databases, tablesDB } from '@/libs/appwrite.config'
import type { ManifestType } from '@/types/apps/deliveryTypes'

const DATABASE_ID = appwriteConfig.database
const MANIFESTS_COLLECTION_ID = appwriteConfig.manifests

/**
 * @deprecated Use getManifestById from manifest.actions.ts instead
 * Get manifest package information by manifest ID
 */
export const getManifestPackageInfo = async (manifestId: string): Promise<{
  packageSize: string
  packageCount: number
  deliveredCount: number
}> => {
  try {
    const manifest = await databases.getDocument(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      manifestId
    ) as unknown as ManifestType

    return {
      packageSize: manifest.packageSize || 'unknown',
      packageCount: manifest.packageCount || 0,
      deliveredCount: manifest.deliveredCount || 0
    }
  } catch (error) {
    console.error('Error fetching manifest package info:', error)
    throw new Error('Failed to fetch manifest package info')
  }
}

/**
 * Update delivered package count on a manifest
 */
export const updateManifestDeliveredCount = async (
  manifestId: string,
  deliveredCount: number
): Promise<ManifestType> => {
  try {
    const manifest = await databases.updateDocument(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      manifestId,
      { deliveredCount }
    )
    
    return manifest as unknown as ManifestType
  } catch (error) {
    console.error('Error updating manifest delivered count:', error)
    throw new Error('Failed to update manifest delivered count')
  }
}

/**
 * Get package count summary across all manifests (by size)
 */
export const getPackageCountSummary = async (): Promise<{
  small: number
  medium: number
  big: number
  total: number
}> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      [Query.limit(1000)]
    )

    const manifests = response.documents as unknown as ManifestType[]
    
    const summary = manifests.reduce((acc, manifest) => {
      const size = manifest.packageSize || 'small'
      const count = manifest.packageCount || 0
      
      acc[size as 'small' | 'medium' | 'big'] = (acc[size as 'small' | 'medium' | 'big'] || 0) + count
      acc.total += count
      
      return acc
    }, { small: 0, medium: 0, big: 0, total: 0 })

    return summary
  } catch (error) {
    console.error('Error fetching package count summary:', error)
    return { small: 0, medium: 0, big: 0, total: 0 }
  }
}

/**
 * Get delivered packages count by date range (from manifests)
 */
export const getDeliveredPackagesCountByDateRange = async (
  startDate?: string,
  endDate?: string
): Promise<number> => {
  try {
    const queries = [Query.equal('status', 'delivered')]
    
    if (startDate) {
      queries.push(Query.greaterThanEqual('manifestDate', startDate))
    }
    
    if (endDate) {
      queries.push(Query.lessThanEqual('manifestDate', endDate))
    }
    
    queries.push(Query.limit(1000))
    
    const response = await databases.listDocuments(
      DATABASE_ID,
      MANIFESTS_COLLECTION_ID,
      queries
    )
    
    const manifests = response.documents as unknown as ManifestType[]
    
    // Sum up deliveredCount from all manifests
    return manifests.reduce((total, manifest) => {
      return total + (manifest.deliveredCount || manifest.packageCount || 0)
    }, 0)
  } catch (error) {
    console.error('Error fetching delivered packages count:', error)
    return 0
  }
}
