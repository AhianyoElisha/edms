# Appwrite Relationship Best Practices

Based on our experience fixing the manifest-packages relationship issue.

## When to Use One-Way vs Two-Way Relationships

### Use One-Way Relationships When:
✅ Parent entity gets updated frequently
✅ You have a clear "belongs to" relationship (e.g., packages belong to manifest)
✅ You need to update parent without triggering child validation
✅ You're building a "has-many" relationship where the "many" side is more stable

**Example:** Packages → Manifest (one-way)
- Packages reference their manifest
- Manifest doesn't store package IDs
- Query packages by manifest ID when needed

### Use Two-Way Relationships When:
✅ Both sides need direct access to each other
✅ Updates are infrequent on both sides
✅ You need Appwrite to maintain referential integrity automatically
✅ You want cascading deletes/updates

**Example:** User ↔ Profile (two-way)
- User has one profile
- Profile belongs to one user
- Both are relatively stable

## Common Patterns

### Pattern 1: One-to-Many (One-Way)
**Use Case:** Manifest has many Packages

```typescript
// Packages Collection
{
  manifest: "manifestId" // Relationship field (Many-to-One)
}

// Manifests Collection
{
  totalPackages: 0 // Scalar count field
  // NO packages array
}

// Query packages for a manifest
const packages = await databases.listDocuments(
  DATABASE_ID,
  PACKAGES_COLLECTION_ID,
  [Query.equal('manifest', manifestId)]
)
```

### Pattern 2: Many-to-Many (Junction Table)
**Use Case:** Students can enroll in multiple Courses, Courses have multiple Students

```typescript
// Students Collection - No course references
// Courses Collection - No student references

// Enrollments Collection (Junction)
{
  student: "studentId",
  course: "courseId",
  enrollmentDate: "2025-01-01"
}

// Query courses for a student
const enrollments = await databases.listDocuments(
  DATABASE_ID,
  ENROLLMENTS_COLLECTION_ID,
  [Query.equal('student', studentId)]
)
```

### Pattern 3: Hierarchical (One-Way)
**Use Case:** Comments on a Post

```typescript
// Comments Collection
{
  post: "postId", // One-way relationship
  content: "...",
  author: "userId"
}

// Posts Collection - No comments array

// Get comments for post
const comments = await databases.listDocuments(
  DATABASE_ID,
  COMMENTS_COLLECTION_ID,
  [
    Query.equal('post', postId),
    Query.orderDesc('$createdAt')
  ]
)
```

## Appwrite Relationship Gotchas

### 🚫 Problem: "Invalid relationship value" on scalar field update
**Cause:** Two-way relationship triggers validation on ALL fields
**Solution:** Convert to one-way relationship

### 🚫 Problem: Can't delete parent when children exist
**Cause:** Relationship configured with "Restrict" on delete
**Solution:** Change to "Set Null" or "Cascade" in Appwrite Console

### 🚫 Problem: Performance issues with large relationships
**Cause:** Fetching all related documents every time
**Solution:** 
- Use pagination with `Query.limit()` and `Query.offset()`
- Only fetch relationships when needed
- Cache frequently accessed data

### 🚫 Problem: Circular dependency in queries
**Cause:** Trying to select relationships recursively
**Solution:** Limit depth with specific Query.select() fields

## Migration Checklist

When converting from two-way to one-way:

1. **Backend (Appwrite Console)**
   - [ ] Identify which side should hold the relationship
   - [ ] Remove relationship from parent collection
   - [ ] Configure one-way relationship on child collection
   - [ ] Set "On Delete" behavior (Set Null or Cascade)

2. **Code Updates**
   - [ ] Update create functions (create parent, then assign children)
   - [ ] Update fetch functions (query children by parent ID)
   - [ ] Update assign functions (update child's parent field)
   - [ ] Update remove functions (set child's parent field to null)
   - [ ] Add parent count fields if needed (totalChildren)

3. **Testing**
   - [ ] Test create with relationships
   - [ ] Test update parent without affecting children
   - [ ] Test update children
   - [ ] Test delete parent (verify On Delete behavior)
   - [ ] Test queries (get children by parent)
   - [ ] Check performance with large datasets

## Performance Tips

### Use Query.limit() and Query.offset()
```typescript
// Paginate large relationships
const PAGE_SIZE = 50
const packages = await databases.listDocuments(
  DATABASE_ID,
  PACKAGES_COLLECTION_ID,
  [
    Query.equal('manifest', manifestId),
    Query.limit(PAGE_SIZE),
    Query.offset(page * PAGE_SIZE)
  ]
)
```

### Use Query.select() to limit fields
```typescript
// Only fetch needed fields
const packages = await databases.listDocuments(
  DATABASE_ID,
  PACKAGES_COLLECTION_ID,
  [
    Query.equal('manifest', manifestId),
    Query.select(['$id', 'trackingNumber', 'status'])
  ]
)
```

### Cache counts to avoid repeated queries
```typescript
// Store count in parent document
{
  totalPackages: 42, // Updated when packages are added/removed
  deliveredPackages: 35 // Updated when package status changes
}

// Instead of counting every time
const count = await databases.listDocuments(
  DATABASE_ID,
  PACKAGES_COLLECTION_ID,
  [Query.equal('manifest', manifestId)]
)
console.log(count.total) // Expensive for large datasets
```

## Summary

- **Default to one-way relationships** for has-many scenarios
- **Use two-way only when necessary** and both sides are stable
- **Query children by parent ID** instead of storing arrays
- **Keep counts in parent** for performance
- **Test relationship behavior** especially on delete/update operations

## References

- [Appwrite Relationships Documentation](https://appwrite.io/docs/products/databases/relationships)
- Our fix: `MANIFEST_RELATIONSHIP_FIX.md`
