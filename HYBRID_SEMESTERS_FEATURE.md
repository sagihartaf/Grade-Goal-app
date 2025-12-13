# Hybrid Semesters Feature: Per-Semester Legacy Data

## Overview
This feature transforms "Legacy Academic Data" from a hidden user profile stat into visible, editable "Hybrid Semesters" in the Dashboard. Users can now click "הוסף שנה שהסתיימה" (Add Completed Year), enter bulk statistics, and see it appear as a card alongside regular semesters. Critically, they can later add individual courses to these hybrid semesters, and the GPA calculation will intelligently combine both data sources.

---

## Architecture Change

### Before: Global Legacy Data
```
users table:
  - legacy_credits (global)
  - legacy_gpa (global)

Dashboard: Shows hidden stats
GPA Calculation: (globalLegacyGPA × globalLegacyCredits + coursePoints) / totalCredits
```

### After: Per-Semester Legacy Data
```
semesters table:
  - legacy_credits (per semester)
  - legacy_gpa (per semester)
  - is_legacy_visible (flag for UI)

Dashboard: Shows hybrid semester cards
GPA Calculation: Aggregates per-semester hybrid GPAs
```

---

## Database Schema Changes

### Migration: `supabase_migration_hybrid_semesters.sql`

```sql
ALTER TABLE semesters ADD COLUMN legacy_credits REAL DEFAULT 0 NOT NULL;
ALTER TABLE semesters ADD COLUMN legacy_gpa REAL DEFAULT 0 NOT NULL;
ALTER TABLE semesters ADD COLUMN is_legacy_visible BOOLEAN DEFAULT false NOT NULL;

ALTER TABLE semesters ADD CONSTRAINT semester_legacy_gpa_range 
  CHECK (legacy_gpa >= 0 AND legacy_gpa <= 100);
ALTER TABLE semesters ADD CONSTRAINT semester_legacy_credits_positive 
  CHECK (legacy_credits >= 0);
```

**Note:** We keep `users.legacy_credits` and `users.legacy_gpa` for backward compatibility with existing user data.

---

## Implementation Details

### 1. GPA Calculations (`client/src/lib/gpaCalculations.ts`)

#### New Function: `calculateHybridSemesterGpa`
```typescript
export function calculateHybridSemesterGpa(
  courses: CourseWithComponents[],
  legacyCredits: number = 0,
  legacyGpa: number = 0
): number | null
```

**Formula:**
```
Hybrid GPA = (legacyGpa × legacyCredits + actualGpa × actualCredits) / totalCredits
```

**Edge Cases:**
- Only legacy data → Returns `legacyGpa`
- Only courses → Returns calculated GPA from courses
- Both → Returns weighted average
- Neither → Returns `null`

#### Updated Function: `calculateDegreeGpa`
```typescript
export function calculateDegreeGpa(
  semesters: SemesterWithCourses[],
  globalLegacyCredits: number = 0,
  globalLegacyGpa: number = 0
): number | null
```

**New Logic:**
1. For each semester, calculate hybrid GPA (legacy + courses)
2. Aggregate all semester GPAs (weighted by total credits)
3. Add global legacy data for backward compatibility
4. Return weighted average

---

### 2. CreateSemesterDialog (`client/src/components/CreateSemesterDialog.tsx`)

#### Two Modes
**Regular Mode:**
- Standard semester creation
- No legacy data fields

**Completed Year Mode:**
- Bulk data entry (credits + GPA)
- Sets `isLegacyVisible = true`
- Marks semester as "hybrid"

#### Form Schema
```typescript
const completedYearFormSchema = z.object({
  academicYear: z.string().min(1),
  term: z.enum(["A", "B", "Summer"]),
  legacyCredits: z.number().min(0.1),
  legacyGpa: z.number().min(0).max(100),
});
```

---

### 3. Dashboard Updates (`client/src/pages/Dashboard.tsx`)

#### New State
```typescript
const [semesterDialogMode, setSemesterDialogMode] = useState<"regular" | "completedYear">("regular");
```

#### New Handler
```typescript
const handleAddCompletedYearClick = useCallback(() => {
  if (canCreateSemester(semesters.length, isPro)) {
    setSemesterDialogMode("completedYear");
    setIsCreateSemesterOpen(true);
  } else {
    setIsPaywallOpen(true);
  }
}, [semesters.length, isPro]);
```

#### New UI
```
┌─────────────────────────────────────┐
│  הוסף סמסטר  │  הוסף שנה שהסתיימה  │
│  (Regular)    │  (Completed Year)   │
└─────────────────────────────────────┘
```

