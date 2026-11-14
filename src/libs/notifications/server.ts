import 'server-only'

import { Client, Databases, Query } from 'node-appwrite'
import webpush from 'web-push'

import { OFFICE_RECIPIENT, OFFICE_ROLES, PUSH_SUBSCRIPTIONS_COLLECTION } from './shared'
import type { NotifyRequest, PushPayload } from './shared'

/**
 * Server side of the notification system: writes the in-app notification and
 * fans the web-push out to the office. Runs only inside /api/push/notify, with
 * the Appwrite API key.
 *
 * The route cannot tell who is calling it - the app signs in entirely in the
 * browser, and this Appwrite project has JWT auth switched off - so nothing here
 * trusts the request beyond a record id:
 *
 *  - the alert text is built from the stored manifest / return waybill;
 *  - that record must have been uploaded within the last few minutes;
 *  - each record can raise exactly one notification, ever (deterministic id);
 *  - push goes only to subscriptions whose owner is verified against Appwrite's
 *    own document permissions and currently holds an office role.
 */

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!
const PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT!
const DATABASE_ID = process.env.NEXT_PUBLIC_DATABASE_ID!
const USERS = process.env.NEXT_PUBLIC_USERS_COLLECTION_ID!
const MANIFESTS = process.env.NEXT_PUBLIC_MANIFESTS_COLLECTION_ID!
const RETURN_WAYBILLS = process.env.NEXT_PUBLIC_RETURN_WAYBILLS_COLLECTION_ID!
const NOTIFICATIONS = process.env.NEXT_PUBLIC_NOTIFICATIONS_COLLECTION_ID!

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'https://edsghana.com'

// How long after an upload the office can still be alerted about it.
const FRESH_WINDOW_MS = 15 * 60 * 1000

type AlertContent = Omit<PushPayload, 'id' | 'timestamp'>

export const isPushConfigured = (): boolean => Boolean(VAPID_PUBLIC && VAPID_PRIVATE)

const notifyRoles = (): string[] =>
  process.env.PUSH_NOTIFY_ROLES
    ? process.env.PUSH_NOTIFY_ROLES.split(',').map(role => role.trim().toLowerCase()).filter(Boolean)
    : OFFICE_ROLES

const adminDatabases = () =>
  new Databases(new Client().setEndpoint(ENDPOINT).setProject(PROJECT).setKey(process.env.APPWRITE_API_KEY!))

export class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const isFresh = (...timestamps: Array<string | null | undefined>): boolean =>
  timestamps.some(value => value && Date.now() - new Date(value).getTime() < FRESH_WINDOW_MS)

const relationId = (value: any): string | null =>
  value && typeof value === 'object' ? value.$id || null : value || null

const getRecord = async (collectionId: string, id: string, select: string[]): Promise<any> => {
  try {
    return await adminDatabases().getDocument(DATABASE_ID, collectionId, id, [Query.select(select)])
  } catch (error: any) {
    if (error?.code === 404) throw new HttpError(404, 'Record not found')
    throw error
  }
}

/**
 * Build the alert from the stored record rather than from anything the browser
 * says, so nobody can push arbitrary text to the office.
 */
const buildContent = async (request: NotifyRequest): Promise<AlertContent> => {
  if (request.kind === 'manifest_delivered') {
    if (!request.manifestId) throw new HttpError(400, 'manifestId is required')

    const manifest = await getRecord(MANIFESTS, request.manifestId, [
      '*',
      'trip.tripNumber',
      'trip.driver.name',
      'trip.vehicle.vehicleNumber',
      'trip.route.routeName',
      'dropofflocation.locationName'
    ])

    const delivered = manifest.status === 'delivered' || manifest.status === 'completed'

    if (!delivered || !isFresh(manifest.deliveryTime, manifest.$createdAt)) {
      throw new HttpError(409, 'This delivery is not a new upload')
    }

    const trip = manifest.trip && typeof manifest.trip === 'object' ? manifest.trip : null
    const stop = manifest.dropofflocation?.locationName || 'a stop'
    const awaitingFigures = manifest.detailsVerified !== true && (!manifest.packageSize || !manifest.packageCount)

    const details = [
      trip?.tripNumber ? `Trip ${trip.tripNumber}` : null,
      trip?.vehicle?.vehicleNumber || null,
      trip?.route?.routeName || null,
      manifest.clientName || null,
      manifest.shortageCount ? `${manifest.shortageCount} short` : null,
      manifest.surplusCount ? `${manifest.surplusCount} extra` : null
    ].filter(Boolean)

    return {
      kind: 'manifest_delivered',
      title: `${trip?.driver?.name || 'A driver'} uploaded a delivery`,
      body: [stop, ...details].join(' • '),
      url:
        awaitingFigures && trip?.$id
          ? `/edms/manifests/review?tripId=${trip.$id}`
          : `/edms/manifests/${manifest.$id}`,
      image: manifest.manifestImage || manifest.proofOfDeliveryImage || undefined
    }
  }

  if (request.kind === 'return_logged') {
    if (!request.returnWaybillId) throw new HttpError(400, 'returnWaybillId is required')

    const waybill = await getRecord(RETURN_WAYBILLS, request.returnWaybillId, [
      '*',
      'trip.tripNumber',
      'trip.driver.name',
      'trip.vehicle.vehicleNumber'
    ])

    if (!isFresh(waybill.$createdAt)) throw new HttpError(409, 'This return is not a new upload')

    const trip = waybill.trip && typeof waybill.trip === 'object' ? waybill.trip : null
    const tripId = relationId(waybill.trip)

    const details = [
      trip?.tripNumber ? `Trip ${trip.tripNumber}` : null,
      trip?.vehicle?.vehicleNumber || null,
      waybill.returnReason ? String(waybill.returnReason).replace(/_/g, ' ') : null
    ].filter(Boolean)

    return {
      kind: 'return_logged',
      title: `${trip?.driver?.name || 'A driver'} uploaded a return`,
      body: details.join(' • ') || 'A return waybill was logged in the field',
      url: tripId ? `/edms/returns/waybills/review?tripId=${tripId}` : '/edms/returns/waybills/review',
      image: waybill.waybillImage || undefined
    }
  }

  throw new HttpError(400, 'Unknown notification kind')
}

