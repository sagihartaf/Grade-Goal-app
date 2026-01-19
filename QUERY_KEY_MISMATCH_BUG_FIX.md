# Query Key Mismatch Bug Fix - Empty State Showing Despite Data

## Problem
The Dashboard was rendering the "No semesters yet" empty state even though:
- Data existed in the database
- The Analytics page showed data correctly
- The API was returning data successfully

## Root Cause

### Query Key Mismatch
When implementing the hard reset feature, I added `dataRefreshKey` to the query key:

```typescript
// ❌ BROKEN - Separate cache entry
const { data: semesters = [] } = useQuery<SemesterWithCourses[]>({
  queryKey: ["/api/semesters", dataRefreshKey],  // e.g., ["/api/semesters", 0]
});
```

However, all mutations were invalidating the cache using a different key:

```typescript
// All mutations used this pattern:
queryClient.invalidateQueries({ queryKey: ["/api/semesters"] });
```

### The Cache Split
React Query treats these as **completely different queries**:
- Query A: `["/api/semesters", 0]` ← Dashboard was querying this (empty, no data)
- Query B: `["/api/semesters"]` ← Other components + mutations used this (has data)

**Result:** The Dashboard was querying an empty cache entry while the actual data lived in a different cache entry!

## Why This Happened

1. **Initial Load:**
   - Dashboard queries `["/api/semesters", 0]`
   - This is a brand new query with no cached data
   - API call happens, but returns data to the wrong cache key

2. **After Mutations:**
   - User creates/updates a semester
   - Mutation calls `invalidateQueries({ queryKey: ["/api/semesters"] })`
   - This invalidates `["/api/semesters"]` but NOT `["/api/semesters", 0]`
   - Dashboard still has stale/empty data

3. **Other Pages Work:**
   - Analytics page uses `["/api/semesters"]` (without the key)
   - Gets the correct cached data
   - Dashboard remains broken

## The Fix

### Remove `dataRefreshKey` from Query Key
```typescript
// ✅ FIXED - Consistent cache entry
const { data: semesters = [] } = useQuery<SemesterWithCourses[]>({
  queryKey: ["/api/semesters"],  // Matches all mutations
});
```

### Simplified Refresh Handler
The hard reset still works by:
1. Clearing local state
2. Invalidating the query (marks as stale)
3. Refetching with `queryClient.refetchQueries`
4. Using `gpaRefreshKey` to force component remount

We don't need `dataRefreshKey` in the query key - the combination of invalidation + refetch + component remount achieves the same hard reset without cache splitting.

## Why Query Keys Matter

React Query uses query keys as cache identifiers:

```typescript
// Different keys = Different cache entries
["/api/semesters"]       // Cache entry #1
["/api/semesters", 0]    // Cache entry #2 (separate!)
["/api/semesters", 1]    // Cache entry #3 (separate!)
```

When you call `invalidateQueries({ queryKey: ["/api/semesters"] })`, it only invalidates entries that **match exactly** or **start with** that key (if using `exact: false`).

Since `["/api/semesters", 0]` starts with `["/api/semesters"]`, it SHOULD match with `exact: false`, but our mutations were using the default behavior which didn't match.

## Lessons Learned

### 1. **Query Key Consistency**
Always use the same query key pattern across:
- `useQuery` hooks
- `invalidateQueries` calls
- `refetchQueries` calls

### 2. **Query Keys Are for Identification, Not State**
Don't add state variables to query keys unless you specifically want separate cache entries. For forcing refetches, use:
- `queryClient.invalidateQueries()` to mark as stale
- `queryClient.refetchQueries()` to force refetch
- Component keys to force remount

### 3. **Debug Empty States**
When data shows in one place but not another:
1. Check if query keys match
2. Check if data is in React Query DevTools
3. Compare cache entries between working/broken components

### 4. **Test Cache Invalidation**
After any mutation, verify:
- The correct queries are invalidated
- Data updates across all components
- No orphaned cache entries

## Verification

After the fix, verify:
- ✅ Dashboard shows semesters on first load
- ✅ Creating a semester immediately shows it
- ✅ Updating grades updates the GPA
- ✅ Refresh button still works
- ✅ No empty state when data exists
- ✅ All mutations properly update the UI

## Related Files Modified

- `client/src/pages/Dashboard.tsx` - Removed `dataRefreshKey` from query key and state

## Additional Notes

This is a common pitfall when using React Query - it's easy to accidentally create cache splits by using inconsistent query keys. The fix is simple once identified, but the bug can be very confusing because:
- No errors are thrown
- Data appears to exist (in DevTools, other components)
- The API works fine
- Only specific components show empty state

Always ensure query key consistency across your entire application!
