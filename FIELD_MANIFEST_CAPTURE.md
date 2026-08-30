# Field Manifest Capture — Driver One-Touch Delivery Logging

## The problem this solves

Trucks are loaded at dawn. The admin isn't on the ground at that hour, so trips are
created without manifests (`status: awaiting_manifests`) — the admin has no manifest
details to enter yet. The drivers are the ones who physically receive the manifests,
but the only route into the system was `/edms/trips/[id]/add-manifests`, which:

- required `manifests.create` / `trips.edit` — permissions **drivers don't hold**, so
  drivers could not use it at all;
- demanded manifest number, package size, package count ≥ 1, estimated arrival and
  notes for **every** manifest, and hard-blocked submit if any were missing;
- and at delivery time, `ManifestView` refused to submit until the driver had also
  opened "Update Count" and typed a delivered figure.

Drivers were being asked to do the back office's data entry, standing at a dropoff.

## The new flow

**Driver — one touch, at the dropoff.**

1. Opens the trip, taps **Log Delivery** (a green, thumb-sized target both in the
   header and as a dedicated card).
2. Picks the stop from the route's dropoff list — stops already logged are marked.
3. Takes one photo of the signed manifest (camera-first, gallery as fallback).
4. Submits.

That single action creates the manifest **and** closes it out as `delivered`, with the
photo stored as both `manifestImage` and `proofOfDeliveryImage`. No manifest number, no
package size, no counts. The trip checkpoint is written and the trip status advances.

**Admin — catches up later, never blocks the driver.**

- `/edms/manifests/review` lists every field-captured manifest awaiting figures, newest
  first, with the photo beside the fields. Filterable by trip, searchable by trip
  number, driver, vehicle or stop.
- The admin reads the paper off the photo, enters manifest number, package size, total
  packages and (optionally) a delivered count, then hits **Save & Verify**.
- Verifying syncs the trip checkpoint figures and recomputes the trip's `totalPackages`.
- Trip detail pages show an amber banner with a direct link when any of their manifests
  are awaiting review.

## Appwrite schema changes — APPLIED 2026-08-19

These were applied to the live **`manifests`** collection (`68e79442002f72bd0769`) and
verified as `available`. Kept here as the record of what changed.

### Add these attributes

| Attribute         | Type     | Required | Default | Size |
| ----------------- | -------- | -------- | ------- | ---- |
| `detailsVerified` | boolean  | No       | `false` | —    |
| `verifiedAt`      | datetime | No       | —       | —    |
| `verifiedBy`      | string   | No       | —       | 200  |

### Make these attributes optional

Both are currently required, which would reject a manifest captured in the field:

| Attribute      | Change                                     |
| -------------- | ------------------------------------------ |
| `packageSize`  | required → **optional** (nullable)         |
| `packageCount` | required → **optional**, default `0`       |

### Note on existing data — verified against the live database

The concern was that Appwrite would backfill `detailsVerified = false` on documents
predating the attribute and sweep every historical manifest into the review queue. It
does **not**: all 638 existing manifests were left `null`, so the queue's server-side
`Query.equal('detailsVerified', false)` returns none of them. Field-captured manifests
set `detailsVerified: false` explicitly, so they still match.

The queue applies a second condition anyway — `isManifestAwaitingVerification()` in
`src/libs/actions/manifest.actions.ts` — which also requires the package figures to be
missing. Both conditions were checked against all 638 rows: none has a falsy
`packageCount` or a missing `packageSize`, so nothing historical is misread as
field-captured, in the queue or in `checkAndUpdateTripStatus()`.

Post-change verification: review queue returns **0** rows, as expected until a driver
logs the first field delivery.

## What changed in code

**Actions** — `src/libs/actions/manifest.actions.ts`

- `logManifestDelivery()` — creates + completes a manifest from a stop and a photo.
- `verifyManifestDetails()` — admin fills the figures, marks verified, syncs checkpoint
  and the trip's package total. The trip id is read from a fresh `getDocument`, **not**
  from the `updateDocument` response: Appwrite omits the `trip` relationship from that
  response, so taking it from there left `tripId` undefined and skipped the entire
  checkpoint/totals sync without throwing — the admin saw a success toast while the trip
  kept the driver's temporary manifest number and a zero package total. Caught in
  end-to-end testing, 2026-08-19. `markManifestAsDelivered()` already guarded against
  this (`existingManifest.trip || manifest.trip`); this function now follows suit.
