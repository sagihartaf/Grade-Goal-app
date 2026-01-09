# Admin Dashboard Feature - Course Catalog Harvester

## Overview
This feature allows administrators to view popular courses created by users and "promote" them to the Global Course Catalog. This crowdsources course data by harvesting real user-created courses.

## Backend Implementation

### API Endpoints

#### 1. GET `/api/admin/candidates`
**Purpose**: Retrieve popular courses created by users that are candidates for the global catalog

**Authentication**: Requires authenticated user with email in `ADMIN_EMAILS` list

**Query Logic**:
```sql
WITH course_aggregates AS (
  SELECT 
    u.academic_institution as university,
    u.degree_name as degree,
    c.name as course_name,
    s.academic_year,
    s.term as semester,
    c.credits,
    c.difficulty,
    jsonb_agg(...) as components,
    COUNT(DISTINCT c.id) as user_count
  FROM courses c
  JOIN semesters s ON c.semester_id = s.id
  JOIN users u ON s.user_id = u.id
  WHERE 
    -- Filters
    u.academic_institution IS NOT NULL
    AND u.degree_name IS NOT NULL
    AND LENGTH(c.name) >= 3
    AND NOT EXISTS (
      SELECT 1 FROM global_courses gcl
      WHERE gcl.university_name = u.academic_institution
        AND gcl.course_name = c.name
    )
  GROUP BY university, degree, course_name, academic_year, semester, credits, difficulty
  HAVING COUNT(DISTINCT s.user_id) >= 1
)
SELECT * FROM course_aggregates
ORDER BY user_count DESC, course_name ASC
LIMIT 100
```

**Filters Applied**:
- ✅ Ignores courses already in `global_courses` (by university + course name)
- ✅ Ignores short course names (< 3 characters)
- ✅ Ignores courses from users without university/degree set
- ✅ Groups by all relevant fields for aggregation
- ✅ Orders by popularity (user_count DESC)

**Response**:
```json
{
  "candidates": [
    {
      "university": "SCE",
      "degree": "הנדסת תעשייה וניהול",
      "course_name": "חדוו״א 1",
      "academic_year": 1,
      "semester": "A",
      "credits": 5.0,
      "difficulty": "hard",
      "components": [
        {"name": "מבחן סופי", "weight": 70, "isMagen": false},
        {"name": "תרגילים", "weight": 30, "isMagen": false}
      ],
      "user_count": 15
    }
  ]
}
```

#### 2. POST `/api/admin/approve`
**Purpose**: Approve a course and add it to the global catalog

**Authentication**: Requires authenticated user with email in `ADMIN_EMAILS` list

**Request Body**:
```json
{
  "university": "SCE",
  "degree": "הנדסת תעשייה וניהול",
  "courseName": "חדוו״א 1",
  "credits": 5.0,
  "academicYear": 1,
  "semester": "A",
  "difficulty": "hard",
  "components": [
    {"name": "מבחן סופי", "weight": 70, "isMagen": false},
    {"name": "תרגילים", "weight": 30, "isMagen": false}
  ]
}
```

**Action**:
```sql
INSERT INTO global_courses (
  university_name,
  degree_name,
  course_name,
  credits,
  grade_breakdown_json,
  difficulty,
  academic_year,
  semester,
  last_verified_at
) VALUES (...)
ON CONFLICT (university_name, degree_name, course_name) DO NOTHING
```

**Conflict Handling**: Uses `ON CONFLICT DO NOTHING` to prevent duplicate entries

**Response**:
```json
{
  "message": "Course approved and added to catalog"
}
```

### Admin Authorization

**Location**: Both endpoints check admin status

**Admin Emails List**:
```typescript
const ADMIN_EMAILS = [
  "test@gmail.com",
  "admin@gradegame.com",
  // Add your admin emails here
];
```

**Authorization Check**:
```typescript
const user = await storage.getUser(userId);
if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
  return res.status(403).json({ message: "Access denied. Admin only." });
}
```

## Frontend Implementation

### Route
- **Path**: `/admin`
- **Component**: `AdminDashboard.tsx`
- **Protection**: Client-side check for admin email (same `ADMIN_EMAILS` list)

### UI Components

#### Access Control
```typescript
const ADMIN_EMAILS = [
  "test@gmail.com",
  "admin@gradegame.com",
];

const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);
```

If not admin → Shows "Access Denied" screen with Shield icon

#### Admin Dashboard Layout

**Header Card**:
- Title: "לוח ניהול - קטלוג קורסים"
- Description: "קורסים פופולריים שנוצרו על ידי משתמשים. אשר קורסים כדי להוסיף אותם לקטלוג הגלובלי."
- Button: "חזור לדף הבית"

**Table Columns**:
1. **מוסד** (University) - e.g., "SCE"
2. **תואר** (Degree) - e.g., "הנדסת תעשייה וניהול"
3. **שם קורס** (Course Name) - e.g., "חדוו״א 1"
4. **שנה/סמסטר** (Year/Semester) - e.g., "1 א׳"
5. **נ״ז** (Credits) - e.g., "5.0"
6. **קושי** (Difficulty) - Badge with color:
   - 🟢 קל (Easy) - Green
   - 🟡 בינוני (Medium) - Amber
   - 🔴 קשה (Hard) - Red
