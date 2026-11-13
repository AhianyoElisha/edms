'use client'

// React Imports
import { useEffect } from 'react'

// Lib Imports
import { registerServiceWorker } from '@/libs/notifications/client'

/**
 * Registers the service worker on every page (including the login screen) so
 * the app is installable and can receive push alerts. Renders nothing.
 */
const PwaRegister = () => {
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return null
}

export default PwaRegister
