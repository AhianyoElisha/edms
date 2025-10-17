import { ID, Query } from 'appwrite'
import { appwriteConfig, databases } from '@/libs/appwrite.config'

export interface ActivityHistoryItem {
  entityType: 'trip' | 'route' | 'manifest' | 'package' | 'pickup-location' | 'dropoff-location' | 'user' | 'permission' | 'role' | 'vehicle'
  entityId: string
  entityName: string
  action: 'created' | 'updated' | 'deleted' | 'status-changed'
  description: string
  userId: string
  userName?: string
  metadata?: Record<string, any>
}

/**
 * Add activity to history
 */
export async function addActivityHistory(activity: ActivityHistoryItem) {
  if (!activity.userId) {
    console.warn('No userId provided for activity history');
    return null;
  }

  try {
    const historyItem = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.activityhistory,
      ID.unique(),
      {
        entityType: activity.entityType,
        entityId: activity.entityId,
        entityName: activity.entityName,
        action: activity.action,
        description: activity.description,
        userId: activity.userId,
        userName: activity.userName || 'Unknown User',
        metadata: activity.metadata ? JSON.stringify(activity.metadata) : null
      }
    );
    return historyItem;
  } catch (error) {
    console.error('Error adding activity history:', error);
    return null;
  }
}

/**
 * Get activity history with filters
 */
export async function getActivityHistory(filters?: {
  entityType?: string
  entityId?: string
  userId?: string
  action?: string
  startDate?: string
  endDate?: string
  limit?: number
}) {
  try {
    const queries: string[] = []

    if (filters?.entityType) {
      queries.push(Query.equal('entityType', filters.entityType))
    }

    if (filters?.entityId) {
      queries.push(Query.equal('entityId', filters.entityId))
    }

    if (filters?.userId) {
      queries.push(Query.equal('userId', filters.userId))
    }

    if (filters?.action) {
      queries.push(Query.equal('action', filters.action))
    }

    if (filters?.startDate) {
      queries.push(Query.greaterThanEqual('$createdAt', filters.startDate))
    }

    if (filters?.endDate) {
      queries.push(Query.lessThanEqual('$createdAt', filters.endDate))
    }

    queries.push(Query.orderDesc('$createdAt'))
    queries.push(Query.limit(filters?.limit || 100))

    const response = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.activityhistory,
      queries
    )

    return response.documents
  } catch (error) {
    console.error('Error fetching activity history:', error)
    return []
  }
}

/**
 * Get recent activity for dashboard
 */
export async function getRecentActivity(limit: number = 10) {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.activityhistory,
      [
        Query.orderDesc('$createdAt'),
        Query.limit(limit)
      ]
    )

    return response.documents.map((activity: any) => ({
      id: activity.$id,
      entityType: activity.entityType,
      entityName: activity.entityName,
      action: activity.action,
      description: activity.description,
      userName: activity.userName,
      timestamp: activity.$createdAt,
      metadata: activity.metadata ? JSON.parse(activity.metadata) : null
    }))
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    return []
  }
}
