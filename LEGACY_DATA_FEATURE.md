# Legacy Academic Data Feature

## Overview
This feature allows advanced students (e.g., 3rd year) to input their past academic history in bulk, significantly reducing onboarding friction by eliminating the need to manually enter every past course.

---

## Database Schema

### Migration: `supabase_migration_legacy_data.sql`

```sql
ALTER TABLE users ADD COLUMN legacy_credits REAL DEFAULT 0 NOT NULL;
ALTER TABLE users ADD COLUMN legacy_gpa REAL DEFAULT 0 NOT NULL;
```

**Constraints:**
- `legacy_gpa`: Must be between 0 and 100
- `legacy_credits`: Must be non-negative

---

## User Interface

### Profile Page (`client/src/pages/Profile.tsx`)

**New Section:** "היסטוריה אקדמית (קיצור דרך)"

**Fields:**
1. **Legacy Credits** (`legacyCredits`)
   - Label: "נקודות זכות שצברת עד היום (ללא פירוט קורסים)"
   - Placeholder: "לדוגמה: 40"
   - Description: "סך כל נקודות הזכות מקורסים קודמים"

2. **Legacy GPA** (`legacyGpa`)
   - Label: "ממוצע משוקלל של הנקודות האלו"
   - Placeholder: "לדוגמה: 85"
   - Description: "הממוצע שהיה לך בקורסים הקודמים"

**Tooltip:**
> "המערכת תשלב את הנתונים האלה עם קורסים חדשים שתוסיף. שימושי לסטודנטים בשנים מתקדמות."

---

## Logic Integration

### 1. GPA Calculation (`client/src/lib/gpaCalculations.ts`)

The `calculateDegreeGpa` function combines legacy data with actual courses:

```typescript
export function calculateDegreeGpa(
  semesters: SemesterWithCourses[],
  legacyCredits: number = 0,
  legacyGpa: number = 0
): number | null
```

**Formula:**
```
Total GPA = (legacyGpa × legacyCredits + actualGpa × actualCredits) / (legacyCredits + actualCredits)
```

**Edge Cases:**
- No data: Returns `null`
- Only legacy data: Returns `legacyGpa`
- Only actual courses: Returns calculated GPA from courses
- Both: Returns weighted average

### 2. Dashboard Integration

**File:** `client/src/pages/Dashboard.tsx`

```typescript
const degreeGpa = useMemo(
  () => calculateDegreeGpa(
    effectiveSemesters,
    user?.legacyCredits || 0,
    user?.legacyGpa || 0
  ),
  [effectiveSemesters, user?.legacyCredits, user?.legacyGpa]
);
```

### 3. Smart Strategy Integration

**File:** `client/src/components/SmartStrategyPlanner.tsx`

```typescript
// Extract legacy data
const legacyCredits = user?.legacyCredits || 0;
const legacyGpa = user?.legacyGpa || 0;

// Calculate current stats (including legacy data)
const currentGPA = calculateDegreeGpa(semesters, legacyCredits, legacyGpa);

// Total credits for strategy calculation
const actualCompletedCredits = allCourses
  .filter(course => course.gradeComponents.some(c => c.score !== null))
  .reduce((sum, course) => sum + course.credits, 0);

const completedCredits = legacyCredits + actualCompletedCredits;
```

**Important Note:**
- The adaptive "Personal Bias" learning still only works on individual courses in the database
- If only legacy data exists, the algorithm falls back to generic bias (+2/0/-2)
- This is intentional: we can't learn difficulty patterns from bulk data

---

## Example User Flow

### Scenario: 3rd Year Student Onboarding

**User Profile:**
- Name: Sarah
- Current Status: 3rd year, Industrial Engineering
- Past Performance: 40 credits completed, 85 average
- Future: 3 courses remaining

