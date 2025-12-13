# Legacy Data Flow Diagram

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INPUT                              │
│                      (Profile Page)                             │
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────┐            │
│  │ Legacy Credits   │         │   Legacy GPA     │            │
│  │    (40)          │         │     (85)         │            │
│  └──────────────────┘         └──────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (API)                              │
│                                                                 │
│  PATCH /api/profile                                            │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Validation (Zod Schema)                                   │ │
│  │  - legacyCredits: z.number().min(0)                      │ │
│  │  - legacyGpa: z.number().min(0).max(100)                 │ │
│  └──────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ storage.updateUserProfile(userId, data)                   │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (Supabase)                          │
│                                                                 │
│  users table:                                                   │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ id: "abc123"                                              │ │
│  │ email: "student@example.com"                              │ │
│  │ legacy_credits: 40          ← NEW                         │ │
│  │ legacy_gpa: 85              ← NEW                         │ │
│  │ ...                                                        │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Constraints:                                                   │
│  ✓ legacy_credits >= 0                                         │
│  ✓ legacy_gpa BETWEEN 0 AND 100                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FRONTEND (React Query)                        │
│                                                                 │
│  useQuery<User>({ queryKey: ["/api/profile"] })               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ user.legacyCredits = 40                                   │ │
│  │ user.legacyGpa = 85                                       │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GPA CALCULATION                              │
│                (gpaCalculations.ts)                             │
│                                                                 │
│  calculateDegreeGpa(semesters, legacyCredits, legacyGpa)      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Legacy Data:                                              │ │
│  │   legacyCredits = 40                                      │ │
│  │   legacyGpa = 85                                          │ │
│  │   legacyPoints = 85 × 40 = 3,400                         │ │
│  │                                                            │ │
│  │ Actual Courses:                                           │ │
│  │   Course 1: 90 × 3 = 270                                 │ │
│  │   Course 2: 88 × 3 = 264                                 │ │
│  │   actualCredits = 6                                       │ │
│  │   actualPoints = 534                                      │ │
│  │                                                            │ │
│  │ Combined:                                                  │ │
│  │   totalCredits = 40 + 6 = 46                             │ │
│  │   totalPoints = 3,400 + 534 = 3,934                      │ │
│  │   finalGPA = 3,934 / 46 = 85.52                          │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      UI COMPONENTS                              │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │   Dashboard      │  │   GpaHeader      │  │   Strategy   │ │
│  │                  │  │                  │  │   Planner    │ │
│  │  Shows: 85.52    │  │  Shows: 85.52    │  │  Uses: 85.52 │ │
│  │  (combined GPA)  │  │  (combined GPA)  │  │  & 46 credits│ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Smart Strategy Flow with Legacy Data

```
┌─────────────────────────────────────────────────────────────────┐
│              SMART STRATEGY PLANNER INPUT                       │
│                                                                 │
│  User Data:                                                     │
│  ├─ legacyCredits: 40                                          │
│  ├─ legacyGpa: 85                                              │
│  ├─ completedCourses: [Course1, Course2] (6 credits, avg 89)  │
│  └─ futureCourses: [Course3, Course4, Course5] (10 credits)   │
│                                                                 │
│  User Input:                                                    │
│  ├─ targetGPA: 88                                              │
│  └─ maxRealisticGrade: 96                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   STEP 1: Calculate Current State               │
│                                                                 │
│  currentGPA = calculateDegreeGpa(semesters, 40, 85)            │
│             = (85×40 + 89×6) / 46                              │
│             = 85.52                                             │
│                                                                 │
│  totalCreditsSoFar = legacyCredits + actualCompletedCredits    │
│                    = 40 + 6                                     │
│                    = 46                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              STEP 2: Calculate Required Future Average          │
│                                                                 │
│  totalCredits = 46 + 10 = 56                                   │
│  requiredTotalPoints = 88 × 56 = 4,928                         │
│  currentPoints = 85.52 × 46 = 3,934                            │
│  neededFuturePoints = 4,928 - 3,934 = 994                     │
│  requiredFutureAvg = 994 / 10 = 99.4                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              STEP 3: Analyze Historical Performance             │
│                                                                 │
│  completedCourses = [Course1 (Easy, 92), Course2 (Med, 86)]   │
│                                                                 │
│  Historical Stats:                                              │
│  ├─ Easy: avg 92, count 1                                      │
│  ├─ Medium: avg 86, count 1                                    │
│  ├─ Hard: null (no history)                                    │
│  └─ Overall: avg 89                                             │
│                                                                 │
│  Personal Bias:                                                 │
│  ├─ Easy: 92 - 89 = +3                                         │
│  ├─ Medium: 86 - 89 = -3                                       │
│  └─ Hard: fallback to -2 (no history)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                STEP 4: Apply Adaptive Spread                    │
│                                                                 │
│  Future Courses:                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Course3 (Easy, 3 credits):                                │ │
│  │   Initial: 99.4 + 3 = 102.4 → Capped at 96              │ │
│  │                                                            │ │
│  │ Course4 (Medium, 4 credits):                              │ │
│  │   Initial: 99.4 - 3 = 96.4 → Capped at 96               │ │
│  │                                                            │ │
│  │ Course5 (Hard, 3 credits):                                │ │
│  │   Initial: 99.4 - 2 = 97.4 → Capped at 96               │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   STEP 5: Re-balance                            │
│                                                                 │
│  All courses hit the cap (96), so no adjustment needed         │
│                                                                 │
│  Final Recommendations:                                         │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Course3 (Easy):   96                                      │ │
│  │ Course4 (Medium): 96                                      │ │
│  │ Course5 (Hard):   96                                      │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Achieved GPA: (85.52×46 + 96×10) / 56 = 87.43                │
│                                                                 │
│  Message: "Target of 88 not achievable with max grade 96.     │
│            Try lowering target or increasing max grade."       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Integration Points

### 1. Profile → Database
- User enters legacy data in Profile UI
- Backend validates and saves to `users` table
- React Query cache updates automatically

### 2. Database → GPA Calculation
- `calculateDegreeGpa` receives legacy data
- Combines with actual courses using weighted average
- Returns combined GPA

### 3. GPA Calculation → UI Components
- Dashboard displays combined GPA
- GpaHeader shows combined GPA
- Institution stats use combined GPA

### 4. GPA Calculation → Smart Strategy
- Strategy receives combined GPA as `currentGPA`
- Strategy receives combined credits as `totalCreditsSoFar`
- Personal bias learning uses only actual courses
- Falls back to generic bias when no course history exists

---

## Benefits of This Architecture

1. **Separation of Concerns**
   - Legacy data stored separately from courses
   - Calculation logic centralized in one function
   - UI components remain simple

2. **Backward Compatibility**
   - Defaults to 0 (no legacy data)
   - Existing users unaffected
   - Gradual adoption possible

3. **Flexibility**
   - Can update legacy data anytime
   - Can add individual courses later
   - System adapts automatically

4. **Performance**
   - Memoized calculations
   - Efficient weighted average
   - No redundant queries

5. **Accuracy**
   - Proper weighted averaging
   - Respects credit weights
   - Mathematically correct

