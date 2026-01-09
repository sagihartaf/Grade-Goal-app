# API 500 Error Fix - Semester Column Type Mismatch

## Problem
API endpoint `GET /api/courses/recommended?year=1&semester=A&university=SCE` returned **500 Internal Server Error**.

### Root Cause
**Schema Type Mismatch**: The database has a `VARCHAR(1)` column with CHECK constraint `IN ('A', 'B', 'S')`, but the Drizzle schema was trying to use `termEnum("semester")` which expects a PostgreSQL enum type.

## Database State (Manual SQL)
```sql
ALTER TABLE global_courses 
ADD COLUMN semester VARCHAR(1) 
CHECK (semester IN ('A', 'B', 'S'));
```

- Column type: `VARCHAR(1)`
- Allowed values: 'A', 'B', 'S' (Summer)
- No PostgreSQL ENUM type created

## Drizzle Schema (Before Fix)
```typescript
// ❌ WRONG - Uses termEnum which expects a PostgreSQL enum
export const globalCourses = pgTable("global_courses", {
  // ...
  semester: termEnum("semester"), // 'A', 'B', 'Summer', or NULL
  // ...
});
```

### Why This Failed:
1. `termEnum()` generates SQL that expects a PostgreSQL ENUM type
2. Database has VARCHAR(1), not ENUM
3. Type mismatch causes query to crash with 500 error
4. Values 'Summer' and 'Yearly' don't match database constraint ('A', 'B', 'S')

## Solution Applied

### 1. Fixed Schema Definition (`api/schemas.ts`)
```typescript
// ✅ CORRECT - Uses varchar to match actual database column
export const globalCourses = pgTable("global_courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  universityName: text("university_name").notNull(),
  degreeName: text("degree_name"),
  courseName: text("course_name").notNull(),
  credits: real("credits").notNull(),
  gradeBreakdownJson: jsonb("grade_breakdown_json").notNull(),
  difficulty: difficultyEnum("difficulty").default("medium"),
  academicYear: integer("academic_year"),
  semester: varchar("semester", { length: 1 }), // 'A', 'B', 'S', or NULL ✅
  lastVerifiedAt: timestamp("last_verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### 2. Updated Type Signatures (`api/storage.ts`)
```typescript
// ✅ Changed from "Summer" | "Yearly" to "S"
async getRecommendedCourses(
  university: string,
  degree: string | null,
  academicYear: number,
  semester: "A" | "B" | "S"  // ✅ Matches database constraint
): Promise<...>
```

### 3. Enhanced Query Logic (`api/storage.ts`)
```typescript
try {
  // ✅ Added debug logging
  console.log('getRecommendedCourses called with:', {
    university,
    degree,
    academicYear,
    semester,
    academicYearType: typeof academicYear,
  });

  // ✅ Ensure academicYear is a number (handle string conversion)
  const yearNum = typeof academicYear === 'string' ? parseInt(academicYear) : academicYear;
  
  if (isNaN(yearNum)) {
    throw new Error(`Invalid academic year: ${academicYear}`);
  }

  // ✅ Added explicit type casting in SQL query
  const result = await pool.query(
    `SELECT 
      id,
      course_name,
      credits,
      grade_breakdown_json,
      difficulty,
      degree_name
    FROM global_courses
    WHERE university_name = $1
      AND (
        ($2::text IS NOT NULL AND degree_name = $2) OR
        degree_name IS NULL
      )
      AND (academic_year = $3::integer OR academic_year IS NULL)
      AND (semester = $4::varchar OR semester IS NULL)  -- ✅ Explicit cast
    ORDER BY
      CASE WHEN degree_name = $2 THEN 1 ELSE 2 END,
      CASE WHEN degree_name IS NULL THEN 2 ELSE 3 END,
      course_name ASC`,
    [university, degree, yearNum, semester]
  );

  console.log(`getRecommendedCourses returned ${result.rows.length} courses`);
  
  return result.rows.map(...);
} catch (error) {
  console.error('getRecommendedCourses error:', error);
  throw error;
}
```

### 4. Added Semester Value Mapping (`api/routes.ts`)
```typescript
// ✅ Map frontend semester values to database values
const semesterMapping: Record<string, "A" | "B" | "S"> = {
  "A": "A",
  "B": "B",
  "Summer": "S",      // Frontend uses "Summer", DB uses "S"
  "Yearly": "A",      // Default yearly to A (or handle separately)
};

