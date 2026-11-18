'use client'

// React Imports
import { useCallback, useEffect, useRef, useState } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'

// MUI Imports
import IconButton from '@mui/material/IconButton'
import Badge from '@mui/material/Badge'
import Popper from '@mui/material/Popper'
import Fade from '@mui/material/Fade'
import Paper from '@mui/material/Paper'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { Theme } from '@mui/material/styles'

// Third-party Imports
import classnames from 'classnames'
import { Query } from 'appwrite'
import { toast } from 'react-toastify'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'

// Config Imports
import themeConfig from '@configs/themeConfig'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'

// Context Imports
import { useAuth } from '@/contexts/AppwriteProvider'

// Lib Imports
import { appwriteConfig, client, databases } from '@/libs/appwrite.config'
import { OFFICE_RECIPIENT, isOfficeRole } from '@/libs/notifications/shared'
import {
  ALERT_DURATION_MS,
  enablePush,
  getPushStatus,
  isAlertSoundReady,
  needsInstallForPush,
  onAlertSoundChange,
  playAlert,
  sendTestAlert,
  stopAlert,
  syncPushSubscription,
  unlockAlertSound
} from '@/libs/notifications/client'
import type { PushStatus } from '@/libs/notifications/client'
import {
  NOTIFICATION_DONE,
  notificationIdFor,
  recordIdFor,
  resolveNotification
} from '@/libs/notifications/resolve'

interface NotificationItem {
  id: string
  kind: string
  title: string
  body: string
  url: string | null
  createdAt: number
}

const PROMPT_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000

// Any of these counts as a tap that lets the page make sound. A touch `pointerdown`
// does not, which is why listening for that alone left phones silent.
const GESTURE_EVENTS = ['pointerdown', 'pointerup', 'click', 'touchend', 'keydown'] as const

// Links to a review queue mean the upload still has to be checked; anything else
// is just news, done with once someone has opened it.
const needsReview = (item: Pick<NotificationItem, 'url'>) => Boolean(item.url?.includes('/review'))

// Take a dealt-with alert off this device's notification bar too.
const closeSystemNotification = (tag: string) => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

  navigator.serviceWorker
    .getRegistration('/')
    .then(registration => registration?.getNotifications({ tag }))
    .then(list => list?.forEach(notification => notification.close()))
    .catch(() => undefined)
}

/**
 * Of the uploads in the bell that link to a review queue, those already checked
 * (or since deleted). Covers anything verified before notifications were cleared
 * automatically, and any route to verifying that does not clear them itself.
 */
const findAlreadyReviewed = async (items: NotificationItem[]): Promise<string[]> => {
  const idsOf = (kind: string) =>
    items
      .filter(item => item.kind === kind && needsReview(item))
      .map(item => recordIdFor(item.id))
      .filter((id): id is string => Boolean(id))

  const check = async (
    collectionId: string,
    ids: string[],
    fields: string[],
    awaiting: (record: any) => boolean
  ): Promise<string[]> => {
    if (ids.length === 0) return []

    const response = await databases.listDocuments(appwriteConfig.database, collectionId, [
      Query.equal('$id', ids),
      Query.select(['$id', ...fields]),
      Query.limit(ids.length)
    ])

    const pending = new Set(response.documents.filter(awaiting).map(record => record.$id))

    return ids.filter(id => !pending.has(id)).map(notificationIdFor)
  }

  const [manifests, returns] = await Promise.all([
    check(
      appwriteConfig.manifests,
      idsOf('manifest_delivered'),
      ['detailsVerified', 'packageSize', 'packageCount'],
      record => record.detailsVerified !== true && (!record.packageSize || !record.packageCount)
    ),
    check(
      appwriteConfig.returnwaybills,
      idsOf('return_logged'),
      ['detailsVerified', 'packageCount'],
      record => record.detailsVerified !== true && !record.packageCount
    )
  ])

  return [...manifests, ...returns]
}

const iconFor = (kind: string): { icon: string; color: 'success' | 'warning' | 'info' } => {
  if (kind === 'manifest_delivered') return { icon: 'ri-truck-line', color: 'success' }
  if (kind === 'return_logged') return { icon: 'ri-arrow-go-back-line', color: 'warning' }

  return { icon: 'ri-notification-2-line', color: 'info' }
}

