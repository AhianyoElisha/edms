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

/*
 * The chime goes through the Web Audio API. Browsers start a page "muted" until
 * someone taps, clicks or types on it; once a tap has resumed the AudioContext it
 * stays allowed for the life of the page, background tab included. An <audio>
 * element is kept as the fallback for browsers without Web Audio.
 *
 * The old unlock listened for one `pointerdown` and gave up after it. On a phone a
 * touch `pointerdown` does not count as a tap for autoplay, so the unlock failed
 * and the chime stayed silent until something else (like the bell) was tapped.
 */

let audioContext: AudioContext | null = null
let alertBuffer: AudioBuffer | null = null
let bufferLoading: Promise<AudioBuffer | null> | null = null
let currentSource: AudioBufferSourceNode | null = null
let alertAudio: HTMLAudioElement | null = null
let htmlAudioUnlocked = false

const soundListeners = new Set<(ready: boolean) => void>()

const getContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null

  if (!audioContext) {
    const Context = window.AudioContext || (window as any).webkitAudioContext

    if (!Context) return null

    try {
      audioContext = new Context() as AudioContext
      audioContext.addEventListener('statechange', () => {
        const ready = isAlertSoundReady()

        soundListeners.forEach(listener => listener(ready))
      })
    } catch {
      return null
    }
  }

  return audioContext
}

const getAudio = (): HTMLAudioElement | null => {
  if (typeof window === 'undefined') return null

  if (!alertAudio) {
    alertAudio = new Audio(ALERT_SOUND)
    alertAudio.preload = 'auto'
  }

  return alertAudio
}

const loadBuffer = (context: AudioContext): Promise<AudioBuffer | null> => {
  if (alertBuffer) return Promise.resolve(alertBuffer)

  if (!bufferLoading) {
    bufferLoading = fetch(ALERT_SOUND)
      .then(response => response.arrayBuffer())
      .then(
        data =>
          new Promise<AudioBuffer>((resolve, reject) => {
            // The callback form, for older Safari
            context.decodeAudioData(data, resolve, reject)
          })
      )
      .then(buffer => (alertBuffer = buffer))
      .catch(error => {
        console.warn('Could not load the alert sound:', error)
        bufferLoading = null

        return null
      })
  }

  return bufferLoading
}

// resume() waits indefinitely when the browser will not allow it, so cap the wait
const tryResume = async (context: AudioContext): Promise<void> => {
  if (context.state === 'running') return

  await Promise.race([context.resume().catch(() => undefined), new Promise(resolve => setTimeout(resolve, 400))])
}

/** Whether the chime can play right now without anyone tapping first. */
export const isAlertSoundReady = (): boolean => {
  if (audioContext) return audioContext.state === 'running'

  return htmlAudioUnlocked
}

/** Hear about the chime becoming allowed, or being blocked again (iOS does that). */
export const onAlertSoundChange = (listener: (ready: boolean) => void): (() => void) => {
  soundListeners.add(listener)

  return () => {
    soundListeners.delete(listener)
  }
}

/**
 * Call from any tap, click or key press. Lets the chime play later, when an alert
 * arrives with the page sitting untouched. Safe to call as often as you like.
 */
export const unlockAlertSound = (): void => {
  const context = getContext()

  if (context) {
    // resume() has to be called inside the tap itself, so no await before it
    if (context.state !== 'running') {
      context
        .resume()
        .then(() => soundListeners.forEach(listener => listener(isAlertSoundReady())))
        .catch(() => undefined)

      // iOS also wants a sound started inside the tap: one silent sample
      try {
        const source = context.createBufferSource()

        source.buffer = context.createBuffer(1, 1, 22050)
        source.connect(context.destination)
        source.start(0)
      } catch {
        // Not needed elsewhere
      }
    }

    loadBuffer(context)

    return
  }

  const audio = getAudio()

  if (!audio || htmlAudioUnlocked) return

  audio.muted = true
  audio
    .play()
    .then(() => {
      audio.pause()
      audio.currentTime = 0
      htmlAudioUnlocked = true
      soundListeners.forEach(listener => listener(true))
    })
    .catch(() => undefined)
    .finally(() => {
      audio.muted = false
    })
}

export const stopAlert = (): void => {
  if (currentSource) {
    try {
      currentSource.stop()
    } catch {
      // Already finished
    }

    currentSource = null
  }

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
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(VIBRATION)

  const context = getContext()

  if (context) {
    await tryResume(context)

    if (context.state === 'running') {
      const buffer = await loadBuffer(context)

      if (buffer) {
        // Not stopAlert(): that would also cancel the vibration just started
        try {
          currentSource?.stop()
        } catch {
          // Already finished
        }

        const source = context.createBufferSource()

        source.buffer = buffer
        source.connect(context.destination)
        source.start(0)
        currentSource = source

        return true
      }
    }
  }

  const audio = getAudio()

  if (!audio) return false

  audio.muted = false
  audio.volume = 1
  audio.loop = false
  audio.currentTime = 0

  try {
    await audio.play()
    htmlAudioUnlocked = true

    return true
  } catch {
    return false
  }
}
