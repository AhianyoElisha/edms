# Quick Reference Guide - Manifest Delivery Workflow

## For Drivers/Users

### Step 1: Upload Proof of Delivery
1. Navigate to manifest details page
2. Click **"Upload Proof Image"** button
3. Select image from device
4. Image automatically compresses and uploads
5. Preview appears (no page reload)

### Step 2: Mark Packages as Delivered
1. After proof upload, checkboxes become enabled
2. Select packages to mark as delivered:
   - Click individual checkboxes, OR
   - Click **"Select All"** checkbox
3. Click **"Mark as Delivered"** button
4. Confirm in dialog
5. Packages update in real-time

### Step 3: Submit Manifest
1. After marking packages, click **"Submit Manifest"** button
2. Confirm submission
3. Manifest marked as delivered
4. Trip checkpoints automatically update
5. If all manifests delivered, trip auto-completes

---

## For Developers

### Data Flow

```
1. Upload Proof Image
   └─> updateManifestWithProofImage()
       └─> Updates: proofOfDeliveryImage, deliveryTime
       └─> Local state updates (no reload)

2. Mark Packages Delivered
   └─> bulkUpdatePackageStatus()
       └─> Updates each package: status='delivered', deliveryDate
       └─> Local state updates (no reload)

3. Submit Manifest
   └─> markManifestAsDelivered()
       ├─> Updates manifest: status, deliveryTime, actualArrival, 
       │   deliveredPackages, missingPackages
       └─> updateTripCheckpoint()
           └─> Updates trip.checkpoints JSON
               └─> Updates checkpoint: status='completed', timestamps,
                   packagesDelivered, packagesMissing

4. Check Trip Completion
   └─> checkAndCompleteTrip()
       └─> If all manifests delivered: trip.status='completed'
```

---

## API Endpoints Used

### Manifest Operations
```typescript
// Get manifest with all related data
getManifestByIdWithRelations(manifestId)

// Update with proof image
updateManifestWithProofImage(manifestId, imageUrl, gpsCoords?, gpsVerified?)

// Mark as delivered
markManifestAsDelivered(manifestId, deliveredPackageIds, missingPackageIds)
```

### Package Operations
```typescript
// Bulk update
bulkUpdatePackageStatus(packageIds, status, deliveryDate)

// Get package details
getPackageByIdWithRelations(packageId)
```

### Trip Operations
```typescript
// Get trip with manifests
getTripById(tripId)

// Check and complete
checkAndCompleteTrip(tripId)

// Update status
updateTripStatus(tripId, status)
```

---

## Common Issues & Solutions

### Issue: Checkboxes Disabled
**Cause:** No proof of delivery image uploaded  
**Solution:** Upload proof image first

### Issue: "Mark as Delivered" Button Not Showing
**Cause:** No packages selected or manifest already delivered  
**Solution:** Select packages with checkboxes

### Issue: Package Details Page Error
**Cause:** Old query trying to access location relationships  
**Solution:** Fixed in package.actions.ts - fetches locations separately

### Issue: Page Reloading After Actions
**Cause:** Old implementation used window.location.reload()  
**Solution:** Fixed - now uses setRefreshKey() for re-render

---

## State Management

### Key State Variables
```typescript
selectedPackages: string[]        // IDs of selected packages
uploading: boolean                // Loading state during operations
confirmDialog: {                  // Confirmation dialog state
  open: boolean
  action: 'delivered' | 'submit' | null
}
refreshKey: number                // Triggers re-render (incremented)
hasProofImage: boolean            // Whether proof uploaded
isDelivered: boolean              // Whether manifest delivered
```

### State Updates
```typescript
// After proof upload
Object.assign(manifestData, {
  proofOfDeliveryImage: fileUrl,
  deliveryTime: updatedManifest.deliveryTime
})
setRefreshKey(prev => prev + 1)

// After marking packages
packages.forEach((pkg: any) => {
  if (selectedPackages.includes(pkg.$id)) {
    pkg.status = 'delivered'
    pkg.deliveryDate = new Date().toISOString()
  }
})
setRefreshKey(prev => prev + 1)

// After manifest submission
Object.assign(manifestData, {
  status: 'delivered',
  deliveryTime: updatedManifest.deliveryTime,
  actualArrival: updatedManifest.actualArrival,
  // ... other fields
})
setRefreshKey(prev => prev + 1)
```

