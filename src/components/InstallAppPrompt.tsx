'use client'

// React Imports
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

// MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'

/**
 * Asks people to install the app on their device, and asks again every few days
 * until they do.
 *
 * - Chrome, Edge, Samsung Internet (Android and desktop): one tap on "Install"
 *   brings up the browser's own install prompt.
 * - iPhone / iPad: there is no install prompt on iOS, so the steps are shown.
 * - Firefox on Android: the steps for its menu are shown.
 *
 * "Later" (or closing the dialog) hides it for REMIND_EVERY_MS. Nothing shows once
 * the app is running installed, or after the browser reports it was installed.
 */

const REMIND_EVERY_MS = 5 * 24 * 60 * 60 * 1000

// Give the page a moment before putting a dialog in front of it
const SHOW_AFTER_MS = 4000

const LATER_KEY = 'edms:install:later'
const INSTALLED_KEY = 'edms:install:installed'

type Platform = 'prompt' | 'ios' | 'android-menu'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window {
    // Caught by the inline script in the root layout, in case the browser offers
    // the install before this component has mounted
    __edmsInstallPrompt?: InstallPromptEvent | null
  }
}

const readNumber = (key: string): number => {
  try {
    return Number(window.localStorage.getItem(key)) || 0
  } catch {
    return 0
  }
}

const writeNumber = (key: string, value: number) => {
  try {
    window.localStorage.setItem(key, String(value))
  } catch {
    // Storage blocked: the reminder simply comes back on the next visit
  }
}

const isInstalled = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.matchMedia('(display-mode: fullscreen)').matches ||
  window.matchMedia('(display-mode: minimal-ui)').matches ||
  (navigator as any).standalone === true

const isIos = (): boolean =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

const isAndroidFirefox = (): boolean => /android/i.test(navigator.userAgent) && /firefox/i.test(navigator.userAgent)

// Apps like WhatsApp and Facebook open links in their own browser, which cannot install
const isInAppBrowser = (): boolean => /FBAN|FBAV|Instagram|WhatsApp|Line\/|Snapchat|TikTok/i.test(navigator.userAgent)

const Step = ({ number, children }: { number: number; children: ReactNode }) => (
  <div className='flex items-start gap-3'>
    <div
      className='flex items-center justify-center rounded-full shrink-0 is-7 bs-7 text-sm font-medium'
      style={{ background: 'var(--mui-palette-primary-lightOpacity)', color: 'var(--mui-palette-primary-main)' }}
    >
      {number}
    </div>
    <Typography className='pbs-0.5'>{children}</Typography>
  </div>
)

const InstallAppPrompt = () => {
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [open, setOpen] = useState(false)
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    if (isInstalled() || readNumber(INSTALLED_KEY)) return

    const due = () => Date.now() - readNumber(LATER_KEY) > REMIND_EVERY_MS
    let timer: number | undefined

    const showSoon = (kind: Platform) => {
      setPlatform(kind)

      if (!due()) return

      window.clearTimeout(timer)
      timer = window.setTimeout(() => setOpen(true), SHOW_AFTER_MS)
    }

    const onPrompt = (event: Event) => {
      event.preventDefault()
      window.__edmsInstallPrompt = event as InstallPromptEvent
      setInstallEvent(event as InstallPromptEvent)
      showSoon('prompt')
    }

    const onInstalled = () => {
      writeNumber(INSTALLED_KEY, Date.now())
      window.__edmsInstallPrompt = null
      setOpen(false)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)

    if (window.__edmsInstallPrompt) {
      setInstallEvent(window.__edmsInstallPrompt)
      showSoon('prompt')
    } else if (isIos() || isInAppBrowser()) {
      showSoon('ios')
    } else if (isAndroidFirefox()) {
      showSoon('android-menu')
    }

    // Anything else (desktop Firefox or Safari, or Chrome with the app already
    // installed) waits for the browser to offer the install, and stays quiet if it never does

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const later = () => {
    writeNumber(LATER_KEY, Date.now())
    setOpen(false)
  }

  const install = async () => {
    if (!installEvent) return

    try {
      setInstalling(true)
      await installEvent.prompt()

      const { outcome } = await installEvent.userChoice

      // The browser's prompt can be used only once
      window.__edmsInstallPrompt = null
      setInstallEvent(null)

      if (outcome === 'accepted') {
        writeNumber(INSTALLED_KEY, Date.now())
        setOpen(false)
      } else {
        later()
      }
    } catch {
      later()
    } finally {
      setInstalling(false)
    }
  }

  if (!platform) return null

  const inAppBrowser = platform === 'ios' && isInAppBrowser() && !isIos()

  return (
    <Dialog open={open} onClose={later} maxWidth='xs' fullWidth>
      <DialogContent className='flex flex-col gap-5 pbs-8'>
        <div className='flex flex-col items-center text-center gap-3'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src='/icons/icon-192.png' alt='' width={64} height={64} className='rounded-xl' />
          <Typography variant='h5'>Install the Ezar EDMS app</Typography>
          <Typography color='text.secondary'>
            Open it straight from your home screen, full screen and faster, and get delivery alerts with sound even
            when the app is closed.
          </Typography>
        </div>

        {platform === 'ios' && (
          <div className='flex flex-col gap-3'>
            {inAppBrowser ? (
              <Step number={1}>
                Open this page in <strong>Chrome</strong> or your phone&apos;s main browser first. This in-app browser
                cannot install apps.
              </Step>
            ) : (
              <>
                <Step number={1}>
                  Tap the <strong>Share</strong> button <i className='ri-share-box-line align-middle text-lg' /> in
                  Safari: at the bottom of the screen on iPhone, at the top on iPad.
                </Step>
                <Step number={2}>
                  Scroll down and tap <strong>Add to Home Screen</strong>{' '}
                  <i className='ri-add-box-line align-middle text-lg' />.
                </Step>
                <Step number={3}>
                  Tap <strong>Add</strong>, then open <strong>Ezar EDMS</strong> from your home screen.
                </Step>
              </>
            )}
            {!inAppBrowser && (
              <Typography variant='caption' color='text.secondary'>
                Opened this page from WhatsApp or another app? Open it in Safari first.
              </Typography>
            )}
          </div>
        )}

        {platform === 'android-menu' && (
          <div className='flex flex-col gap-3'>
            <Step number={1}>
              Tap the menu button <i className='ri-more-2-fill align-middle text-lg' /> in the browser.
            </Step>
            <Step number={2}>
              Tap <strong>Install</strong> or <strong>Add to Home screen</strong>.
            </Step>
            <Step number={3}>
              Open <strong>Ezar EDMS</strong> from your home screen.
            </Step>
          </div>
        )}
      </DialogContent>

      <DialogActions className='pbe-6 pli-6 gap-2'>
        <Button onClick={later} color='secondary' disabled={installing}>
          Later
        </Button>
        {platform === 'prompt' ? (
          <Button variant='contained' onClick={install} disabled={installing || !installEvent}>
            {installing ? <CircularProgress size={18} color='inherit' /> : 'Install'}
          </Button>
        ) : (
          <Button variant='contained' onClick={later}>
            Got it
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default InstallAppPrompt
