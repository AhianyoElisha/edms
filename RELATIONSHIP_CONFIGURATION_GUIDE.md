# 🔍 Appwrite One-to-Many Relationship Configuration Guide

## Your Current Setup

**TRIP Table:**
- `manifests` - Type: **One-to-many** (Trip can contain many manifests)

**MANIFEST Table:**
- `trip` - Type: **Many-to-one** (Manifests belong to one trip)

## The Issue

The error "Invalid relationship value. Must be either a document ID or a document, array given." suggests that Appwrite is rejecting the array of manifest IDs.

## ✅ How to Fix: Check Your Relationship Configuration

### **Step 1: Verify Relationship Type in Appwrite Console**

Go to your Appwrite Console → Database → Trip Collection → Attributes → manifests

Check the configuration:

#### **Option A: Two-way Relationship (Recommended)**
If your relationship is configured as **Two-way**:
- ✅ **You CAN set the manifests array on the trip**
- ✅ **Manifests automatically get trip ID**
- ✅ **Both sides are synced automatically**

**Configuration should be:**
```
Trip.manifests (One-to-many, Two-way)
  ↕️ (bidirectional)
Manifest.trip (Many-to-one, Two-way)
```

#### **Option B: One-way Relationship**
If your relationship is configured as **One-way** (from Manifest → Trip only):
- ❌ **You CANNOT set the manifests array on the trip**
- ✅ **Only manifests can set trip ID**
- ⚠️ **This is the current error you're getting**

**Configuration would be:**
```
Manifest.trip (Many-to-one, One-way)
  → (unidirectional)
Trip (no manifests field)
```

---

## 🔧 Solution Options

### **OPTION 1: Change to Two-way Relationship (RECOMMENDED)**

#### **In Appwrite Console:**

1. Go to **Database** → **Trips Collection** → **Attributes**
2. Find the `manifests` attribute
3. Click **Edit**
4. Ensure it's set to **Two-way relationship**
5. Save

#### **In Code (no changes needed if Two-way):**
```typescript
// This will work with Two-way relationship
await databases.updateDocument(
  appwriteConfig.database,
  appwriteConfig.trips,
  trip.$id,
  {
    manifests: manifestIds, // ✅ Array of manifest IDs
    checkpoints: JSON.stringify(checkpointsWithManifestIds)
  }
)
```

---

### **OPTION 2: Keep One-way Relationship (Current Fix)**

If you want to keep it One-way (from Manifest → Trip only):

#### **In Code:**
The relationship is managed ONLY from the manifest side:

```typescript
// ❌ DON'T update trip with manifests array
await databases.updateDocument(
  appwriteConfig.database,
  appwriteConfig.trips,
  trip.$id,
  {
    // No manifests field
    checkpoints: JSON.stringify(checkpointsWithManifestIds)
  }
)

// ✅ Manifests already have trip ID set when created
// This is enough for One-way relationship
const manifestDoc = {
  trip: trip.$id, // ✅ This creates the link
  // ... other fields
}
```

#### **To Query Manifests:**
```typescript
const manifests = await databases.listDocuments(
  appwriteConfig.database,
  appwriteConfig.manifests,
  [Query.equal('trip', tripId)]
)
```

---

## 📋 Quick Diagnostic Steps

### **Step 1: Check Current Configuration**

Run this test to see what's configured:

```typescript
// Try creating a trip without setting manifests
const trip = await databases.createDocument(
  appwriteConfig.database,
  appwriteConfig.trips,
  ID.unique(),
  {
    tripNumber: 'TEST-001',
    // ... other required fields
    // Don't set manifests
  }
)

// Then create a manifest pointing to the trip
const manifest = await databases.createDocument(
  appwriteConfig.database,
  appwriteConfig.manifests,
  ID.unique(),
  {
    manifestNumber: 'MAN-001',
    trip: trip.$id, // Set the relationship
    // ... other required fields
  }
)

// Now fetch the trip and see if manifests is populated
const tripWithManifests = await databases.getDocument(
  appwriteConfig.database,
  appwriteConfig.trips,
  trip.$id
)

console.log('Trip manifests:', tripWithManifests.manifests)
// If manifests array is populated automatically, it's Two-way
// If manifests is empty or undefined, it's One-way
```

### **Step 2: Based on Results**

#### **If `manifests` array is automatically populated:**
✅ You have **Two-way** relationship
→ Update code to set `manifests: manifestIds`

#### **If `manifests` array is empty:**
✅ You have **One-way** relationship
→ Keep current code (don't set manifests on trip)

---

## 💡 Recommendation

**Use Two-way Relationship** because:

1. ✅ Easier to query: `trip.manifests` gives you all manifests directly
2. ✅ Automatic sync: Both sides stay in sync
3. ✅ Better for your use case: You need to display manifests when viewing a trip
4. ✅ More intuitive: Matches your mental model (trip contains manifests)

---

## 🔄 How to Change to Two-way (If Needed)

### **In Appwrite Console:**

1. Go to your **Trips** collection
2. Click on **Attributes**
3. Find the **manifests** attribute (if it exists)
   - If it exists: Edit it and ensure "Two-way" is selected
   - If it doesn't exist: Create it as One-to-many, Two-way
4. Make sure it points to the **Manifests** collection
5. Make sure the **Manifests** collection has a `trip` attribute (Many-to-one, Two-way)

### **Attribute Configuration:**

**Trip Collection:**
```
Attribute Name: manifests
Type: Relationship (One-to-many)
Related Collection: Manifests
Two-way: ✅ YES
On Delete: Set NULL (or Cascade if you want to delete manifests when trip is deleted)
```

**Manifest Collection:**
```
Attribute Name: trip
Type: Relationship (Many-to-one)
Related Collection: Trips
Two-way: ✅ YES (should match Trip.manifests)
Required: ✅ YES
```

---

## 📝 Updated Code (After Setting Two-way)

If you set it to Two-way, update the code:

```typescript
// Step 4: Update trip with manifest IDs
await databases.updateDocument(
  appwriteConfig.database,
  appwriteConfig.trips,
  trip.$id,
  {
    manifests: manifestIds, // ✅ Now this will work
    checkpoints: JSON.stringify(checkpointsWithManifestIds)
  }
)
```

---

## 🎯 Current Code Status

The code is currently set to **NOT** update the manifests array, which works for **One-way** relationships.

If you want to use **Two-way** relationships (recommended), you need to:
1. ✅ Configure Two-way in Appwrite Console
2. ✅ Uncomment/add the manifests update in trip.actions.ts

---

## ❓ Next Steps

1. **Check your Appwrite Console** to see if manifests is One-way or Two-way
2. **Decide which approach you prefer** (Two-way recommended)
3. **Update configuration** in Appwrite if needed
4. **Update code** if you choose Two-way

Let me know what you find, and I'll help you update the code accordingly!
