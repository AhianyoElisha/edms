/**
 * Bits of the notification system shared by the browser and the server routes.
 */

// Roles that receive "a driver just uploaded" alerts. Override on the server with
// PUSH_NOTIFY_ROLES (comma separated) if the office set-up changes.
export const OFFICE_ROLES = ['admin', 'operations']

// Where each browser stores its push subscription.
export const PUSH_SUBSCRIPTIONS_COLLECTION =
  process.env.NEXT_PUBLIC_PUSH_SUBSCRIPTIONS_COLLECTION_ID || 'pushsubscriptions'

// The `recipient` value stored on notification documents meant for the office.
export const OFFICE_RECIPIENT = 'office'

export type NotifyKind = 'manifest_delivered' | 'return_logged' | 'test'

export interface NotifyRequest {
  kind: NotifyKind
  manifestId?: string
  returnWaybillId?: string
  // kind 'test' only: the calling browser's own push endpoint
  endpoint?: string
}

// What the service worker and the page both receive for one alert.
export interface PushPayload {
  id: string
  kind: NotifyKind
  title: string
  body: string
  url: string
  image?: string
  timestamp: number
}

export const isOfficeRole = (roleName?: string | null): boolean =>
  OFFICE_ROLES.includes((roleName || '').toLowerCase())
