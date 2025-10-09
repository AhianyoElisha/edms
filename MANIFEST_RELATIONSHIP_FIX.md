# Manifest-Packages Relationship Fix

## Problem
When trying to update a manifest with proof of delivery image, Appwrite was throwing an error:
```
Invalid relationship value. Must be either a document ID or a document, array given.
```

This occurred even though we were only updating scalar fields (proofOfDeliveryImage, deliveryTime).

## Root Cause
The issue was caused by a **two-way relationship** between Manifests and Packages. When Appwrite validates document updates, it checks ALL relationship constraints, even for fields not being updated. The two-way relationship caused validation to fail when trying to update any field on the manifest.

## Solution: One-Way Relationship Pattern

We converted from a **two-way relationship** to a **one-way relationship**:

### Before (Two-Way - PROBLEMATIC)
- Manifests had a `packages` array field pointing to Packages
- Packages had a `manifest` field pointing to Manifests
- Both sides maintained the relationship

### After (One-Way - WORKING)
- **Packages** have a `manifest` field (Many-to-One) pointing to Manifests
- **Manifests** do NOT have a `packages` field
- Packages are fetched via query when needed

## Backend Changes (Appwrite Console)

### 1. Packages Collection
**Configure the `manifest` attribute:**
- Type: Relationship
- Related Collection: Manifests (`68d605dd001bd30c7ff4`)
- Relationship Type: **Many to One** (Many packages → One manifest)
- Two-Way Relationship: **DISABLED** ✓
- On Delete: Set Null (recommended) or Cascade

### 2. Manifests Collection
**Remove the `packages` relationship attribute** (if it exists)
- Only keep scalar fields like: proofOfDeliveryImage, deliveryTime, status, etc.
- Keep other relationships: trip, vehicle, driver, locations (as needed)

## Code Changes

### 1. `getManifestByIdWithRelations()`
**Changed:** Now fetches packages separately using a query

```typescript
// Fetch manifest with other relationships
const manifest = await tablesDB.getRow(...)

// Fetch packages separately
const packagesResponse = await databases.listDocuments(
  DATABASE_ID,
  PACKAGES_COLLECTION_ID,
  [Query.equal('manifest', manifestId)]
)

// Combine them
return { ...manifest, packages: packagesResponse.documents }
```

### 2. `assignPackagesToManifest()`
**Changed:** Updates each package's `manifest` field instead of updating the manifest's `packages` array

```typescript
// Update each package to reference this manifest
await Promise.all(
  packageIds.map(packageId =>
    databases.updateDocument(DATABASE_ID, PACKAGES_COLLECTION_ID, packageId, 
      { manifest: manifestId }
    )
  )
)

// Update totalPackages count on manifest
await databases.updateDocument(DATABASE_ID, MANIFESTS_COLLECTION_ID, manifestId,
  { totalPackages: packagesResponse.total }
)
```

### 3. `removePackagesFromManifest()`
**Changed:** Sets each package's `manifest` field to null

```typescript
await Promise.all(
  packageIds.map(packageId =>
    databases.updateDocument(DATABASE_ID, PACKAGES_COLLECTION_ID, packageId,
      { manifest: null }
    )
  )
)
```

### 4. `createManifest()`
**Changed:** Creates manifest first, then assigns packages separately

```typescript
// Create manifest without packages array
const manifest = await databases.createDocument(...)

// Assign packages to manifest if provided
if (packageIds && packageIds.length > 0) {
  await assignPackagesToManifest(manifest.$id, packageIds)
}
```

### 5. `updateManifestWithProofImage()`
**Simplified:** Now works cleanly without relationship conflicts

```typescript
const updateData: Record<string, string | boolean> = {
  proofOfDeliveryImage: imageUrl,
  deliveryTime: new Date().toISOString()
}

await databases.updateDocument(DATABASE_ID, MANIFESTS_COLLECTION_ID, manifestId, updateData)
```

## Benefits of One-Way Relationships

✅ **No Update Conflicts:** Can update manifest fields without relationship validation errors
✅ **Better Performance:** Only fetch packages when needed
✅ **Clearer Data Flow:** Packages "belong to" manifests (not bidirectional)
✅ **Easier Maintenance:** Simpler relationship logic
✅ **Scalability:** Better for large numbers of packages

## Query Patterns

### Get all packages for a manifest:
```typescript
const packages = await databases.listDocuments(
  DATABASE_ID,
  PACKAGES_COLLECTION_ID,
  [Query.equal('manifest', manifestId)]
)
```

### Get manifest for a package:
```typescript
// Package already has manifest field populated
const package = await databases.getDocument(DATABASE_ID, PACKAGES_COLLECTION_ID, packageId)
console.log(package.manifest) // Manifest ID or object
```

### Count packages in a manifest:
```typescript
const count = await databases.listDocuments(
  DATABASE_ID,
  PACKAGES_COLLECTION_ID,
  [
    Query.equal('manifest', manifestId),
    Query.limit(1) // Just for count
  ]
)
console.log(count.total) // Total packages
```

## Testing Checklist

- [x] Upload proof of delivery image ✓
- [ ] View manifest with packages list
- [ ] Mark packages as delivered
- [ ] Submit manifest as delivered
- [ ] Create new manifest with packages
- [ ] Assign packages to existing manifest
- [ ] Remove packages from manifest
- [ ] Verify trip auto-completion

## Notes

- If you need two-way relationships for `trip` or other collections, they should work fine as long as they don't have the same issue
- The key is to avoid two-way relationships when one side needs frequent updates
- Always use one-way relationships for "has-many" scenarios where the parent gets updated often
- Appwrite's relationship validation is strict - it validates ALL relationships on ANY update

## Related Files

- `/src/libs/actions/manifest.actions.ts` - All manifest operations
- `/src/libs/actions/package.actions.ts` - Package operations
- `/src/views/edms/manifests/view/index.tsx` - Manifest view component with proof upload
