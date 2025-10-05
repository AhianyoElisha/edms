# Database Schema Fixes Required

## Immediate Changes Needed in Appwrite

### **PACKAGES Table - Add These Attributes:**
1. ✅ **Keep existing**: `recipient` (Size: 200) - This will store recipient name
2. ❌ **Remove**: None needed
3. ⚠️ **Note**: The code currently uses `recipientName` but DB has `recipient` - we'll align code to use `recipient`

### **PACKAGES Table - Attributes Status:**
- ✅ `pickuplocation` (Many-to-one) - Correct
- ✅ `dropofflocation` (Many-to-one) - Correct  
- ✅ `manifest` (Many-to-one) - Correct
- ✅ `trip` (Many-to-one) - Correct
- ✅ `trackingNumber` (Size: 100) - Correct
- ✅ `packageSize` (Size: 15) - Correct
- ✅ `isBin` (Boolean, default: false) - Correct
- ✅ `itemCount` (Min: 0) - Correct
- ✅ `recipient` (Size: 200) - Correct
- ✅ `recipientPhone` (Size: 20) - Correct
- ✅ `notes` (Size: 500) - Correct
- ✅ `status` (required, Size: 100) - Correct
- ✅ `deliveryDate` - Correct
- ✅ `expectedDeliveryDate` (required) - Correct

**Fields NOT in DB that code tries to use (we'll remove from code):**
- ❌ `packageId` - Not needed, using trackingNumber
- ❌ `route` - Redundant, package gets route from trip
- ❌ `creator` - Not needed for packages
- ❌ `createdAt` - Use $createdAt instead
- ❌ `deliveryConfirmed` - Not in schema
- ❌ `notDeliveredReason` - Not in schema
- ❌ `recipientName` - Use `recipient` instead

---

### **MANIFEST Table - Field Name Corrections:**
- ✅ `manifestNumber` - Correct
- ✅ `vehicle` (Many-to-one) - Correct
- ✅ `driver` (Many-to-one) - Correct
- ✅ `pickuplocation` (Many-to-one) - **lowercase 'l'**
- ✅ `dropofflocation` (Many-to-one) - **lowercase 'l'**
- ✅ `trip` (Many-to-one) - Correct
- ✅ `dropoffSequence` (Min: 0) - Correct
- ✅ `manifestDate` (required) - Correct
- ✅ `totalPackages` (Min: 0) - Correct
- ✅ `packageTypes` (Size: 700) - **JSON string** for package size counts
- ✅ `packages` (One-to-many) - Correct
- ✅ `status` (required, Size: 45) - Correct
- ✅ `manifestImage` (Size: 700) - Correct
- ✅ `departureTime` - Correct
- ✅ `arrivalTime` - Correct
- ✅ `deliveryTime` - Correct
- ✅ `notes` (Size: 1000) - Correct
- ✅ `proofOfDeliveryImage` (Size: 1000) - Correct
- ✅ `deliveryGpsCoordinates` (Size: 100) - Correct
- ✅ `deliveryGpsVerified` (Boolean, default: false) - Correct
- ✅ `gpsVerificationDistance` (Min: 0) - Correct
- ✅ `deliveredPackages` (Size: 900) - JSON array
- ✅ `missingPackages` (Size: 900) - JSON array
- ✅ `recipientName` (Size: 200) - Correct
- ✅ `recipientPhone` (Size: 20) - Correct

**Recommendations:**
- ⚠️ Add `totalItems` (integer, Min: 0) - To track total items including bin contents
- ⚠️ Add `estimatedArrival` (datetime) - Currently used in code but not in DB
- ⚠️ Rename `packageTypes` to `packageSizes` for clarity (or keep and update code)

---

### **TRIP Table - Current Status:**
- ✅ `tripNumber` (required, Size: 50) - Correct
- ✅ `vehicle` (Many-to-one) - Correct
- ✅ `driver` (Many-to-one) - Correct
- ✅ `route` (Many-to-one) - Correct
- ✅ `tripDate` (required) - Correct
- ✅ `startTime` - Correct
- ✅ `clientRate` (Min: 0) - Correct
- ✅ `driverRate` (Min: 0) - Correct
- ✅ `profit` (Min: 0, default: 0) - Correct
- ✅ `manifests` (One-to-many) - Correct
- ✅ `status` (required, Size: 50) - Correct
- ✅ `notes` (Size: 700) - Correct
- ✅ `creator` (Many-to-one) - Correct
- ✅ `checkpoints` (Size: 1000) - JSON string
- ✅ `currentLocation` (Size: 100) - Correct
- ✅ `currentCheckpoint` (Min: 0) - Correct
- ✅ `distanceTraveled` (Min: 0) - Correct
- ✅ `gpsTrackingData` (Size: 700) - Correct
- ✅ `tripexpenses` (Many-to-one) - Correct
- ✅ `invoiceGenerated` (Boolean, default: false) - Correct
- ✅ `invoiceAmount` (Min: 0, default: 0) - Correct
- ✅ `paymentStatus` (required, Size: 20) - Correct

**Recommendations:**
- ⚠️ Add `endTime` (datetime) - To track when trip ends

---

## Summary of Code Changes Needed

### 1. **Package Creation** - Remove these fields from code:
- `packageId` → Use only `trackingNumber`
- `route` → Not needed
- `creator` → Not needed
- `createdAt` → Use $createdAt
- `deliveryConfirmed` → Not in DB
- `notDeliveredReason` → Not in DB
- `recipientName` → Change to `recipient`

### 2. **Package Creation** - Field name corrections:
- `pickupLocation` → `pickuplocation`
- `dropoffLocation` → `dropofflocation`

### 3. **Manifest Creation** - Field name corrections:
- `dropoffLocation` → `dropofflocation`
- `packageSizes` → `packageTypes` (or update DB)
- Add `pickuplocation` field

### 4. **Manifest Creation** - Remove from code:
- `estimatedArrival` → Not in DB (unless you add it)
- `totalItems` → Not in DB (unless you add it)

### 5. **Trip Creation** - Field corrections:
- `expenses` array → Don't set in trip creation, use `tripexpenses` relationship

---

## Recommended Optional Database Additions

### MANIFEST Table:
```
estimatedArrival: datetime (optional) - For better tracking
totalItems: integer (Min: 0, default: 0) - Track total items including bins
```

### TRIP Table:
```
endTime: datetime (optional) - Track trip completion time
```

### PACKAGES Table - Already complete! ✅
Your current schema is sufficient for the simplified driver-friendly system.

---

## Status: Ready to Fix Code
All database attributes are documented. The code changes will align with your actual database schema.