7. **👥 משתמשים** (Users) - Popularity count badge
8. **פעולות** (Actions) - "אשר" button

#### Approve Button Behavior

**Normal State**:
```tsx
<Button onClick={handleApprove}>
  <CheckCircle className="w-4 h-4 ms-2" />
  אשר
</Button>
```

**Loading State**:
```tsx
<Button disabled>
  <Loader2 className="w-4 h-4 ms-2 animate-spin" />
  מאשר...
</Button>
```

**Success**:
- Shows toast: "קורס אושר בהצלחה - הקורס נוסף לקטלוג הגלובלי"
- Removes row from table (via query invalidation)

**Error**:
- Shows error toast with error message
- Button returns to normal state

### State Management

**Query for Candidates**:
```typescript
const { data: candidatesData } = useQuery<{ candidates: CourseCandidate[] }>({
  queryKey: ["/api/admin/candidates"],
  enabled: !!user && ADMIN_EMAILS.includes(user.email || ""),
  retry: false,
});
```

**Approve Mutation**:
```typescript
const approveMutation = useMutation({
  mutationFn: async (candidate: CourseCandidate) => {
    await apiRequest("POST", "/api/admin/approve", {
      university: candidate.university,
      degree: candidate.degree,
      courseName: candidate.course_name,
      // ... other fields
    });
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/candidates"] });
    toast({ title: "קורס אושר בהצלחה" });
  },
});
```

## Files Created/Modified

### Backend
1. ✅ `api/storage.ts`
   - Added `getCourseCandidates()` method
   - Added `approveCourseCatalog()` method
   - Updated `IStorage` interface

2. ✅ `api/routes.ts`
   - Added `GET /api/admin/candidates` endpoint
   - Added `POST /api/admin/approve` endpoint

### Frontend
1. ✅ `client/src/pages/AdminDashboard.tsx` (NEW)
   - Full admin dashboard implementation
   - Access control
   - Table with candidates
   - Approve functionality

2. ✅ `client/src/App.tsx`
   - Added `/admin` route
   - Imported `AdminDashboard` component

## Security Considerations

1. **Double-Layer Protection**:
   - Frontend checks admin email (prevents UI access)
   - Backend checks admin email (prevents API access)

2. **SQL Injection Prevention**:
   - Uses parameterized queries
   - No string concatenation in SQL

3. **Conflict Handling**:
   - `ON CONFLICT DO NOTHING` prevents duplicate entries
   - Safe to approve same course multiple times

4. **Admin Email Management**:
   - Hardcoded in both frontend and backend
   - Easy to update by modifying the `ADMIN_EMAILS` array
   - Consider moving to environment variables for production

## Usage Instructions

### For Admins

1. **Access the Dashboard**:
   - Navigate to `/admin`
   - Must be logged in with an admin email

2. **Review Candidates**:
   - Table shows popular courses created by users
   - Sorted by popularity (most users first)
   - Shows all relevant metadata

3. **Approve Courses**:
   - Click "אשר" button on any row
   - Course is added to `global_courses` table
   - Row disappears from the table

4. **Monitor Popularity**:
   - "משתמשים" column shows how many users created this course
   - Higher numbers indicate more popular/verified courses

### For Developers

**Add Admin Email**:
```typescript
// In api/routes.ts and client/src/pages/AdminDashboard.tsx
const ADMIN_EMAILS = [
  "test@gmail.com",
  "admin@gradegame.com",
  "your-email@example.com", // Add here
];
```

**Adjust Popularity Threshold**:
```sql
-- In api/storage.ts, getCourseCandidates()
HAVING COUNT(DISTINCT s.user_id) >= 2  -- Change from 1 to 2
```

**Adjust Result Limit**:
```sql
-- In api/storage.ts, getCourseCandidates()
LIMIT 100  -- Change to desired limit
```

## Future Enhancements

1. **Batch Approval**: Select multiple courses and approve all at once
2. **Rejection**: Add ability to reject/hide courses
3. **Editing**: Allow admin to edit course details before approving
4. **Analytics**: Show trends, most popular universities/degrees
5. **Verification Status**: Track who approved which courses and when
6. **Environment Variables**: Move `ADMIN_EMAILS` to config file

## Testing

1. **As Non-Admin**:
   - Navigate to `/admin`
   - Should see "Access Denied" screen

2. **As Admin**:
   - Navigate to `/admin`
   - Should see table of candidates
   - Click "אשר" on a course
   - Should see success toast
   - Course should disappear from table
   - Check `global_courses` table - course should be there

3. **Duplicate Handling**:
   - Approve the same course twice (shouldn't be possible via UI)
   - Second approval should succeed silently (ON CONFLICT DO NOTHING)

## Summary

The Admin Dashboard provides a powerful way to crowdsource course data:
- ✅ Automatic harvesting of popular user-created courses
- ✅ Simple approval workflow
- ✅ Secure admin-only access
- ✅ Clean UI with ShadCN components
- ✅ Real-time updates via React Query
- ✅ Prevention of duplicates

This feature transforms user contributions into a comprehensive course catalog, reducing manual data entry and ensuring the catalog reflects actual student usage.
