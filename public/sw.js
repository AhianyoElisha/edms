/*
 * Ezar Delivery Services - service worker.
 *
 * Two jobs only:
 *   1. Receive web-push messages and raise a loud, vibrating notification.
 *   2. Show a friendly page when the app is opened with no connection.
 *
 * It deliberately does NOT cache Next.js chunks or API responses. A service worker
 * that answers chunk requests from cache serves stale bundles after every deploy
 * (see "Gotcha: stale bundles" in FIELD_MANIFEST_CAPTURE.md), and this app's data
 * must always be live.
 */

const CACHE = 'edms-shell-v1'
const OFFLINE_URL = '/offline.html'
const PRECACHE = [OFFLINE_URL, '/icons/icon-192.png']

// Long, insistent pattern: three long buzzes, pause, three long buzzes.
const VIBRATION = [600, 200, 600, 200, 600, 400, 600, 200, 600, 200, 600]

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      // Only ever remove this app's own old caches.
      .then(keys => Promise.all(keys.filter(k => k.startsWith('edms-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  // Page navigations only: go to the network, fall back to the offline page.
  if (event.request.mode !== 'navigate') return

  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)))
})

self.addEventListener('push', event => {
  let payload = {}

  try {
    payload = event.data ? event.data.json() : {}
  } catch (error) {
    payload = { title: 'Ezar Delivery Services', body: event.data ? event.data.text() : '' }
  }

  const title = payload.title || 'Ezar Delivery Services'

  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    image: payload.image || undefined,
    // One notification per event; renotify makes a replacement buzz again.
    tag: payload.id || `edms-${Date.now()}`,
    renotify: true,
    // Stay on screen until someone deals with it.
    requireInteraction: true,
    silent: false,
    vibrate: VIBRATION,
    timestamp: payload.timestamp || Date.now(),
    data: { url: payload.url || '/', id: payload.id || null }
  }

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      // Any open window plays the alert chime itself, at full volume.
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        clients.forEach(client => client.postMessage({ type: 'edms:push', payload }))
      })
    ])
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()

  const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(client => new URL(client.url).origin === self.location.origin)

      if (existing) {
        return existing.focus().then(client => {
          if (client && 'navigate' in client) return client.navigate(target).catch(() => undefined)
        })
      }

      return self.clients.openWindow(target)
    })
  )
})