**Step 1: Sign Up & Enter Legacy Data**
```
Profile Page:
- Academic Institution: "Technion"
- Degree Name: "הנדסת תעשייה וניהול"
- Target GPA: 90
- Legacy Credits: 40
- Legacy GPA: 85
```

**Step 2: Add Future Courses**
```
Dashboard:
- Add Semester: "Year 3 - Semester B"
- Add Course: "Operations Research" (Hard, 4 credits)
- Add Course: "Quality Control" (Medium, 3 credits)
- Add Course: "Project Management" (Easy, 3 credits)
```

**Step 3: Generate Smart Strategy**
```
Smart Strategy Planner:
- Current GPA: 85 (from legacy data)
- Completed Credits: 40
- Future Courses: 3 (10 credits)
- Target GPA: 90
- Max Realistic Grade: 96

Algorithm Calculation:
- Required Total Points: 90 × 50 = 4,500
- Current Points: 85 × 40 = 3,400
- Needed from Future: 4,500 - 3,400 = 1,100
- Required Future Avg: 1,100 / 10 = 110... ❌ Impossible!

Let's try Target GPA: 88
- Required Total Points: 88 × 50 = 4,400
- Current Points: 85 × 40 = 3,400
- Needed from Future: 1,000
- Required Future Avg: 1,000 / 10 = 100

With generic bias (no history):
- Project Management (Easy): 100 + 2 = 102 → capped at 96
- Quality Control (Medium): 100 + 0 = 100 → capped at 96
- Operations Research (Hard): 100 - 2 = 98 → capped at 96

Result: All courses at 96 (max realistic)
```

**Step 4: Track Progress**
```
As Sarah completes courses:
- Dashboard shows combined GPA (legacy + new courses)
- Smart Strategy learns from her actual performance
- Future recommendations become personalized
```

---

## Benefits

1. **Reduced Onboarding Friction**
   - No need to enter dozens of past courses
   - Immediate access to GPA tracking and planning

2. **Accurate GPA Calculation**
   - Weighted average combines legacy and new data
   - Reflects true academic standing

3. **Smart Strategy Compatibility**
   - Works immediately with bulk data
   - Becomes more accurate as individual courses are added

4. **Flexible Data Entry**
   - Can start with legacy data only
   - Can add individual courses later for better insights
   - Can update legacy data anytime

---

## Technical Implementation

### Files Modified

1. **Schema:**
   - `api/schemas.ts`
   - `api/shared/schema.ts`

2. **Backend:**
   - `api/routes.ts` (profile update endpoint)

3. **Frontend:**
   - `client/src/pages/Profile.tsx` (UI)
   - `client/src/lib/gpaCalculations.ts` (logic)
   - `client/src/pages/Dashboard.tsx` (integration)
   - `client/src/components/SmartStrategyPlanner.tsx` (integration)
   - `client/src/components/GpaHeader.tsx` (display)

### Migration File
- `supabase_migration_legacy_data.sql`

---

## Testing Checklist

- [ ] Run migration in Supabase
- [ ] Create new user
- [ ] Enter legacy data (40 credits, 85 GPA)
- [ ] Verify Dashboard shows 85 GPA
- [ ] Add future course
- [ ] Generate Smart Strategy (should use 85 as current GPA)
- [ ] Add completed course with grade
- [ ] Verify Dashboard shows combined GPA
- [ ] Generate new strategy (should still work correctly)
- [ ] Update legacy data
- [ ] Verify all calculations update

---

## Future Enhancements

1. **Import from Transcript**
   - Allow PDF/CSV upload
   - Parse and extract legacy data automatically

2. **Legacy Data Breakdown**
   - Optional: Enter legacy data by year/semester
   - Better visualization of academic progress

3. **Migration Wizard**
   - Guide users through converting legacy data to individual courses
   - Preserve historical learning for better AI recommendations

---

## Notes

- Legacy data is optional (defaults to 0)
- Users can mix legacy data with individual courses
- System handles all edge cases gracefully
- No breaking changes to existing functionality


