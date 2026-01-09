# Import Recommended Courses - Bug Fix

## Problem
User reported: "Clicking 'Import Recommended Courses' shows error 'Academic institution is required' even though database has `university_name = 'SCE'`"

## Root Cause
**API Endpoint Mismatch**: Multiple components were querying `/api/profile` which doesn't exist as a GET endpoint. The correct endpoint is `/api/auth/user`.

### Components Affected:
1. `Dashboard.tsx` - Line 56: Was using `/api/profile`
2. `CreateCourseDialog.tsx` - Line 79: Was using `/api/profile`
3. `PayPalSubscription.tsx` - Line 45: Was invalidating `/api/profile`

### Why This Caused the Error:
- Query to non-existent endpoint returned `undefined`
- `user?.academicInstitution` was always `undefined`
- Frontend validation blocked the import before reaching the API

## Solution Applied

### 1. Fixed API Endpoint References
**File: `client/src/pages/Dashboard.tsx`**
```typescript
// BEFORE
const { data: user } = useQuery<User>({
  queryKey: ["/api/profile"],  // ❌ Wrong endpoint
});

// AFTER
const { data: user } = useQuery<User>({
  queryKey: ["/api/auth/user"],  // ✅ Correct endpoint
});
```

**File: `client/src/components/CreateCourseDialog.tsx`**
```typescript
// Changed queryKey from "/api/profile" to "/api/auth/user"
```

**File: `client/src/components/PayPalSubscription.tsx`**
```typescript
// Changed invalidateQueries queryKey from "/api/profile" to "/api/auth/user"
```

### 2. Improved Error Handling
**File: `client/src/pages/Dashboard.tsx` - `handleImportRecommended()`**

#### Added Debug Logging:
```typescript
console.log('Import Recommended - Current User State:', user);
console.log('Import Recommended - Academic Institution:', user?.academicInstitution);
console.log('Import Recommended - Degree Name:', user?.degreeName);
```

#### Removed Frontend Blocking:
```typescript
// BEFORE: Blocked request if no institution
if (!user?.academicInstitution) {
  toast({ 
    title: "נדרש להגדיר מוסד אקדמי", 
    variant: "destructive" 
  });
  return;  // ❌ Blocked the request
}

// AFTER: Warn but let API validate
if (!user?.academicInstitution) {
  console.warn('No academic institution set. Proceeding with API call - server will validate.');
}
// Request continues to API ✅
```

#### Enhanced API Error Handling:
```typescript
if (!response.ok) {
  const errorData = await response.json().catch(() => ({}));
  console.error('Import Recommended API Error:', { status: response.status, errorData });
  
  // Show specific message for 400 missing institution error
  if (response.status === 400 && errorData.message?.includes('University not set')) {
    setImportingSemesterId(null);
    toast({ 
      title: "נדרש להגדיר מוסד אקדמי", 
      description: "הגדר את המוסד האקדמי שלך בפרופיל כדי לייבא קורסים מומלצים",
      variant: "destructive" 
    });
    return;
  }
  
  throw new Error(`Failed to fetch recommended courses: ${response.status}`);
}
```

## Database Schema Verification

### Table: `users`
- Column: `academic_institution` (database)
- TypeScript Field: `academicInstitution` (camelCase)
- Drizzle ORM correctly maps between them

### Type Definition (`api/shared/schema.ts`):
```typescript
export const users = pgTable("users", {
  // ...
  academicInstitution: text("academic_institution"),
  degreeName: text("degree_name"),
  // ...
});

export type User = typeof users.$inferSelect;
```

## Testing Instructions

### 1. Verify Fix Works:
1. Log in with user who has `academic_institution = 'SCE'` in database
2. Create a new semester: Year 1, Semester A
3. Open the empty semester (expand it)
4. Click "ייבא קורסים מומלצים" button
5. Check browser console for debug logs:
   ```
   Import Recommended - Current User State: { academicInstitution: "SCE", ... }
   Import Recommended - Academic Institution: SCE
   Import Recommended - Degree Name: הנדסת תעשייה וניהול
   ```
6. Verify courses are imported successfully

### 2. Verify Error Handling:
1. Log in with user who has NO academic institution set
2. Try to import recommended courses
3. Should see error: "נדרש להגדיר מוסד אקדמי"
4. Go to Profile, set University to "SCE" and Degree
5. Try import again - should work

### 3. Check Console:
- No 404 errors for `/api/profile`
- Debug logs show correct user data
- API errors are clearly logged

## Files Changed
1. ✅ `client/src/pages/Dashboard.tsx` - Fixed queryKey + improved error handling
2. ✅ `client/src/components/CreateCourseDialog.tsx` - Fixed queryKey
3. ✅ `client/src/components/PayPalSubscription.tsx` - Fixed invalidateQueries

## Summary
The bug was caused by querying a non-existent API endpoint (`/api/profile` instead of `/api/auth/user`). This caused the user object to be `undefined`, which made `user?.academicInstitution` always falsy, triggering the validation error. 

The fix:
1. ✅ Corrected all API endpoint references to `/api/auth/user`
2. ✅ Added comprehensive debug logging
3. ✅ Moved validation from frontend to API (more resilient)
4. ✅ Enhanced error messages for better UX

The import feature should now work correctly for users with academic institutions set in their profiles.
