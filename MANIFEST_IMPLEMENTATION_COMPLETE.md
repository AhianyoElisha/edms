# Manifest System Updates - Complete Implementation Guide

## Date: October 9, 2025

## Overview
Complete overhaul of the manifest system to work with the simplified Appwrite schema and implement real-time updates without page reloads.

---

## 1. Database Schema Changes

### Manifest Table (Final Schema)
**Attributes:**
- `$id`, `$createdAt`, `$updatedAt` (system fields)
- `manifestNumber`: string (50 chars)
- `manifestDate`: datetime
- `manifestImage`: string (500 chars) - uploaded manifest photo
- `notes`: string (1000 chars)
- `packageTypes`: string (500 chars) - JSON of package size counts
- `totalPackages`: integer (min: 0)
- `dropoffSequence`: integer (min: 0)
- `status`: string (100 chars)
- `departureTime`: datetime
- `arrivalTime`: datetime
- `actualArrival`: datetime - actual arrival at dropoff
- `estimatedArrival`: datetime
- `deliveryTime`: datetime
- `proofOfDeliveryImage`: string (500 chars)
- `deliveryGpsCoordinates`: string (100 chars)
- `deliveryGpsVerified`: boolean (default: false)
- `gpsVerificationDistance`: integer (min: 0)
- `deliveredPackages`: string (700 chars) - JSON array of package IDs
- `missingPackages`: string (900 chars) - JSON array of package IDs
- `recipientName`: string (200 chars) - auto-populated from dropoff location
- `recipientPhone`: string (20 chars) - auto-populated from dropoff location

**Relationships:**
- `trip`: Many-to-One (manifests → trips)
  - **One-way relationship only**
  - Vehicle, driver, route accessed via trip relationship

**Removed Fields:**
- ❌ `vehicle` (now accessed via trip.vehicle)
- ❌ `driver` (now accessed via trip.driver)
- ❌ `pickuplocation` (accessed via trip.route or packages)
- ❌ `dropofflocation` (accessed via packages)
- ❌ `packages` relationship (one-way from packages to manifest)

---

## 2. Code Changes

### A. Trip Creation (`trip.actions.ts`)

**Auto-populate recipient details:**
```typescript
// Fetch dropoff location to get contact person and phone
let recipientName = null
let recipientPhone = null

try {
  const dropoffLocation = await databases.getDocument(
    appwriteConfig.database,
    appwriteConfig.dropofflocations,
    manifestData.dropoffLocationId
  )
  
  recipientName = dropoffLocation.contactPerson || null
  recipientPhone = dropoffLocation.contactPhone || null
} catch (error) {
  console.warn(`Could not fetch dropoff location details`)
}
```

**Initialize manifest fields:**
```typescript
const manifestDoc = {
  manifestNumber: manifestData.manifestNumber,
  trip: trip.$id,
  dropoffSequence: manifests.indexOf(manifestData) + 1,
  manifestDate: new Date(tripDetails.startTime).toISOString(),
  totalPackages: packages.filter(pkg => pkg.manifestTempId === manifestData.tempId).length,
  packageTypes: JSON.stringify(getPackageSizeCountsForManifest(packages, manifestData.tempId)),
  status: 'pending',
  notes: manifestData.notes || '',
  departureTime: manifestData.departureTime || null,
  
  // Delivery tracking fields (initialized as null)
  arrivalTime: null,
  actualArrival: null,
  deliveryTime: null,
  estimatedArrival: null,
  manifestImage: null,
  
  // Proof of delivery fields
  proofOfDeliveryImage: null,
  deliveryGpsCoordinates: null,
  deliveryGpsVerified: false,
  gpsVerificationDistance: null,
  deliveredPackages: JSON.stringify([]),
  missingPackages: JSON.stringify([]),
  
  // Auto-populated recipient details
  recipientName,
  recipientPhone
}
```

---

### B. Manifest Actions (`manifest.actions.ts`)

#### 1. Fetching Manifest with Relations

