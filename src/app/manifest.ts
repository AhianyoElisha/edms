// Next Imports
import type { MetadataRoute } from 'next'

/**
 * Web app manifest - what makes the app installable to a phone's home screen
 * or a desktop. Served by Next at /manifest.webmanifest.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Ezar Delivery Services',
    short_name: 'Ezar EDMS',
    description: 'Trips, manifests, deliveries and expenses for Ezar Delivery Services',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#12233f',
    theme_color: '#12233f',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ],
    shortcuts: [
      { name: 'Manifests needing review', short_name: 'Review', url: '/edms/manifests/review' },
      { name: 'Trips', short_name: 'Trips', url: '/edms/trips' }
    ]
  }
}