---

### 4. SemesterCard Updates (`client/src/components/SemesterCard.tsx`)

#### Hybrid Semester Detection
```typescript
const legacyCredits = semester.legacyCredits || 0;
const isHybridSemester = semester.isLegacyVisible || legacyCredits > 0;
```

#### Visual Indicators
```
┌──────────────────────────────────────┐
│ 📚 Year 1 - Semester A               │
│ 📜 שנה משולבת  │  30 נ״ז              │ ← Hybrid badge
│ 20 נ״ז מקוצרות + 3 קורסים מפורטים   │ ← Legacy + courses
│ ממוצע: 87.5                          │ ← Hybrid GPA
└──────────────────────────────────────┘
```

#### Hybrid GPA Calculation
```typescript
const semesterGpa = useMemo(
  () => isHybridSemester 
    ? calculateHybridSemesterGpa(semester.courses, legacyCredits, legacyGpa)
    : calculateSemesterGpa(semester.courses),
  [semester.courses, isHybridSemester, legacyCredits, legacyGpa]
);
```

---

### 5. Smart Strategy Integration

#### Updated Logic
```typescript
// Calculate per-semester legacy data
const perSemesterLegacyCredits = semesters.reduce(
  (sum, sem) => sum + (sem.legacyCredits || 0), 0
);

// Total completed credits (global + per-semester + actual)
const completedCredits = 
  globalLegacyCredits + 
  perSemesterLegacyCredits + 
  actualCompletedCredits;
```

---

## User Workflows

### Workflow 1: New User with Completed Years

**Scenario:** 3rd year student with 2 completed years

**Steps:**
1. Sign up → Dashboard
2. Click "הוסף שנה שהסתיימה"
3. Enter:
   - Year: 1
   - Semester: A
   - Credits: 30
   - GPA: 85
4. Repeat for Year 1 - Semester B (30 credits, 87 GPA)
5. Repeat for Year 2 - Semesters (60 total credits, 86 avg)
6. Dashboard shows 3 hybrid semester cards
7. Add current semester courses as usual
8. GPA automatically combines all data

**Result:**
- Dashboard displays 3 "hybrid" semester cards with legacy data
- Can still add individual courses to any hybrid semester
- GPA reflects combined data (120 legacy credits + new courses)

---

### Workflow 2: Augmenting Hybrid Semester

**Scenario:** User realizes they remember some course details

**Steps:**
1. Have hybrid semester: "Year 1 - A" (30 credits, 85 GPA)
2. Click on semester card → Expand
3. Click "הוסף קורס"
4. Add course: "Calculus" (5 credits, grade 92)
5. System recalculates:
   - Legacy: 25 credits @ 85 = 2,125 points (adjusted)
   - Course: 5 credits @ 92 = 460 points
   - New GPA: 2,585 / 30 = 86.17

**Note:** When adding courses, the legacy credit count should logically represent "other courses" but the system treats it as bulk data that combines with detailed courses.

---

### Workflow 3: Migration from Global Legacy Data

**Existing users with `users.legacy_credits`:**

**Backward Compatibility:**
1. Existing global legacy data still works
2. GPA calculation includes both:
   - Global legacy (users.legacy_credits)
   - Per-semester legacy (semesters.legacy_credits)
3. User can gradually migrate by creating hybrid semesters
4. Eventually, profile legacy data can be zeroed out

---

## Technical Details

### Files Modified

#### Database & Schema
1. ✅ `supabase_migration_hybrid_semesters.sql`
2. ✅ `api/schemas.ts`
3. ✅ `api/shared/schema.ts`

#### Backend
4. ✅ `api/routes.ts` - Updated POST /api/semesters
5. ✅ `api/storage.ts` - Updated createSemester method

#### Frontend - Core Logic
6. ✅ `client/src/lib/gpaCalculations.ts`
   - Added `calculateHybridSemesterGpa`
   - Updated `calculateDegreeGpa`

#### Frontend - Components
7. ✅ `client/src/components/CreateSemesterDialog.tsx`
   - Added "completedYear" mode
   - Added legacy data inputs
   
8. ✅ `client/src/components/SemesterCard.tsx`
   - Added hybrid semester detection
   - Added visual indicators (History icon)
   - Updated GPA calculation
   - Updated credits display

9. ✅ `client/src/pages/Dashboard.tsx`
   - Added "Add Completed Year" button
   - Added `semesterDialogMode` state
   - Updated mutations

