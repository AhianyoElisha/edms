'use client'

// React Imports
import { useEffect, useState } from 'react'

// MUI Imports
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'

// The build this tab was loaded from (set at build time in next.config.mjs)
const LOADED_BUILD = process.env.NEXT_PUBLIC_BUILD_ID || 'dev'

const CHECK_EVERY_MS = 5 * 60 * 1000

/**
 * Tells someone with a long-open tab that a newer version has been deployed.
 *
 * A tab keeps running the code it was opened with, so a fix does not reach it
 * until the page is reloaded. This asks the server which build is live (every few
 * minutes, and whenever the tab is looked at again) and offers a reload when it is
 * not the one this tab is running. It never reloads by itself: someone may be
 * half-way through a form.
 */
const NewVersionBanner = () => {
  const [stale, setStale] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Local development rebuilds constantly; the check would only be noise there
    if (LOADED_BUILD === 'dev' || LOADED_BUILD.startsWith('local-')) return

    let cancelled = false

    const check = async () => {
      if (document.visibilityState !== 'visible') return

      try {
        const response = await fetch('/api/version', { cache: 'no-store' })

        if (!response.ok) return

        const { buildId } = await response.json()

        if (!cancelled && buildId && buildId !== LOADED_BUILD) setStale(true)
      } catch {
        // Offline or mid-deploy: try again on the next round
      }
    }

    const timer = setInterval(check, CHECK_EVERY_MS)

    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)

    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [])

  return (
    <Snackbar open={stale && !dismissed} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
      <Alert
        severity='info'
        variant='filled'
        icon={<i className='ri-refresh-line' />}
        action={
          <>
            <Button color='inherit' size='small' onClick={() => window.location.reload()}>
              Reload
            </Button>
            <Button color='inherit' size='small' onClick={() => setDismissed(true)}>
              Later
            </Button>
          </>
        }
      >
        A new version is available. Reload to get the latest fixes.
      </Alert>
    </Snackbar>
  )
}

export default NewVersionBanner
