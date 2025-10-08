import { Query } from 'appwrite'
import { appwriteConfig, databases, tablesDB } from '@/libs/appwrite.config'
import type { PackageTrackingType } from '@/types/apps/deliveryTypes'

const DATABASE_ID = appwriteConfig.database
const PACKAGES_COLLECTION_ID = appwriteConfig.packages

export const getPackageById = async (packageId: string): Promise<PackageTrackingType> => {
  try {
    const pkg = await databases.getDocument(
      DATABASE_ID,
      PACKAGES_COLLECTION_ID,
      packageId
    )

    return pkg as unknown as PackageTrackingType
  } catch (error) {
    console.error('Error fetching package:', error)
    throw new Error('Failed to fetch package')
  }
}

export const getPackageByIdWithRelations = async (packageId: string) => {
  try {
    const pkg = await tablesDB.getRow(
      DATABASE_ID,
      PACKAGES_COLLECTION_ID,
      packageId,
      [
        Query.select([
          '*',
          'manifest.*',
          'manifest.trip.*',
          'manifest.pickuplocation.*',
          'manifest.dropofflocation.*',
          'pickuplocation.*',
          'dropofflocation.*'
        ])
      ]
    )

    return pkg
  } catch (error) {
    console.error('Error fetching package with relations:', error)
    throw new Error('Failed to fetch package details')
  }
}

/**
 * Bulk update package statuses
 */
export const bulkUpdatePackageStatus = async (
  packageIds: string[],
  status: string,
  deliveryDate?: string
): Promise<void> => {
  try {
    const updateData: any = { status }
    
    if (status === 'delivered' && deliveryDate) {
      updateData.deliveryDate = deliveryDate
    }
    
    // Update all packages
    await Promise.all(
      packageIds.map(packageId =>
        databases.updateDocument(
          DATABASE_ID,
          PACKAGES_COLLECTION_ID,
          packageId,
          updateData
        )
      )
    )
  } catch (error) {
    console.error('Error bulk updating package status:', error)
    throw new Error('Failed to update package statuses')
  }
}

/**
 * Update single package status
 */
export const updatePackageStatus = async (
  packageId: string,
  status: string,
  deliveryDate?: string
): Promise<PackageTrackingType> => {
  try {
    const updateData: any = { status }
    
    if (status === 'delivered' && deliveryDate) {
      updateData.deliveryDate = deliveryDate
    }
    
    const pkg = await databases.updateDocument(
      DATABASE_ID,
      PACKAGES_COLLECTION_ID,
      packageId,
      updateData
    )
    
    return pkg as unknown as PackageTrackingType
  } catch (error) {
    console.error('Error updating package status:', error)
    throw new Error('Failed to update package status')
  }
}