```typescript
export const getManifestByIdWithRelations = async (manifestId: string) => {
  // Fetch manifest with trip relationship
  const manifest = await tablesDB.getRow(
    DATABASE_ID,
    MANIFESTS_COLLECTION_ID,
    manifestId,
    [
      Query.select([
        '*',
        'trip.*',
        'trip.vehicle.*',
        'trip.driver.*',
        'trip.route.*',
        'trip.route.startLocation.*',
        'trip.route.endLocation.*',
      ])
    ]
  )

  // Fetch packages separately (one-way relationship)
  const packagesResponse = await databases.listDocuments(
    DATABASE_ID,
    PACKAGES_COLLECTION_ID,
    [Query.equal('manifest', manifestId), Query.limit(1000)]
  )

  // Fetch location details from packages
  let pickupLocation = null
  let dropoffLocation = null
  
  if (packagesResponse.documents.length > 0) {
    const firstPackage = packagesResponse.documents[0] as any
    
    if (firstPackage.dropofflocation) {
      dropoffLocation = await databases.getDocument(
        DATABASE_ID,
        appwriteConfig.dropofflocations,
        firstPackage.dropofflocation
      )
    }
    
    if (firstPackage.pickuplocation) {
      pickupLocation = await databases.getDocument(
        DATABASE_ID,
        appwriteConfig.pickuplocations,
        firstPackage.pickuplocation
      )
    }
  }

  return {
    ...manifest,
    packages: packagesResponse.documents,
    pickupLocation,
    dropoffLocation
  }
}
```

#### 2. Mark Manifest as Delivered

```typescript
export const markManifestAsDelivered = async (
  manifestId: string,
  deliveredPackageIds: string[],
  missingPackageIds: string[] = []
): Promise<ManifestType> => {
  const now = new Date().toISOString()
  
  // Update manifest with all delivery tracking fields
  const updateData: Record<string, string> = {
    status: 'delivered',
    deliveryTime: now,
    actualArrival: now,
    arrivalTime: now,
    deliveredPackages: JSON.stringify(deliveredPackageIds),
    missingPackages: JSON.stringify(missingPackageIds)
  }
  
  const manifest = await databases.updateDocument(
    DATABASE_ID,
    MANIFESTS_COLLECTION_ID,
    manifestId,
    updateData
  ) as any
  
  // Update trip checkpoints
  if (manifest.trip) {
    await updateTripCheckpoint(
      typeof manifest.trip === 'string' ? manifest.trip : manifest.trip.$id,
      manifestId,
      deliveredPackageIds.length,
      missingPackageIds.length,
      now
    )
  }
  
  return manifest as unknown as ManifestType
}
```

#### 3. Update Trip Checkpoint

```typescript
async function updateTripCheckpoint(
  tripId: string,
  manifestId: string,
  packagesDelivered: number,
  packagesMissing: number,
  completionTime: string
): Promise<void> {
  // Fetch current trip
  const trip = await databases.getDocument(
    DATABASE_ID,
    appwriteConfig.trips,
    tripId
  ) as any
  
  if (!trip.checkpoints) return
  
  // Parse and update checkpoints
  const checkpoints = JSON.parse(trip.checkpoints)
  const checkpointIndex = checkpoints.findIndex((cp: any) => cp.manifestId === manifestId)
  
  if (checkpointIndex !== -1) {
    checkpoints[checkpointIndex] = {
      ...checkpoints[checkpointIndex],
      status: 'completed',
      completionTime,
      arrivalTime: completionTime,
      packagesDelivered,
      packagesMissing
    }
    
    // Update trip
    await databases.updateDocument(
      DATABASE_ID,
      appwriteConfig.trips,
      tripId,
      {
        checkpoints: JSON.stringify(checkpoints),
        currentCheckpoint: checkpointIndex + 1
      }
    )
  }
}
```

---

### C. Package Actions (`package.actions.ts`)

**Fixed query to fetch locations separately:**

