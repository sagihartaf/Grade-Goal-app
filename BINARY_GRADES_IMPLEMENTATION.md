# Binary Grades (Pass/Fail) Feature Implementation

## Overview
Implemented support for Pass/Fail courses that count towards degree credits but are EXCLUDED from weighted GPA calculations.

## Database Changes
✅ **Manual Update:** Added `is_binary` column to `courses` table (boolean, default false)

## Implementation Summary

### 1. Schema Updates (`api/shared/schema.ts`)
- Added `isBinary: boolean("is_binary").default(false).notNull()` to courses table definition
- The TypeScript `Course` type now automatically includes this field

### 2. GPA Calculation Logic (`client/src/lib/gpaCalculations.ts`)
Updated all GPA calculation functions to exclude binary courses:
- `calculateSemesterGpa()` - Filters out `course.isBinary === true`
- `calculateHybridSemesterGpa()` - Filters out binary courses  
- `calculateDegreeGpa()` - Filters out binary courses
- `calculateYearGpa()` - Binary courses filtered via `calculateSemesterGpa()`

**Business Logic:**
- Binary courses: EXCLUDED from weighted GPA (numerator and denominator)
- Credits: Counted towards degree total if student passed
- Pass = `grade: 100`, Fail = `grade: 0`

### 3. UI Components

#### CreateCourseDialog (`client/src/components/CreateCourseDialog.tsx`)
**New Features:**
- Added Tabs component for grade type selection:
  - **"ציון מספרי" (Numeric)** - Shows traditional slider/input (0-100)
  - **"עובר/נכשל" (Pass/Fail)** - Shows simple Switch control
- Added state management for `isBinary` and `passed` fields
- **Visual Feedback:** Blue info box with message: "קורס זה יספור את הנקודות לתואר אך לא ישפיע על הממוצע שלך"
- **Data Binding:**
  - Pass → `grade: 100`, `is_binary: true`
  - Fail → `grade: 0`, `is_binary: true`
- Form validation skips component weight check for binary courses

#### CourseRow (`client/src/components/CourseRow.tsx`)
**Display Changes:**
- Binary courses show Badge instead of numeric grade:
  - **Pass:** Green badge with text "עובר"
  - **Fail:** Red badge with text "נכשל"
- **Collapsible behavior:**
  - Chevron icon hidden for binary courses (non-clickable)
  - CollapsibleContent (grade sliders) completely hidden for binary courses
  - Row is not expandable for binary courses
- Target grade button and progress bar hidden for binary courses
- Magen indicator not shown for binary courses

### 4. API Updates

#### Routes (`api/routes.ts`)
- `POST /api/courses` - Added `isBinary` to request schema (optional, default false)
- `PUT /api/courses/:id` - Added `isBinary` to update schema (optional)
- Both routes pass `isBinary` to storage layer

#### Storage (`api/storage.ts`)
- `createCourse()` - Accepts `isBinary` in course data
- `updateCourse()` - Updated signature to include `isBinary?: boolean`
- `getInstitutionStats()` - Excludes binary courses from GPA calculations

### 5. Frontend Data Flow (`client/src/pages/Dashboard.tsx`)
- Updated `createCourseMutation` type signature to include `isBinary?: boolean`
- Updated `updateCourseMutation` type signature to include `isBinary?: boolean`
- Mutations automatically pass `isBinary` from CreateCourseDialog to API

## RTL (Hebrew) Support
All UI text is in Hebrew:
- "ציון מספרי" (Numeric Grade)
- "עובר/נכשל" (Pass/Fail)
- "עובר" (Pass badge)
- "נכשל" (Fail badge)
- "קורס זה אינו נחשב בחישוב הממוצע" (This course does not count in GPA calculation)

## Testing Checklist
- [ ] Create new Pass/Fail course
- [ ] Verify Pass badge displays correctly (grade 100)
- [ ] Verify Fail badge displays correctly (grade 0)
- [ ] Verify binary course excluded from semester GPA
- [ ] Verify binary course excluded from degree GPA
- [ ] Edit existing course to/from binary mode
- [ ] Verify credits still count towards degree total
- [ ] Verify target grade hidden for binary courses
- [ ] Test Hebrew RTL display

## Migration Notes
**For existing users:**
- All existing courses have `is_binary = false` by default
- No data migration required
- Feature is opt-in when creating/editing courses

## Files Modified
1. `api/shared/schema.ts` - Schema definition
2. `client/src/lib/gpaCalculations.ts` - GPA logic
3. `client/src/components/CreateCourseDialog.tsx` - Course creation UI
4. `client/src/components/CourseRow.tsx` - Course display
5. `api/routes.ts` - API endpoints
6. `api/storage.ts` - Database operations
7. `client/src/pages/Dashboard.tsx` - Mutation types

## Bug Fixes

### Dashboard Display Bug (Fixed)
**Issue:** Binary courses were displaying with sliders and affecting GPA calculations.

**Root Cause:** 
- The CollapsibleContent (slider section) was always rendered, even for binary courses
- The chevron was always clickable, allowing expansion of non-existent grade components
- Target grade button was visible for binary courses

**Fix Applied:**
1. Wrapped CollapsibleContent in conditional: `{!course.isBinary && (<CollapsibleContent>...)}`
2. Made CollapsibleTrigger disabled for binary courses: `disabled={course.isBinary}`
3. Conditionally render chevron icon only for non-binary courses
4. Hide target grade button for binary courses: `{!course.isBinary && (<Popover>...)}`
5. Added spacing div when chevron is hidden to maintain layout alignment

**Result:** Binary courses now display correctly with:
- ✅ Badge showing "עובר" or "נכשל"
- ✅ No slider/expandable content
- ✅ No target grade functionality
- ✅ Non-interactive row (cannot expand)

## Status
✅ **COMPLETE** - All features implemented and bug fixes applied
