'use client'

import { ID, Query } from 'appwrite'

import { appwriteConfig, databases } from '@/libs/appwrite.config'

import { PUSH_SUBSCRIPTIONS_COLLECTION } from './shared'
import type { NotifyRequest } from './shared'

/**
 * Browser side of the notification system: telling the server about an upload,
 * turning push on for this device, and making noise.
 */

const ALERT_SOUND = '/sounds/delivery-alert.wav'

// Matches the pattern the service worker uses for system notifications.
const VIBRATION = [600, 200, 600, 200, 600, 400, 600, 200, 600, 200, 600]

/* -------------------------------------------------------------------------- */
/*  Calls to our own API                                                       */
/* -------------------------------------------------------------------------- */

const postNotify = async (request: NotifyRequest) => {
  const response = await fetch('/api/push/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    // Let the request finish even if the driver navigates away straight after.
    keepalive: true
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`)

  return data
}

/**
 * Tell the office something was uploaded. Never throws: a failed alert must not
 * make a driver think their delivery was not saved.
 */
export const notifyOffice = async (request: NotifyRequest): Promise<void> => {
  try {
    await postNotify(request)
  } catch (error) {
    console.warn('Could not notify the office:', error)
  }
}

/* -------------------------------------------------------------------------- */
/*  Service worker + push subscription                                         */
/* -------------------------------------------------------------------------- */

export type PushStatus = 'unsupported' | 'unconfigured' | 'denied' | 'off' | 'on'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

// Which signed-in user this browser's subscription was registered for.
const OWNER_KEY = 'edms:push:owner'

export const isPushSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window

// iPhones and iPads only allow web push once the app is added to the Home Screen.
export const needsInstallForPush = (): boolean => {
  if (typeof window === 'undefined') return false

  const isIos =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true

  return isIos && !isStandalone
}

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null

  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch (error) {
    console.warn('Service worker registration failed:', error)

    return null
  }
}

const urlBase64ToUint8Array = (base64: string): Uint8Array<ArrayBuffer> => {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))

  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)

  return bytes
}

const readOwner = (): string | null => {
  try {
    return window.localStorage.getItem(OWNER_KEY)
  } catch {
    return null
  }
}

const writeOwner = (userId: string | null) => {
  try {
    if (userId) window.localStorage.setItem(OWNER_KEY, userId)
    else window.localStorage.removeItem(OWNER_KEY)
  } catch {
    // Storage blocked: the subscription is simply re-registered next time.
  }
}

const currentSubscription = async (): Promise<PushSubscription | null> => {
  const registration = await navigator.serviceWorker.getRegistration('/')

  return (await registration?.pushManager.getSubscription()) || null
}

/**
 * Store this browser's subscription in Appwrite, as the signed-in user.
 *
 * The row is written from the browser on purpose: Appwrite stamps it with that
 * account's permissions, and the server uses the stamp to check who really owns
 * it before sending anything there.
 */
const saveSubscription = async (userId: string, subscription: PushSubscription) => {
  const existing = await databases.listDocuments(appwriteConfig.database, PUSH_SUBSCRIPTIONS_COLLECTION, [
    Query.equal('endpoint', subscription.endpoint),
    Query.limit(1)
  ])

  const data = {
    userId,
    endpoint: subscription.endpoint,
    subscription: JSON.stringify(subscription.toJSON()),
    userAgent: navigator.userAgent.slice(0, 300)
  }

  if (existing.documents[0]) {
    await databases.updateDocument(
      appwriteConfig.database,
      PUSH_SUBSCRIPTIONS_COLLECTION,
      existing.documents[0].$id,
      data
    )
  } else {
    await databases.createDocument(appwriteConfig.database, PUSH_SUBSCRIPTIONS_COLLECTION, ID.unique(), data)
  }

  writeOwner(userId)
}

export const getPushStatus = async (userId: string): Promise<PushStatus> => {
  if (!isPushSupported()) return 'unsupported'
  if (!VAPID_PUBLIC_KEY) return 'unconfigured'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission !== 'granted') return 'off'

  // A subscription left behind by someone else who used this browser is not "on"
  // for the person signed in now.
  return (await currentSubscription()) && readOwner() === userId ? 'on' : 'off'
}

/**
 * Ask for permission (must be called from a tap/click) and register this
 * browser for the signed-in user.
 */
export const enablePush = async (userId: string): Promise<PushStatus> => {
  if (!isPushSupported()) return 'unsupported'
  if (!VAPID_PUBLIC_KEY) return 'unconfigured'

  const permission = await Notification.requestPermission()

  if (permission === 'denied') return 'denied'
  if (permission !== 'granted') return 'off'

  await registerServiceWorker()

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()

  // Shared computer: the previous user's subscription row belongs to them and
  // cannot be taken over, so start a fresh one for this user.
  if (subscription && readOwner() !== userId) {
    await subscription.unsubscribe()
    subscription = null
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    })
  }

  await saveSubscription(userId, subscription)

  return 'on'
}

/**
 * Re-save an existing subscription. Cheap, and it repairs the stored row if it
 * was lost or the browser rotated its push keys.
 */
export const syncPushSubscription = async (userId: string): Promise<void> => {
  try {
    if (!isPushSupported() || !VAPID_PUBLIC_KEY || Notification.permission !== 'granted') return
    if (readOwner() !== userId) return

    const subscription = await currentSubscription()

    if (subscription) await saveSubscription(userId, subscription)
  } catch (error) {
    console.warn('Could not sync the push subscription:', error)
  }
}

export const disablePush = async (): Promise<void> => {
  if (!isPushSupported()) return

  const subscription = await currentSubscription()

  if (!subscription) return

  try {
    const existing = await databases.listDocuments(appwriteConfig.database, PUSH_SUBSCRIPTIONS_COLLECTION, [
      Query.equal('endpoint', subscription.endpoint),
      Query.limit(1)
    ])

    if (existing.documents[0]) {
      await databases.deleteDocument(appwriteConfig.database, PUSH_SUBSCRIPTIONS_COLLECTION, existing.documents[0].$id)
    }
  } catch (error) {
    console.warn('Could not remove the stored push subscription:', error)
  }

  await subscription.unsubscribe()
  writeOwner(null)
}

/** Push a test alert through the real pipeline to this device only. */
export const sendTestAlert = async (): Promise<{ sent: number; pushConfigured: boolean }> => {
  const subscription = await currentSubscription()

  if (!subscription) return { sent: 0, pushConfigured: Boolean(VAPID_PUBLIC_KEY) }

  return postNotify({ kind: 'test', endpoint: subscription.endpoint })
}

/* -------------------------------------------------------------------------- */
/*  Sound + vibration                                                          */
/* -------------------------------------------------------------------------- */

let alertAudio: HTMLAudioElement | null = null

const getAudio = (): HTMLAudioElement | null => {
  if (typeof window === 'undefined') return null

  if (!alertAudio) {
    alertAudio = new Audio(ALERT_SOUND)
    alertAudio.preload = 'auto'
  }

  return alertAudio
}

/**
 * Browsers refuse to play sound on a page nobody has touched. Call this on the
 * first tap so the chime is allowed to play later, when an alert arrives with
 * the page sitting untouched in the background.
 */
export const unlockAlertSound = (): void => {
  const audio = getAudio()

  if (!audio) return

  audio.muted = true
  audio
    .play()
    .then(() => {
      audio.pause()
      audio.currentTime = 0
    })
    .catch(() => undefined)
    .finally(() => {
      audio.muted = false
    })
}

export const stopAlert = (): void => {
  if (alertAudio) {
    alertAudio.pause()
    alertAudio.currentTime = 0
    alertAudio.loop = false
  }

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(0)
}

// The sound file holds the chime twice (about 2.6 s in all).
export const ALERT_DURATION_MS = 2800

/**
 * Full-volume chime plus vibration. Plays the file once - it is a soft two-note
 * chime that rings twice, which gets noticed without nagging.
 * Resolves false when the browser blocked the sound (page never interacted with).
 */
export const playAlert = async (): Promise<boolean> => {
  const audio = getAudio()

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(VIBRATION)

  if (!audio) return false

  audio.muted = false
  audio.volume = 1
  audio.loop = false
  audio.currentTime = 0

  try {
    await audio.play()

    return true
  } catch {
    return false
  }
}
