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
