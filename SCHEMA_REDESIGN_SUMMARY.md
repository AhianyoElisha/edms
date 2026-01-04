# Schema Redesign Summary: Packages → Manifest-Level Tracking

## Overview

This document summarizes the schema changes made to move from individual package tracking to manifest-level package tracking.

### Key Changes

**Old Schema:**

- Individual packages tracked in `packages` collection
- Each package had its own status, tracking number, etc.
- Manifests had `packageTypes` JSON string with counts by type (small, medium, big, bin)
- Manifests had `totalPackages` as a computed field

**New Schema:**

- Package counts tracked directly on manifests
- Each manifest represents ONE package size type
- Manifests have `packageSize` ('small' | 'medium' | 'big')
- Manifests have `packageCount` (total packages of that size)
- Manifests have `deliveredCount` (how many have been delivered)

## Database Schema Changes Needed

### Manifests Collection - ADD these attributes:

1. **packageSize** (string, required)
   - Values: 'small', 'medium', 'big'
   - One manifest = one package size type

2. **packageCount** (integer, required)
   - Total number of packages on this manifest
   - Default: 0

3. **deliveredCount** (integer, required)
   - Number of packages delivered from this manifest
   - Default: 0

### Manifests Collection - REMOVE these attributes (or mark deprecated):

1. **packageTypes** - No longer needed (was JSON string)
2. **totalPackages** - Replaced by packageCount

### Packages Collection

The entire `packages` collection can be deprecated. Package tracking is now done via:
- `manifest.packageCount` - total packages
- `manifest.deliveredCount` - delivered packages

## Files Modified

### Type Definitions
- `/src/types/apps/deliveryTypes.ts`
  - Removed PackageTrackingType
  - Added PackageSizeType
  - Updated ManifestType with packageSize, packageCount, deliveredCount
  - Updated ManifestStatsData
  - Updated DeliveryDashboardData (packageStats → manifestStats)

### Trip Creation Flow
- `/src/views/edms/trips/types.ts` - Removed PackageData, updated ManifestData
- `/src/views/edms/trips/TripWizard.tsx` - Reduced from 4 steps to 3 steps
- `/src/views/edms/trips/StepManifests.tsx` - Added packageSize dropdown and packageCount input
- `/src/views/edms/trips/StepReview.tsx` - Shows manifest summaries instead of packages
- `/src/views/edms/trips/StepPackages.tsx` - DELETED (no longer needed)

### Actions
- `/src/libs/actions/trip.actions.ts`
  - Renamed `createTripWithManifestsAndPackages` → `createTripWithManifests`
  - Removed all package creation code
  
- `/src/libs/actions/manifest.actions.ts`
  - Added `getDeliveredManifests` function
  - Updated `updateManifestDeliveredCount` to use `deliveredCount` field
  - Updated `markManifestAsDelivered` - simplified signature (takes only manifestId), reads counts from manifest
  - Updated `getManifestPackageStats` - now reads from manifest fields instead of querying packages
  
- `/src/libs/actions/package.actions.ts`
  - Deprecated with stub functions

- `/src/libs/actions/dashboard.actions.ts`
  - Updated `getDeliveredPackagesTotal` to query manifests

- `/src/libs/actions/edms-dashboard.actions.ts`
  - Updated `getPackageStatistics` to use manifests

### Views
- `/src/views/edms/manifests/view/index.tsx`
  - **COMPLETELY REWRITTEN** for count-based tracking
  - Removed individual package selection/table
  - Added slider/input for deliveredCount adjustment
  - Added progress bar showing delivery ratio
  - Added quick actions (Mark All Delivered, Mark All Missing)
  - Updated handleSubmitManifest to call simplified markManifestAsDelivered
  
- `/src/views/edms/manifests/CreateManifestForm.tsx`
  - Updated to use packageSize dropdown and packageCount input
  
- `/src/views/edms/manifests/ManifestOverviewTable.tsx`
  - Updated to display packageSize and packageCount
  
- `/src/views/edms/packages/delivered/DeliveredPackagesTable.tsx`
  - Updated to show delivered manifests instead of packages
  
- `/src/views/edms/trips/view/index.tsx`
  - Removed dead code (manifestPackages variable)
  - Already shows packageCount and packageSize from manifest
  
- `/src/views/dashboards/PackageTrackingWidget.tsx`
  - Updated to use ManifestType
  
- `/src/views/dashboards/ActivityTimeline.tsx`
  - Updated from packageTrackingNumber to manifestNumber

### Pages
- `/src/app/(dashboard)/(apps)/edms/packages/[id]/page.tsx`
  - Now redirects to manifests list (individual package pages deprecated)

## How It Works Now

### Creating a Trip
1. **Step 1: Trip Details** - Driver, vehicle, route, date
2. **Step 2: Manifests** - For each dropoff location:
   - Select package size (small/medium/big)
   - Enter package count (head count)
3. **Step 3: Review** - Verify manifest summaries

### Package Tracking
- Instead of tracking individual packages, track counts:
  - `packageCount` = total packages on manifest
  - `deliveredCount` = how many delivered
- Mark delivery by updating `deliveredCount`

### Dashboard Stats
- Total packages = sum of all manifest.packageCount
- Delivered packages = sum of all manifest.deliveredCount
- Pending = total - delivered

## Migration Notes

To migrate existing data:
1. For each manifest, set packageSize based on most common type in packageTypes
2. Set packageCount = totalPackages (or sum from packageTypes)
3. Set deliveredCount based on status (if delivered, deliveredCount = packageCount)
4. Packages collection can be archived/deleted

## Build Status

✅ Build passes successfully after all changes.