- `getManifestsAwaitingVerification()` — the review queue's data source.
- `isManifestAwaitingVerification()` — the shared "needs review" predicate.
- `markManifestAsDelivered()` — no longer requires a delivered count. Where the office
  planned a package count and the driver reported no shortfall, the manifest is taken
  as fully delivered.

**Trip status** — `src/libs/actions/trip.actions.ts`

- `awaiting_manifests` now advances to `in_progress` once the driver logs a stop.
- Field-captured trips no longer auto-complete after the first stop. Because their
  manifests appear one at a time, "all manifests delivered" is trivially true early on;
  completion now also requires every dropoff stop on the route to be covered
  (`countRouteDropoffStops()`). A manifest counts as field-captured only when it is
  unverified **and** carries no package figures — keying on `detailsVerified` alone would
  match every admin-created manifest (Appwrite backfills the attribute as `false`) and
  stop ordinary trips auto-completing whenever they serve fewer stops than their route lists.
- Trip package totals tolerate a missing `packageCount`, which otherwise made
  `totalPackages` `NaN` when an admin edited a trip holding a field-captured manifest.

**UI**

- `src/views/edms/trips/LogDeliveryDialog.tsx` (new) — the driver capture flow,
  full-screen on phones.
- `src/views/edms/manifests/ManifestReviewQueue.tsx` (new) — the admin queue.
- `src/app/(dashboard)/(apps)/edms/manifests/review/page.tsx` (new) — its route.
- `src/views/edms/trips/view/index.tsx` — Log Delivery entry points, admin review
  banner, "Needs review" chips, and "Pending office entry" instead of a misleading
  `0 packages`.
- `src/views/edms/manifests/view/index.tsx` — submit gated on the photo alone; the
  package figures card is replaced by a "Package details pending" panel while
  unverified; "Update Count" reads "Report Shortage" for drivers and is optional.
- `src/components/layout/vertical/VerticalMenu.tsx` — Manifests → **Needs Review**, gated
  on `manifests.edit` / `manifests.manage`, so the queue has a home in the sidebar. (This
  is the menu the app actually renders; `src/data/navigation/verticalMenuData.tsx` is not
  imported anywhere, so editing it alone changes nothing on screen.)
- `src/views/edms/manifests/ManifestOverviewTable.tsx` — "Needs review" chip and
  "Packages: pending" instead of a misleading `0 Small`.
- `src/views/edms/trips/edit/StepEditReview.tsx` — a field-captured manifest has no
  `packageSize`, which crashed the edit wizard's review step on `.charAt()`; it now shows
  a "Pending review" chip.
- `src/hooks/usePermissions.ts` — drivers gain `manifests.create` in the role fallback.

## Permissions

The driver capture UI is gated on `isDriver || deliveries.proof || manifests.create`, so
it works whether permissions come from the database or the role fallback. The live
`rolePermissions` records **already grant the driver role `manifests.create`** (verified
against the database), so no data change is needed.

The review queue requires `manifests.edit` or `manifests.manage` **and** a non-driver
role. The extra `!isDriver` check is not belt-and-braces: the driver role in the live
data holds `manifests.edit`, `manifests.manage` and `manifests.delete`, so permissions
alone would have put the office's data-entry queue in every driver's sidebar — the exact
thing this feature exists to take away from them.

### Worth a separate look

The driver role currently holds 34 permissions including `manifests.delete`,
`manifests.manage`, `trips.edit`, `trips.manage`, `deliveries.delete` and
`dropofflocations.manage`. That is far wider than field work needs, and the UI is now
compensating for it with `!isDriver` checks in several places. Trimming the role in
`rolePermissions` would be the real fix.

The `operations`, `pickupagent` and `partners` roles have **zero** `rolePermissions`
rows, so those users depend entirely on `FALLBACK_PERMISSIONS` in `usePermissions.ts`.

## End-to-end test — 2026-08-19

Run against the live database as admin, on trip `TRP-260819-0005` (route ROUTE K,
14 dropoff stops). Test manifest, uploaded photo and all trip mutations were deleted
afterwards and the trip verified back to its exact pre-test state.