---

## Database Queries

### Fetch Manifest with Relations
```typescript
// Trip relationships (vehicle, driver, route)
Query.select([
  '*',
  'trip.*',
  'trip.vehicle.*',
  'trip.driver.*',
  'trip.route.*'
])

// Packages (separate query)
Query.equal('manifest', manifestId)

// Locations (from first package)
databases.getDocument(DATABASE_ID, DROPOFF_LOCATIONS, dropoffLocationId)
```

### Update Manifest
```typescript
databases.updateDocument(
  DATABASE_ID,
  MANIFESTS_COLLECTION_ID,
  manifestId,
  {
    status: 'delivered',
    deliveryTime: now,
    actualArrival: now,
    arrivalTime: now,
    deliveredPackages: JSON.stringify(packageIds),
    missingPackages: JSON.stringify(missingIds)
  }
)
```

### Update Trip Checkpoint
```typescript
const checkpoints = JSON.parse(trip.checkpoints)
checkpoints[index] = {
  ...checkpoints[index],
  status: 'completed',
  completionTime: now,
  packagesDelivered: count,
  packagesMissing: count
}

databases.updateDocument(
  DATABASE_ID,
  TRIPS_COLLECTION_ID,
  tripId,
  {
    checkpoints: JSON.stringify(checkpoints),
    currentCheckpoint: index + 1
  }
)
```

---

## Testing Scenarios

### Scenario 1: Normal Delivery
1. ✅ Upload proof image
2. ✅ Select all packages
3. ✅ Mark as delivered
4. ✅ Submit manifest
5. ✅ Verify checkpoint updated
6. ✅ Check no page reloads

### Scenario 2: Partial Delivery
1. ✅ Upload proof image
2. ✅ Select some packages only
3. ✅ Mark as delivered
4. ✅ Submit manifest (some missing)
5. ✅ Verify deliveredPackages and missingPackages counts

### Scenario 3: Multiple Manifests
1. ✅ Complete first manifest
2. ✅ Verify trip not completed
3. ✅ Complete second manifest
4. ✅ Complete all manifests
5. ✅ Verify trip auto-completes

### Scenario 4: Error Handling
1. ✅ Network failure during upload
2. ✅ Invalid image file
3. ✅ Missing permissions
4. ✅ Verify error toasts display

---

## Performance Considerations

### Optimizations Implemented
1. **Image Compression:** Reduces upload size by 80-90%
2. **Separate Location Queries:** Avoids deep relationship nesting
3. **One-Way Relationships:** Prevents relationship validation conflicts
4. **Local State Updates:** No page reloads = faster UX
5. **Conditional Rendering:** Only shows relevant UI elements

### Query Limits
- Packages per manifest: 1000 (configurable)
- Checkpoints per trip: Unlimited (JSON field)
- Image size: Max 1MB after compression

---

## Security & Validation

### Client-Side Validation
- ✅ File type (must be image)
- ✅ Proof image required before marking packages
- ✅ At least one package must be selected
- ✅ Confirmation dialogs for critical actions

### Server-Side Validation
- ✅ Appwrite schema validation
- ✅ Relationship integrity checks
- ✅ Field length limits
- ✅ Data type validation

---

## Future Enhancements

### Planned Features
1. **Signature Capture:** Recipient signature on delivery
2. **GPS Tracking:** Real-time location updates
3. **Offline Mode:** Work without internet, sync later
4. **Push Notifications:** Alert on manifest assignments
5. **Photo Gallery:** Multiple proof images per manifest
6. **Barcode Scanning:** Quick package verification
7. **Delivery Reports:** PDF generation for manifests
8. **Analytics Dashboard:** Delivery performance metrics

---

**Last Updated:** October 9, 2025  
**Version:** 2.0  
**Status:** Production Ready