const timeAgo = (timestamp: number): string => {
  const minutes = Math.floor((Date.now() - timestamp) / 60000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h ago`

  return new Date(timestamp).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const fromDocument = (doc: any): NotificationItem => ({
  id: doc.$id,
  kind: doc.type,
  title: doc.subject || 'Notification',
  body: doc.message || '',
  url: doc.link || null,
  createdAt: new Date(doc.$createdAt).getTime()
})

const readStored = (key: string): number => {
  try {
    return Number(window.localStorage.getItem(key)) || 0
  } catch {
    return 0
  }
}

const writeStored = (key: string, value: number) => {
  try {
    window.localStorage.setItem(key, String(value))
  } catch {
    // Private mode / blocked storage: the badge just resets on reload.
  }
}

/**
 * The navbar bell, wired to real data.
 *
 * For office roles it lists what drivers have uploaded, and the moment a new
 * upload arrives - over Appwrite Realtime while the app is open, over web-push
 * when it is not - it sounds a chime, vibrates and shows a toast. It is also
 * where a device is switched on for push alerts.
 */
const LiveNotifications = () => {
  const { user } = useAuth()
  const router = useRouter()
  const { settings } = useSettings()
  const isSmallScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'))

  const isOffice = isOfficeRole(user?.role?.name)
  const userId: string | undefined = user?.$id
  const seenKey = `edms:notifications:seen:${userId}`
  const snoozeKey = `edms:notifications:prompt-snoozed:${userId}`

  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [lastSeen, setLastSeen] = useState(0)
  const [pushStatus, setPushStatus] = useState<PushStatus>('off')
  const [promptOpen, setPromptOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [ringing, setRinging] = useState(false)
  const [soundReady, setSoundReady] = useState(true)

  const anchorRef = useRef<HTMLButtonElement>(null)
  const handledIds = useRef(new Set<string>())
  const pushStatusRef = useRef<PushStatus>('off')

  pushStatusRef.current = pushStatus

  const unreadCount = items.filter(item => item.createdAt > lastSeen).length

  // Take items out of the list here, and out of the notification bar.
  const dropItems = useCallback((ids: string[]) => {
    if (ids.length === 0) return

    const gone = new Set(ids)

    setItems(prev => prev.filter(item => !gone.has(item.id)))
    ids.forEach(closeSystemNotification)
  }, [])

  // Done with: gone from every office device's bell, over Realtime.
  const markDone = useCallback(
    (ids: string[]) => {
      dropItems(ids)
      ids.forEach(id => resolveNotification(id))
    },
    [dropItems]
  )

  const openItem = useCallback(
    (item: Pick<NotificationItem, 'id' | 'url'>) => {
      stopAlert()
      setRinging(false)
      setOpen(false)

      // Uploads waiting on a review stay until they are checked; the rest are read
      if (item.id && !needsReview(item)) markDone([item.id])

      if (item.url) router.push(item.url)
    },
    [router, markDone]
  )

  // A new upload has arrived, by whichever road got here first.
  const handleIncoming = useCallback(
    (item: NotificationItem, viaRealtime: boolean) => {
      if (handledIds.current.has(item.id)) return
      handledIds.current.add(item.id)

      if (item.kind !== 'test') {
        setItems(prev => (prev.some(existing => existing.id === item.id) ? prev : [item, ...prev].slice(0, 50)))
      }

      setRinging(true)
      playAlert().then(played => {
        if (!played) setRinging(false)
      })
      window.setTimeout(() => setRinging(false), ALERT_DURATION_MS)

      toast.info(
        <div>
          <strong>{item.title}</strong>
          <div>{item.body}</div>
        </div>,
        {
          toastId: item.id,
          autoClose: 15000,
          onClick: () => openItem(item)
        }
      )

      // No push on this device: raise the system notification ourselves so a
      // hidden tab or minimised window still gets noticed.
      if (
        viaRealtime &&
        document.hidden &&
        pushStatusRef.current !== 'on' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        navigator.serviceWorker
          ?.getRegistration('/')
          .then(registration =>
            registration?.showNotification(item.title, {
              body: item.body,
              icon: '/icons/icon-192.png',
              badge: '/icons/badge-96.png',
              tag: item.id,
              renotify: true,
              requireInteraction: true,
              // Make the phone's own notification sound and buzz, like a push does
              silent: false,
              vibrate: [600, 200, 600, 200, 600, 400, 600, 200, 600, 200, 600],
              data: { url: item.url || '/', id: item.id }
            } as NotificationOptions)
          )
          .catch(() => undefined)
      }
    },
    [openItem]
  )

  // Initial list + live updates.
  useEffect(() => {
    if (!isOffice || !userId) return

    setLastSeen(readStored(seenKey))

    let cancelled = false

    databases
      .listDocuments(appwriteConfig.database, appwriteConfig.notifications, [
        Query.equal('recipient', OFFICE_RECIPIENT),
        Query.notEqual('status', NOTIFICATION_DONE),
        Query.orderDesc('$createdAt'),
        Query.limit(30)
      ])
      .then(response => {
        if (cancelled) return

        const loaded = response.documents.map(fromDocument)

        loaded.forEach(item => handledIds.current.add(item.id))
        setItems(prev => {
          const fresh = prev.filter(item => !loaded.some(existing => existing.id === item.id))

          return [...fresh, ...loaded]
        })

        return findAlreadyReviewed(loaded).then(reviewed => {
          if (!cancelled) markDone(reviewed)
        })
      })
      .catch(error => console.warn('Could not load notifications:', error))

    const unsubscribe = client.subscribe(
      `databases.${appwriteConfig.database}.collections.${appwriteConfig.notifications}.documents`,
      (event: any) => {
        const names: string[] = event.events || []
        const payload = event.payload

        if (payload?.recipient !== OFFICE_RECIPIENT) return

        // Dealt with on this or another device: clear it here too
        if (
          names.some(name => name.endsWith('.delete')) ||
          (names.some(name => name.endsWith('.update')) && payload.status === NOTIFICATION_DONE)
        ) {
          dropItems([payload.$id])

          return
        }

        if (names.some(name => name.endsWith('.create'))) handleIncoming(fromDocument(payload), true)
      }
    )

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [isOffice, userId, seenKey, handleIncoming, dropItems, markDone])

  // Push messages relayed by the service worker while a window is open.
  useEffect(() => {
    if (!isOffice || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'edms:push' || !event.data.payload) return

      const payload = event.data.payload

      handleIncoming(
        {
          id: payload.id,
          kind: payload.kind,
          title: payload.title,
          body: payload.body,
          url: payload.url || null,
          createdAt: payload.timestamp || Date.now()
        },
        false
      )
    }

    navigator.serviceWorker.addEventListener('message', onMessage)

    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [isOffice, handleIncoming])

  // Let the chime play later without a fresh tap, and work out where push stands.
  useEffect(() => {
    if (!isOffice || !userId) return

    // Every tap tries again until the browser lets the chime play. Cheap once it has.
    const unlock = () => {
      if (!isAlertSoundReady()) unlockAlertSound()
    }

    GESTURE_EVENTS.forEach(name => window.addEventListener(name, unlock, { capture: true, passive: true }))

    const stopWatching = onAlertSoundChange(setSoundReady)

    // Some browsers allow sound straight away on a site used often; give them a
    // moment to say so before asking for a tap.
    const firstCheck = window.setTimeout(() => {
      unlockAlertSound()
      setSoundReady(isAlertSoundReady())
    }, 1500)

    getPushStatus(userId).then(status => {
      setPushStatus(status)

      if (status === 'on') syncPushSubscription(userId)

      if (status === 'off' && Date.now() - readStored(snoozeKey) > PROMPT_SNOOZE_MS) setPromptOpen(true)
    })

    return () => {
      GESTURE_EVENTS.forEach(name => window.removeEventListener(name, unlock, { capture: true }))
      stopWatching()
      window.clearTimeout(firstCheck)
    }
  }, [isOffice, userId, snoozeKey])

  const markAllSeen = useCallback(() => {
    const now = Date.now()

    setLastSeen(now)
    writeStored(seenKey, now)
  }, [seenKey])

  const handleToggle = () => {
    stopAlert()
    setRinging(false)
    setOpen(prev => {
      // Closing the menu is what marks its contents as read.
      if (prev) markAllSeen()

      return !prev
    })
  }

  const handleClose = () => {
    if (open) markAllSeen()
    setOpen(false)
  }

  const handleEnable = async () => {
    try {
      setBusy(true)
      unlockAlertSound()

      if (!userId) return

      const status = await enablePush(userId)

      setPushStatus(status)
      setPromptOpen(false)

      if (status === 'on') toast.success('Alerts are on for this device')
      else if (status === 'denied') toast.error('Notifications are blocked. Allow them in the browser site settings.')
    } catch (error: any) {
      console.error('Error enabling push:', error)
      toast.error(error?.message || 'Could not turn on alerts')
    } finally {
      setBusy(false)
    }
  }

  const handleTest = async () => {
    try {
      setBusy(true)
      setRinging(true)
      await playAlert()
      window.setTimeout(() => setRinging(false), ALERT_DURATION_MS)

      if (pushStatus === 'on') await sendTestAlert()
    } catch (error: any) {
      toast.error(error?.message || 'Could not send the test alert')
    } finally {
      setBusy(false)
    }
  }

  const snoozePrompt = () => {
    writeStored(snoozeKey, Date.now())
    setPromptOpen(false)
  }

  const pushPanel = () => {
    if (pushStatus === 'on') {
      return (
        <div className='flex items-center gap-2 plb-2 pli-4'>
          <Chip size='small' variant='tonal' color='success' icon={<i className='ri-volume-up-line' />} label='Alerts on' />
          <Typography variant='caption' color='text.secondary' className='flex-auto'>
            This device rings when a driver uploads.
          </Typography>
          <Button size='small' onClick={handleTest} disabled={busy}>
            Test
          </Button>
        </div>
      )
    }

    const message =
      pushStatus === 'denied'
        ? "Notifications are blocked for this site. Allow them in the browser's site settings to get alerts."
        : pushStatus === 'unsupported'
          ? needsInstallForPush()
            ? 'On iPhone or iPad, add this app to the Home Screen (Share → Add to Home Screen), then open it from there to turn on alerts.'
            : 'This browser cannot receive push alerts. The app still rings while it is open.'
          : pushStatus === 'unconfigured'
            ? 'Push is not set up on the server yet. The app still rings while it is open.'
            : 'Turn on alerts to be notified, with sound and vibration, even when the app is closed.'

    return (
      <Alert
        severity={pushStatus === 'off' ? 'info' : 'warning'}
        className='mli-4 mlb-2'
        action={
          pushStatus === 'off' ? (
            <Button color='inherit' size='small' onClick={handleEnable} disabled={busy}>
              {busy ? <CircularProgress size={16} color='inherit' /> : 'Turn on'}
            </Button>
          ) : (
            <Button color='inherit' size='small' onClick={handleTest} disabled={busy}>
              Test
            </Button>
          )
        }
      >
        <Typography variant='caption'>{message}</Typography>
      </Alert>
    )
  }

  return (
    <>
      <IconButton ref={anchorRef} onClick={handleToggle} className='text-textPrimary' aria-label='Notifications'>
        <Badge
          color='error'
          className='cursor-pointer'
          badgeContent={unreadCount}
          max={99}
          overlap='circular'
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <i className={classnames(ringing ? 'ri-notification-3-fill text-error' : 'ri-notification-2-line')} />
        </Badge>
      </IconButton>

      <Popper
        open={open}
        transition
        disablePortal
        placement='bottom-end'
        anchorEl={anchorRef.current}
        {...(isSmallScreen
          ? {
              className: 'is-full !mbs-4 z-[1]',
              modifiers: [{ name: 'preventOverflow', options: { padding: themeConfig.layoutPadding } }]
            }
          : { className: 'is-96 !mbs-4 z-[1]' })}
      >
        {({ TransitionProps, placement }) => (
          <Fade {...TransitionProps} style={{ transformOrigin: placement === 'bottom-end' ? 'right top' : 'left top' }}>
            <Paper className={settings.skin === 'bordered' ? 'border shadow-none' : 'shadow-lg'}>
              <ClickAwayListener onClickAway={handleClose}>
                <div className='flex flex-col'>
                  <div className='flex items-center justify-between plb-3 pli-4 is-full gap-2'>
                    <Typography variant='h6' className='flex-auto'>
                      Notifications
                    </Typography>
                    {unreadCount > 0 && (
                      <Chip variant='tonal' size='small' color='primary' label={`${unreadCount} New`} />
                    )}
                    {isOffice && items.length > 0 && (
                      <Tooltip title='Mark all as done'>
                        <IconButton size='small' onClick={() => markDone(items.map(item => item.id))}>
                          <i className='ri-check-double-line text-xl' />
                        </IconButton>
                      </Tooltip>
                    )}
                  </div>
                  <Divider />

                  {isOffice && pushPanel()}
                  {isOffice && <Divider />}

                  <div className='overflow-y-auto' style={{ maxHeight: 'min(420px, calc(100vh - 260px))' }}>
                    {items.length === 0 ? (
                      <div className='flex flex-col items-center gap-2 plb-10 pli-4 text-center'>
                        <i className='ri-notification-off-line text-4xl text-textDisabled' />
                        <Typography color='text.secondary'>
                          {isOffice
                            ? 'Nothing waiting. New driver deliveries and returns will show here.'
                            : 'No notifications'}
                        </Typography>
                      </div>
                    ) : (
                      items.map((item, index) => {
                        const { icon, color } = iconFor(item.kind)
                        const unread = item.createdAt > lastSeen

                        return (
                          <div
                            key={item.id}
                            role='button'
                            tabIndex={0}
                            onClick={() => openItem(item)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') openItem(item)
                            }}
                            className={classnames('flex plb-3 pli-4 gap-3 cursor-pointer hover:bg-actionHover', {
                              'border-be': index !== items.length - 1
                            })}
                          >
                            <CustomAvatar color={color} skin='light-static'>
                              <i className={icon} />
                            </CustomAvatar>
                            <div className='flex flex-col flex-auto min-is-0'>
                              <Typography variant='body2' className='font-medium mbe-1' color='text.primary'>
                                {item.title}
                              </Typography>
                              <Typography variant='caption' className='mbe-1' color='text.secondary'>
                                {item.body}
                              </Typography>
                              <Typography variant='caption' color='text.disabled'>
                                {timeAgo(item.createdAt)}
                              </Typography>
                            </div>
                            <div className='flex flex-col items-center gap-2'>
                              {unread && <Badge variant='dot' color='primary' className='mbs-2 mie-1' />}
                              {isOffice && (
                                <Tooltip title='Mark as done'>
                                  <IconButton
                                    size='small'
                                    aria-label='Mark as done'
                                    onClick={e => {
                                      e.stopPropagation()
                                      markDone([item.id])
                                    }}
                                  >
                                    <i className='ri-check-line text-base' />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {isOffice && (
                    <>
                      <Divider />
                      <div className='flex gap-2 p-4'>
                        <Button
                          fullWidth
                          variant='contained'
                          size='small'
                          onClick={() => {
                            handleClose()
                            router.push('/edms/manifests/review')
                          }}
                        >
                          Open Review Queue
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>

      {/* First-run nudge: permission can only be requested from a tap. */}
      <Snackbar open={promptOpen && isOffice} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert
          severity='info'
          variant='filled'
          icon={<i className='ri-notification-3-line' />}
          action={
            <>
              <Button color='inherit' size='small' onClick={handleEnable} disabled={busy}>
                Turn on
              </Button>
              <Button color='inherit' size='small' onClick={snoozePrompt} disabled={busy}>
                Later
              </Button>
            </>
          }
        >
          Get a loud alert on this device when a driver uploads a delivery.
        </Alert>
      </Snackbar>

      {/* Browsers keep a page silent until it is tapped. Ask for that tap up front,
          instead of the chime staying silent until someone happens to press the bell. */}
      <Snackbar open={isOffice && !soundReady && !promptOpen} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert
          severity='warning'
          variant='filled'
          icon={<i className='ri-volume-mute-line' />}
          action={
            <Button
              color='inherit'
              size='small'
              onClick={() => {
                unlockAlertSound()
                playAlert()
              }}
            >
              Turn on sound
            </Button>
          }
        >
          The alert sound is off until you tap this screen.
        </Alert>
      </Snackbar>
    </>
  )
}

export default LiveNotifications