/**
 * Write the bell-menu entry. Open browsers pick it up over Appwrite Realtime.
 *
 * The id is derived from the record, so a second request for the same upload
 * collides (409) and returns null - that is the "one alert per upload" rule.
 */
const createNotificationDocument = async (recordId: string, content: AlertContent): Promise<string | null> => {
  const databases = adminDatabases()
  const id = `ntf_${recordId}`.slice(0, 36)

  const base = {
    type: content.kind,
    recipient: OFFICE_RECIPIENT,
    subject: content.title.slice(0, 200),
    message: content.body.slice(0, 1000) || content.title,
    status: 'unread'
  }

  const create = (data: Record<string, unknown>) => databases.createDocument(DATABASE_ID, NOTIFICATIONS, id, data)

  try {
    try {
      await create({ ...base, link: content.url.slice(0, 500) })
    } catch (error: any) {
      // The optional `link` attribute may not exist yet on this database.
      if (!/unknown attribute|invalid document structure/i.test(error?.message || '')) throw error
      await create(base)
    }

    return id
  } catch (error: any) {
    if (error?.code === 409) return null
    throw error
  }
}

/**
 * Subscriptions that genuinely belong to someone in the office.
 *
 * Browsers write their own subscription rows, so the `userId` on a row is only
 * a claim. Appwrite, though, stamps every row with `user:<accountId>` permissions
 * for whoever created it, and a client cannot forge those for another account.
 * A row counts only when that stamp matches the account of the user it names,
 * and that user holds an office role right now.
 */
const officeSubscriptions = async (): Promise<any[]> => {
  const databases = adminDatabases()

  const [subscriptions, users] = await Promise.all([
    databases.listDocuments(DATABASE_ID, PUSH_SUBSCRIPTIONS_COLLECTION, [Query.limit(1000)]),
    databases.listDocuments(DATABASE_ID, USERS, [Query.select(['*', 'role.*']), Query.limit(1000)])
  ])

  const roles = notifyRoles()
  const usersById = new Map<string, any>(users.documents.map((user: any) => [user.$id, user]))

  return subscriptions.documents.filter((row: any) => {
    const user = usersById.get(row.userId)

    if (!user || user.status === 'deleted') return false
    if (!roles.includes((user.role?.name || '').toLowerCase())) return false

    return (row.$permissions || []).some((permission: string) => permission.includes(`"user:${user.accountId}"`))
  })
}

const sendPushes = async (payload: PushPayload, rows: any[]) => {
  if (!isPushConfigured() || rows.length === 0) return { sent: 0, failed: 0 }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC!, VAPID_PRIVATE!)

  const databases = adminDatabases()
  let sent = 0
  let failed = 0

  await Promise.all(
    rows.map(async row => {
      try {
        await webpush.sendNotification(JSON.parse(row.subscription), JSON.stringify(payload), {
          TTL: 60 * 60,
          urgency: 'high'
        })
        sent++
      } catch (error: any) {
        failed++

        // 404/410: the browser dropped this subscription - stop sending to it.
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await databases.deleteDocument(DATABASE_ID, PUSH_SUBSCRIPTIONS_COLLECTION, row.$id).catch(() => undefined)
        } else {
          console.error('Push send failed:', error?.statusCode, error?.body || error?.message)
        }
      }
    })
  )

  return { sent, failed }
}

export const notify = async (request: NotifyRequest) => {
  // A test buzzes one device: the one that asked, named by its own push endpoint.
  if (request.kind === 'test') {
    if (!request.endpoint) throw new HttpError(400, 'endpoint is required')

    const rows = await adminDatabases().listDocuments(DATABASE_ID, PUSH_SUBSCRIPTIONS_COLLECTION, [
      Query.equal('endpoint', request.endpoint),
      Query.limit(1)
    ])

    const payload: PushPayload = {
      id: `test-${Date.now()}`,
      kind: 'test',
      title: 'Test alert',
      body: 'This is how a driver upload will sound on this device.',
      url: '/',
      timestamp: Date.now()
    }

    return { notificationId: null, pushConfigured: isPushConfigured(), ...(await sendPushes(payload, rows.documents)) }
  }

  const content = await buildContent(request)
  const recordId = (request.kind === 'manifest_delivered' ? request.manifestId : request.returnWaybillId) as string
  const notificationId = await createNotificationDocument(recordId, content)

  // Already announced - nothing more to do.
  if (!notificationId) return { notificationId: null, pushConfigured: isPushConfigured(), sent: 0, failed: 0 }

  const payload: PushPayload = { ...content, id: notificationId, timestamp: Date.now() }

  let result = { sent: 0, failed: 0 }

  try {
    result = await sendPushes(payload, await officeSubscriptions())
  } catch (error) {
    // The in-app notification is already written; a push failure must not undo it.
    console.error('Could not send push notifications:', error)
  }

  return { notificationId, pushConfigured: isPushConfigured(), ...result }
}