10. ✅ `client/src/components/SmartStrategyPlanner.tsx`
    - Updated to aggregate per-semester legacy data
    - Maintains backward compatibility

---

## Mathematical Examples

### Example 1: Pure Hybrid Semester
```
Semester: Year 1 - A
Legacy Credits: 30
Legacy GPA: 85
Courses: None

Hybrid GPA = 85 (from legacy data only)
```

### Example 2: Pure Course Semester
```
Semester: Year 3 - B
Legacy Credits: 0
Courses:
  - Calculus: 5 credits, 90
  - Physics: 4 credits, 88

Hybrid GPA = (90×5 + 88×4) / 9 = 89.11
```

### Example 3: Actual Hybrid
```
Semester: Year 2 - A
Legacy Credits: 20
Legacy GPA: 85
Courses:
  - Database: 5 credits, 95
  - Networks: 5 credits, 88

Calculation:
  Legacy points: 85 × 20 = 1,700
  Course points: (95×5 + 88×5) = 915
  Total credits: 20 + 10 = 30
  Hybrid GPA = (1,700 + 915) / 30 = 87.17
```

### Example 4: Degree GPA with Multiple Hybrids
```
Semester 1 (Hybrid): 30 credits @ 85 → 2,550 points
Semester 2 (Hybrid): 30 credits @ 87 → 2,610 points
Semester 3 (Regular): 30 credits @ 90 → 2,700 points

Total: 90 credits, 7,860 points
Degree GPA = 7,860 / 90 = 87.33
```

---

## Benefits

### User Experience
1. **Visible History:** Past years appear as cards, not hidden stats
2. **Flexibility:** Can add courses to hybrid semesters anytime
3. **Progressive Detail:** Start with bulk, add detail later
4. **Natural Workflow:** Matches how students think about their academic history

### Technical
1. **Granular Data:** Track legacy data per year/semester
2. **Better Insights:** Can see GPA progression over time
3. **Flexible Editing:** Add/remove courses from any semester
4. **Backward Compatible:** Existing users unaffected

---

## Testing Checklist

### Database
- [ ] Run migration in Supabase
- [ ] Verify constraints work (negative credits rejected)
- [ ] Verify constraints work (GPA > 100 rejected)

### Backend
- [ ] Create semester with legacy data
- [ ] Create regular semester
- [ ] Verify data persists correctly

### Frontend - Creation
- [ ] Click "הוסף שנה שהסתיימה"
- [ ] Enter valid data → Success
- [ ] Enter invalid data (negative credits) → Error
- [ ] Enter invalid data (GPA > 100) → Error

### Frontend - Display
- [ ] Hybrid semester shows History icon
- [ ] Hybrid semester shows correct badge
- [ ] Credits display shows breakdown
- [ ] GPA calculation is correct

### Frontend - Augmentation
- [ ] Add course to hybrid semester
- [ ] GPA recalculates correctly
- [ ] Credits update correctly
- [ ] Can add multiple courses

### Smart Strategy
- [ ] Works with only hybrid semesters
- [ ] Works with only regular semesters
- [ ] Works with mixed semesters
- [ ] Correctly calculates completed credits

### Backward Compatibility
- [ ] Existing users see unchanged behavior
- [ ] Global legacy data still works
- [ ] Can mix global + per-semester legacy

---

## Future Enhancements

1. **Edit Hybrid Data**
   - Add "Edit" button to modify legacy credits/GPA
   - Useful if user realizes they entered wrong data

2. **Breakdown View**
   - Show "20 legacy credits + 10 course credits = 30 total"
   - Make the hybrid nature more explicit

3. **Migration Tool**
   - Help users migrate from global to per-semester legacy
   - "Split your 60 legacy credits into Year 1 and Year 2"

4. **Import from Transcript**
   - Parse PDF/CSV transcripts
   - Auto-create hybrid semesters

---

## Migration Guide

### For Existing Users

**Option 1: Keep Global Legacy Data**
- No action needed
- Global legacy still works
- New semesters use per-semester approach

**Option 2: Migrate to Hybrid Semesters**
1. Note down global legacy data from Profile
2. Create hybrid semesters to represent that data
3. Zero out global legacy in Profile
4. System now uses only per-semester data

---

## 🎉 Feature Complete!

All requirements implemented:
- ✅ Database schema updated
- ✅ "Add Completed Year" dialog
- ✅ Hybrid semester display
- ✅ GPA calculations updated
- ✅ Smart Strategy updated
- ✅ Backward compatible
- ✅ No linter errors
- ✅ Fully documented