```typescript
export const getPackageByIdWithRelations = async (packageId: string) => {
  // Fetch package with manifest and trip relationships
  const pkg = await tablesDB.getRow(
    DATABASE_ID,
    PACKAGES_COLLECTION_ID,
    packageId,
    [
      Query.select([
        '*',
        'manifest.*',
        'manifest.trip.*',
        'manifest.trip.vehicle.*',
        'manifest.trip.driver.*',
        'manifest.trip.route.*'
      ])
    ]
  ) as any

  // Fetch locations separately
  let pickupLocation = null
  let dropoffLocation = null

  if (pkg.pickuplocation) {
    pickupLocation = await databases.getDocument(
      DATABASE_ID,
      appwriteConfig.pickuplocations,
      pkg.pickuplocation
    )
  }

  if (pkg.dropofflocation) {
    dropoffLocation = await databases.getDocument(
      DATABASE_ID,
      appwriteConfig.dropofflocations,
      pkg.dropofflocation
    )
  }

  return {
    ...pkg,
    pickupLocation,
    dropoffLocation
  }
}
```

---

### D. Manifest View Component (`views/edms/manifests/view/index.tsx`)

#### 1. Remove Page Reloads

**After proof image upload:**
```typescript
// Update manifest with proof image
const updatedManifest = await updateManifestWithProofImage(manifestData.$id, fileUrl)

toast.success('Proof of delivery uploaded successfully!')

// Update local state instead of reloading
Object.assign(manifestData, {
  proofOfDeliveryImage: fileUrl,
  deliveryTime: updatedManifest.deliveryTime
})

// Trigger re-render
setRefreshKey(prev => prev + 1)
```

**After marking packages as delivered:**
```typescript
await bulkUpdatePackageStatus(selectedPackages, 'delivered', new Date().toISOString())

toast.success(`${selectedPackages.length} package(s) marked as delivered!`)

// Update local package statuses
packages.forEach((pkg: any) => {
  if (selectedPackages.includes(pkg.$id)) {
    pkg.status = 'delivered'
    pkg.deliveryDate = new Date().toISOString()
  }
})

// Clear selection and update UI
setSelectedPackages([])
setConfirmDialog({ open: false, action: null })
setUploading(false)
setRefreshKey(prev => prev + 1)
```

**After submitting manifest:**
```typescript
// Get delivered and missing package IDs
const deliveredPackageIds = packages
  .filter((pkg: any) => pkg.status === 'delivered')
  .map((pkg: any) => pkg.$id)

const missingPackageIds = packages
  .filter((pkg: any) => pkg.status !== 'delivered' && pkg.status !== 'pending')
  .map((pkg: any) => pkg.$id)

// Mark manifest as delivered with package tracking
const updatedManifest = await markManifestAsDelivered(
  manifestData.$id,
  deliveredPackageIds,
  missingPackageIds
)

// Update local manifest data
Object.assign(manifestData, {
  status: 'delivered',
  deliveryTime: updatedManifest.deliveryTime,
  actualArrival: updatedManifest.actualArrival,
  arrivalTime: updatedManifest.arrivalTime,
  deliveredPackages: updatedManifest.deliveredPackages,
  missingPackages: updatedManifest.missingPackages
})

// Check trip completion
if (trip?.$id) {
  const tripCompleted = await checkAndCompleteTrip(trip.$id)
  if (tripCompleted) {
    toast.success('Manifest submitted and trip completed!')
    if (trip) trip.status = 'completed'
  } else {
    toast.success('Manifest submitted successfully!')
  }
}

// Update UI without reload
setConfirmDialog({ open: false, action: null })
setUploading(false)
setRefreshKey(prev => prev + 1)
```

#### 2. Checkbox Implementation (Already Complete)

**Select All Checkbox:**
```typescript
<Checkbox
  checked={selectedPackages.length > 0 && 
           selectedPackages.length === packages.filter((pkg: any) => pkg.status !== 'delivered').length}
  indeterminate={selectedPackages.length > 0 && 
                 selectedPackages.length < packages.filter((pkg: any) => pkg.status !== 'delivered').length}
  onChange={handleSelectAll}
  disabled={!hasProofImage}
/>
```

**Individual Package Checkbox:**
```typescript
<Checkbox
  checked={selectedPackages.includes(pkg.$id)}
  onChange={() => handleSelectPackage(pkg.$id)}
  disabled={!hasProofImage || pkg.status === 'delivered'}
/>
```

