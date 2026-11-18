import { appwriteConfig, databases } from '@/libs/appwrite.config'

/**
 * Taking an upload's notification out of the office bell once it has been dealt
 * with. Shared by the bell itself and by the review screens.
 *
 * Every upload raises exactly one notification, with an id made from the record's
 * own id (see createNotificationDocument in ./server), so the record id is all it
 * takes to find it.
 */

// The status a dealt-with notification is given. Anything else is still open.
export const NOTIFICATION_DONE = 'done'

export const notificationIdFor = (recordId: string): string => `ntf_${recordId}`.slice(0, 36)

export const recordIdFor = (notificationId: string): string | null =>
  notificationId.startsWith('ntf_') ? notificationId.slice(4) : null

/**
 * Mark a notification done, by its own id. Never throws: the bell tidying up must
 * not get in the way of the work that prompted it.
 */
export const resolveNotification = async (notificationId: string): Promise<void> => {
  try {
    await databases.updateDocument(appwriteConfig.database, appwriteConfig.notifications, notificationId, {
      status: NOTIFICATION_DONE
    })
  } catch (error: any) {
    // 404: an upload from before the bell existed, or a test alert - nothing to clear
    if (error?.code !== 404) console.warn('Could not clear the notification:', error)
  }
}

/** Mark done the notification raised for a manifest or return waybill. */
export const resolveNotificationFor = (recordId: string): Promise<void> =>
  resolveNotification(notificationIdFor(recordId))