if (!semester || !["A", "B", "Summer", "Yearly"].includes(semester)) {
  console.error('Invalid semester parameter:', semester);
  return res.status(400).json({ message: "Semester must be one of: A, B, Summer, Yearly" });
}

const dbSemester = semesterMapping[semester];
if (!dbSemester) {
  console.error('Could not map semester to database value:', semester);
  return res.status(400).json({ message: "Invalid semester value" });
}

// ✅ Pass mapped value to storage
const courses = await storage.getRecommendedCourses(
  searchUniversity,
  searchDegree,
  parseInt(year),
  dbSemester  // ✅ Uses 'A', 'B', or 'S'
);
```

### 5. Comprehensive Error Logging (`api/routes.ts`)
```typescript
try {
  console.log('GET /api/courses/recommended - Request params:', {
    university,
    degree,
    year,
    semester,
    userId,
  });

  // ... validation and processing ...

  console.log('Calling storage.getRecommendedCourses with:', {
    searchUniversity,
    searchDegree,
    year: parseInt(year),
    dbSemester,
  });

  const courses = await storage.getRecommendedCourses(...);

  console.log('GET /api/courses/recommended - Success:', {
    courseCount: courses.length,
  });

  res.json({ courses });
} catch (error) {
  console.error("Error fetching recommended courses - Full error:", error);
  console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
  res.status(500).json({ 
    message: "Failed to fetch recommended courses",
    error: error instanceof Error ? error.message : 'Unknown error'  // ✅ Return error details
  });
}
```

## Key Differences: User Semesters vs Global Courses

### User Semesters (`semesters` table)
- Uses PostgreSQL ENUM: `termEnum("term", ["A", "B", "Summer", "Yearly"])`
- Allows full names: "A", "B", "Summer", "Yearly"
- Displayed in UI as-is

### Global Courses (`global_courses` table)
- Uses VARCHAR(1): `varchar("semester", { length: 1 })`
- Constrained to: 'A', 'B', 'S'
- API maps between frontend ("Summer") and database ("S")

## Testing the Fix

### 1. Restart the Server
```bash
npm run dev
```

### 2. Check Server Logs
When making the request, you should see:
```
GET /api/courses/recommended - Request params: { university: 'SCE', degree: 'הנדסת תעשייה וניהול', year: '1', semester: 'A', userId: '...' }
getRecommendedCourses called with: { university: 'SCE', degree: 'הנדסת תעשייה וניהול', academicYear: 1, semester: 'A', academicYearType: 'number' }
getRecommendedCourses returned X courses
GET /api/courses/recommended - Success: { courseCount: X }
```

### 3. Test the Import
1. Log in as user with university = 'SCE'
2. Create Year 1, Semester A
3. Click "ייבא קורסים מומלצים"
4. Should successfully import courses (or return 0 if no data seeded yet)

### 4. Verify in Database
Run the verification SQL (see `VERIFY_SEMESTER_COLUMN.sql`)

## If Still Getting 500 Error

Check server logs for:
1. **Type mismatch errors**: "column semester is of type character varying but expression is of type term"
   - Solution: Restart server to reload schema definitions
2. **Parse errors**: "invalid input syntax"
   - Solution: Check that semester values in DB are 'A', 'B', or 'S' (not NULL or other values)
3. **Missing data**: Returns 0 courses
   - Solution: Populate the `semester` column with appropriate values using UPDATE queries

## Files Changed
1. ✅ `api/schemas.ts` - Changed `termEnum` to `varchar`
2. ✅ `api/storage.ts` - Updated types, added logging, improved query
3. ✅ `api/routes.ts` - Added semester mapping, comprehensive logging

## Summary
The 500 error was caused by a type mismatch between the Drizzle schema (expecting PostgreSQL ENUM) and the actual database column (VARCHAR). The fix aligns the schema with the database structure and adds proper value mapping and error logging.