**Mark as Delivered Button:**
```typescript
{!isDelivered && hasProofImage && selectedPackages.length > 0 && (
  <div className='mb-4 p-4 bg-primary/10 rounded flex items-center justify-between'>
    <Typography variant='body2' color='primary'>
      {selectedPackages.length} package{selectedPackages.length > 1 ? 's' : ''} selected
    </Typography>
    <Button
      variant='contained'
      size='small'
      color='success'
      onClick={() => setConfirmDialog({ open: true, action: 'delivered' })}
      startIcon={<i className='ri-check-line' />}
    >
      Mark as Delivered
    </Button>
  </div>
)}
```

---

### E. Trip View Component (`views/edms/trips/view/index.tsx`)

**Enhanced Checkpoint Display:**

```typescript
<TimelineItem key={index}>
  <TimelineSeparator>
    <TimelineDot
      color={isCompleted ? 'success' : isInProgress ? 'primary' : 'grey'}
      sx={{ width: 40, height: 40 }}
    >
      <i className={isCompleted ? 'ri-checkbox-circle-line' : isInProgress ? 'ri-truck-line' : 'ri-map-pin-line'} />
    </TimelineDot>
    {index < checkpoints.length - 1 && <TimelineConnector />}
  </TimelineSeparator>
  <TimelineContent>
    <Card className='mb-4'>
      <CardContent>
        {/* Location and status */}
        <div className='flex items-start justify-between'>
          <div className='flex-1'>
            <div className='flex items-center gap-2 mb-1'>
              <Typography variant='h6'>
                {checkpoint.dropoffLocationName || `Checkpoint ${checkpoint.sequence || index + 1}`}
              </Typography>
              <Chip
                label={checkpoint.status?.charAt(0).toUpperCase() + checkpoint.status?.slice(1).replace('_', ' ')}
                variant='tonal'
                color={getStatusColor(checkpoint.status)}
                size='small'
              />
            </div>
            <Typography variant='body2' color='text.secondary'>
              Manifest: {checkpoint.manifestId || 'Not assigned'}
            </Typography>
          </div>
        </div>

        {/* Package delivery stats */}
        {isCompleted && (
          <div className='flex gap-4 my-3'>
            <div className='flex items-center gap-2'>
              <i className='ri-checkbox-circle-line text-success' />
              <Typography variant='body2'>
                <strong>{checkpoint.packagesDelivered || 0}</strong> delivered
              </Typography>
            </div>
            {checkpoint.packagesMissing > 0 && (
              <div className='flex items-center gap-2'>
                <i className='ri-error-warning-line text-error' />
                <Typography variant='body2'>
                  <strong>{checkpoint.packagesMissing}</strong> missing
                </Typography>
              </div>
            )}
          </div>
        )}

        {/* Timestamps */}
        <div className='mt-3 space-y-1'>
          {checkpoint.arrivalTime && (
            <Typography variant='caption' color='text.secondary' className='block'>
              <i className='ri-time-line mr-1' />
              Arrived: {new Date(checkpoint.arrivalTime).toLocaleString()}
            </Typography>
          )}
          {checkpoint.completionTime && (
            <Typography variant='caption' color='text.secondary' className='block'>
              <i className='ri-check-line mr-1' />
              Completed: {new Date(checkpoint.completionTime).toLocaleString()}
            </Typography>
          )}
        </div>

        {/* GPS verification */}
        {checkpoint.gpsVerified && (
          <div className='mt-2'>
            <Chip
              label='GPS Verified'
              size='small'
              color='success'
              variant='outlined'
              icon={<i className='ri-map-pin-line' />}
            />
          </div>
        )}
      </CardContent>
    </Card>
  </TimelineContent>
</TimelineItem>
```

---

### F. Type Definitions (`types/apps/deliveryTypes.ts`)

**Updated ManifestType:**

