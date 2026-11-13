# Installable app + upload alerts — setup

Added November 2026. The app is now a PWA, and the office is alerted (sound,
vibration, system notification) when a driver uploads a delivery or a return.

## One-time setup

1. **Database** — additive changes only; safe to re-run.

   ```
   node scripts/apply-schema-2026-11.js            # dry run
   node scripts/apply-schema-2026-11.js --apply
   ```

   Adds `manifests.shortageCount`, `manifests.clientName`, `notifications.link`
   and a `pushsubscriptions` collection. For the self-hosted instance, add
   `--endpoint=<url> --key-env=VPS_APPWRITE_API_KEY`.

2. **Push keys** — set these three on the hosting platform, then redeploy
   (`NEXT_PUBLIC_*` is baked in at build time). `.env.local` already has a pair
   for local use; production should use the same pair everywhere it runs, or
   devices have to switch alerts on again.

   ```
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=
   VAPID_PRIVATE_KEY=
   VAPID_SUBJECT=https://<your domain>
   ```

   Generate a pair with `npx web-push generate-vapid-keys`.

3. **Each office device** — sign in, tap **Turn on** in the prompt (or in the
   bell menu), then **Test**. On iPhone/iPad the app must first be added to the
   Home Screen and opened from there. The site must be served over HTTPS.

## How an alert travels

`LogDeliveryDialog` / `LogReturnDialog` / manifest submit → `POST /api/push/notify`
with the record id → the server builds the text from the stored record, writes a
`notifications` document and web-pushes every office subscription.

- App open: Appwrite Realtime delivers the new document; the page plays
  `public/sounds/delivery-alert.wav` (a soft two-note chime, rung twice) at full
  volume, vibrates
  and shows a toast.
- App closed: `public/sw.js` shows a system notification with a long vibration
  pattern. **Its sound is the phone's own notification sound** — a website
  cannot choose or amplify that. For the app's own chime, keep the app open (it can
  be in the background).

Who is alerted: roles in `OFFICE_ROLES` (`src/libs/notifications/shared.ts`),
or `PUSH_NOTIFY_ROLES` on the server.

## Why the notify route takes no login

The app signs in entirely in the browser and this Appwrite project has JWT auth
disabled, so the route cannot identify its caller. It is safe because it trusts
nothing but a record id: text comes from the database, the record must be under
15 minutes old, each record can alert once (deterministic notification id), and
push only goes to subscription rows whose Appwrite-stamped owner is a current
office user. See the header of `src/libs/notifications/server.ts`.

## Service worker

`sw.js` handles push and an offline page only. It does not cache Next.js chunks
or data — see the stale-bundle gotcha in `FIELD_MANIFEST_CAPTURE.md`.