What passed:

- Capture dialog listed all 14 stops, marked the last "Final", and kept **Submit
  disabled** until both a stop and a photo were provided.
- Submitting created the manifest with `packageSize: null`, `packageCount: 0`,
  `detailsVerified: false`, status `delivered` — the exact writes the pre-change schema
  would have rejected.
- One photo stored, referenced as both `manifestImage` and `proofOfDeliveryImage`.
- Checkpoint written with the correct stop name and sequence; `currentCheckpoint` 0 → 1.
- Trip advanced `awaiting_manifests` → `in_progress` and **did not** auto-complete with
  1 of 14 stops covered, confirming `countRouteDropoffStops()`.
- Trip page updated in place: amber review banner, "Needs review" chip, "Pending office
  entry" in the Packages column.
- Review queue showed the manifest with photo, driver and vehicle; saving the figures
  cleared it from the queue.

What failed, and was fixed: the checkpoint/totals sync described above. Re-tested after
the fix — checkpoint picked up the real manifest number, `medium`, `packagesDelivered:
12`, and the trip's `totalPackages` synced to 12.

Still untested: a **real driver account**. Admin bypasses Appwrite's document-level
permissions, so a driver's ability to create a manifest document and upload to the
storage bucket has not been proven.

### Progress bar on field-captured trips — fixed 2026-08-30

The trip header's "Trip Progress (Manifests)" used to read `1/1 manifests` at 100%
while 13 of 14 stops were still outstanding, because a field-captured trip only has as
many manifests as stops logged so far. The trip view now detects a field-captured trip
(any manifest matching `isManifestAwaitingVerification()`), fetches the route's dropoff
stops, and shows `covered stops / route stops` — the same rule `checkAndUpdateTripStatus()`
uses for completion. Ordinary admin-created trips keep the manifest-based bar.

---

# Return Waybills — the same treatment, 2026-08-30

Returns had been left out of the field-capture work above. The return waybill flow had
exactly the problems the manifests had:

- `/edms/returns/waybills/create` demanded a **package count ≥ 1**, a reason, a return
  date and both locations before it would submit, and was gated on `deliveries.create`,
  which drivers don't hold — so a driver standing at a stop with goods coming back had
  no way to record it.
- Marking a return delivered at the depot hard-blocked on a proof-of-delivery upload
  **and** a typed receiver name.

## The new flow

**Driver — one touch at the stop, one touch at the depot.**

1. On the trip page, taps **Log Return** (amber, beside Log Delivery in the header and
   as its own card).
2. Picks the stop the goods are coming from (stops already delivered are marked), and
   optionally taps a reason chip — defaults to *Customer return*.
3. Takes one photo of the paper return waybill. Submits.

That creates the return waybill **in transit** with the photo as `waybillImage`, no
package count, and `detailsVerified: false`. The pickup location is taken from the
route's start location. The trip stays open until the goods are handed back.

4. Back at the depot, the Returns tab shows **Confirm Handover** on any return still on
   the truck. The receiver's name is optional; a photo of the signed copy can be taken
   in the same dialog but is not required. That closes the return as `delivered` and
   re-runs the trip completion check.

**Admin — catches up later.**

- `/edms/returns/waybills/review` (sidebar: Return Waybills → **Needs Review**) lists
  every field-captured return, photo beside the fields. The admin enters the package
  count (or a small/medium/big breakdown — the two are cross-checked), corrects the
  reason, adds notes, and hits **Save & Verify**.
- Trip pages show an amber banner with a direct link when any of their returns are
  awaiting review; the Returns tab, waybill detail page and waybill table show
  **Needs review** (drivers see *Pending office entry*) instead of a misleading `0
  packages`.
- The full create form still exists for the office (Create Return button is now
  office-only on the trip page; the per-manifest/per-checkpoint "Return" links are
  hidden from drivers, who use the dialog instead).

## Appwrite schema changes — APPLIED 2026-08-30

Applied to the live **`returnwaybills`** collection (`69849a0100368992529a`) and verified
`available`:

| Attribute         | Change                                              |
| ----------------- | --------------------------------------------------- |
| `packageCount`    | required → **optional**, default `0`, min 0         |
| `detailsVerified` | **new** boolean, optional, default `false`          |
| `verifiedAt`      | **new** datetime, optional                          |
| `verifiedBy`      | **new** string(200), optional                       |

`returnReason` stays required; the driver dialog always sends one (default
`customer_return`) and the admin corrects it on review.

The collection held only 2 rows. Both were left `null` on `detailsVerified` (verified
against the live data), so the queue's `Query.equal('detailsVerified', false)` does not
pick them up; `isReturnWaybillAwaitingVerification()` additionally requires a falsy
`packageCount`, and both rows have counts.

## What changed in code

**Actions** — `src/libs/actions/returnwaybill.actions.ts`

- `logFieldReturn()` — stop + photo → return waybill created `in_transit`, unverified.
- `verifyReturnWaybillDetails()` — admin fills count/breakdown/reason, marks verified.
- `getReturnWaybillsAwaitingVerification()` / `isReturnWaybillAwaitingVerification()` —
  the queue and its shared predicate.
- `markReturnWaybillDelivered()` — receiver name now optional; accepts an optional
  handover photo URL stored as `proofOfDelivery`.
- `createReturnWaybill()` — office-created waybills are written `detailsVerified: true`.

**UI**

- `src/views/edms/trips/LogReturnDialog.tsx` (new) — the driver capture flow.
- `src/views/edms/returns/waybills/ReturnWaybillReviewQueue.tsx` (new) and
  `src/app/(dashboard)/(apps)/edms/returns/waybills/review/page.tsx` (new) — the queue.
- `src/views/edms/trips/view/index.tsx` — Log Return entry points, handover reminder,
  admin review banner, Needs-review chips, Confirm Handover in the Returns tab.
- `src/views/edms/returns/waybills/view/index.tsx` — Mark Delivered no longer needs a
  prior proof upload or a receiver name (photo optional in the dialog, camera-first);
  "Package details pending" panel while unverified; camera-first uploads; Mark
  Processed hidden from drivers.
- `src/views/edms/returns/waybills/ReturnWaybillOverviewTable.tsx` — Needs-review chip;
  receiver name optional in the delivery dialog.
- `src/components/layout/vertical/VerticalMenu.tsx` — Return Waybills → **Needs
  Review**, gated on `deliveries.edit` / `deliveries.manage` and `!isDriver`.
- `src/types/apps/deliveryTypes.ts` — `detailsVerified` / `verifiedAt` / `verifiedBy`
  on `ReturnWaybillType`; `packageCount` optional on `ReturnWaybillInput`.

## Permissions

The driver capture UI uses the same gate as Log Delivery
(`isDriver || deliveries.proof || manifests.create`). The collection grants
`create("users")`, so any signed-in user can write the row. As with manifests, a
**real driver account** has not been exercised end-to-end.

## Smoke test — 2026-08-30

Against the live collection via the API: a row shaped exactly as `logFieldReturn()`
writes it (`packageCount: 0`, `packageDetails: null`, `detailsVerified: false`,
`status: in_transit`) was accepted; the queue query returned only that row; the
verify update (count 7, breakdown, reason, `verifiedBy`) cleared it from the queue;
the row was deleted and the collection confirmed back at its original 2 rows.

### Verified in the browser — 2026-08-30

Checked as admin on a throwaway trip with one field-captured manifest on a 20-stop
route: the header read **Trip Progress (Stops) — 1/20 stops** at 5%, where it used to
read `1/1 manifests` at 100%. Test trip and manifest deleted afterwards.

## Gotcha: stale bundles from a leftover service worker on localhost:3000

During that check the page kept serving the *old* trip view after every reload — the
served `page.js` chunk contained the component but none of the new code, and the
dev server log showed a repeated `GET /sw.js 404`. The cause was a service worker
registered by a **different app** that had previously run on `localhost:3000`
(cache name `amaneebo-offline-v2`); it was intercepting Next's chunk requests and
answering from its cache. This project registers no service worker of its own.

If dev changes ever seem not to apply, run this in the page console and reload:

```js
(await navigator.serviceWorker.getRegistrations()).forEach(r => r.unregister())
;(await caches.keys()).forEach(k => caches.delete(k))
```

or clear site data for `localhost:3000` in DevTools → Application.