```typescript
export interface ManifestType {
  $id: string
  manifestNumber: string
  trip: string // relationship to trip (trip contains vehicle, driver, route relationships)
  dropoffSequence: number
  manifestDate: string
  totalPackages: number
  packageTypes: string // JSON string
  status: ManifestStatusType
  manifestImage?: string | null
  departureTime?: string | null
  arrivalTime?: string | null
  actualArrival?: string | null // actual arrival time at dropoff location
  deliveryTime?: string | null
  estimatedArrival?: string | null
  notes?: string | null
  // Proof of delivery fields
  proofOfDeliveryImage?: string | null
  deliveryGpsCoordinates?: string | null
  deliveryGpsVerified?: boolean
  gpsVerificationDistance?: number | null
  deliveredPackages?: string | null // JSON string of delivered package IDs
  missingPackages?: string | null // JSON string of missing package IDs
  recipientName?: string | null // auto-populated from dropofflocation.contactPerson
  recipientPhone?: string | null // auto-populated from dropofflocation.contactPhone
  $createdAt: string
  $updatedAt: string
}
```

---

## 3. Features Implemented

### ✅ Proof of Delivery Upload
- Image compression (max 1MB, 80% quality)
- Upload to Appwrite Storage
- Real-time UI update (no page reload)
- Preview display

### ✅ Package Delivery Tracking
- Checkbox selection (disabled until proof uploaded)
- Select all functionality
- Bulk mark as delivered
- Real-time status updates

### ✅ Manifest Submission
- Validation (requires proof image)
- Package delivery/missing counts
- Trip checkpoint updates
- Auto-complete trip when all manifests delivered
- Real-time UI updates

### ✅ Checkpoint Tracking
- Visual timeline with status indicators
- Package delivery statistics
- Arrival and completion timestamps
- GPS verification status

### ✅ Recipient Auto-population
- Fetches contactPerson and contactPhone from dropoff location
- Populated during manifest creation
- Displayed in manifest view

---

## 4. Testing Checklist

- [x] Build successful with no TypeScript errors
- [ ] Upload proof of delivery image
- [ ] Select packages with checkboxes
- [ ] Mark packages as delivered (bulk)
- [ ] Submit manifest as delivered
- [ ] Verify no page reloads
- [ ] Check trip checkpoints update
- [ ] Verify trip auto-completion
- [ ] Check package details page loads
- [ ] Verify recipient details auto-populate

---

## 5. Key Benefits

1. **No Page Reloads**: All actions update UI in real-time
2. **Better Performance**: Separate queries for locations instead of deep nesting
3. **Data Integrity**: One-way relationships prevent update conflicts
4. **Automatic Tracking**: Checkpoints and recipient details auto-updated
5. **Type Safety**: Strict TypeScript types prevent errors
6. **User Experience**: Instant feedback with toast notifications

---

## 6. Troubleshooting

### Package Query Error
**Error:** `Invalid query: Attribute not found in schema: pickuplocation`

**Solution:** Locations are not relationships on packages. Fetch them separately:
```typescript
const pickupLocation = await databases.getDocument(
  DATABASE_ID,
  appwriteConfig.pickuplocations,
  pkg.pickuplocation
)
```

### Manifest Relationship Error
**Error:** `Invalid relationship value`

**Solution:** Removed two-way packages relationship. Use one-way: packages → manifest

### Page Reload Issues
**Solution:** Use `setRefreshKey(prev => prev + 1)` to trigger re-render without reload

---

## 7. Next Steps

1. Test complete workflow in production
2. Add error handling for network failures
3. Implement offline support for drivers
4. Add GPS tracking integration
5. Generate delivery reports
6. Implement signature capture

---

## Files Modified

- `/src/libs/actions/trip.actions.ts`
- `/src/libs/actions/manifest.actions.ts`
- `/src/libs/actions/package.actions.ts`
- `/src/views/edms/manifests/view/index.tsx`
- `/src/views/edms/trips/view/index.tsx`
- `/src/types/apps/deliveryTypes.ts`
- `/src/views/edms/manifests/CreateManifestForm.tsx`
- `/src/views/edms/manifests/ManifestOverviewTable.tsx`

---

**Documentation Date:** October 9, 2025  
**Status:** ✅ Complete - Ready for Testing
