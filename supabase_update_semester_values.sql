-- ==========================================================
-- Update semester column for existing global_courses data
-- Run this AFTER you've added the semester column
-- ==========================================================

-- First, verify the column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'global_courses' AND column_name = 'semester';

-- ==========================================================
-- SCE - הנדסת תעשייה וניהול - Year 1, Semester A
-- ==========================================================
UPDATE global_courses 
SET semester = 'A'
WHERE university_name = 'SCE'
  AND degree_name = 'הנדסת תעשייה וניהול'
  AND academic_year = 1
  AND course_name IN (
    'חדוו״א 1',
    'פיזיקה 1',
    'אנגלית טכנית 1',
    'מבוא למחשב',
    'שיטות סטטיסטיות'
  );

-- ==========================================================
-- SCE - הנדסת תעשייה וניהול - Year 1, Semester B
-- ==========================================================
UPDATE global_courses 
SET semester = 'B'
WHERE university_name = 'SCE'
  AND degree_name = 'הנדסת תעשייה וניהול'
  AND academic_year = 1
  AND course_name IN (
    'חדוו״א 2',
    'פיזיקה 2',
    'מבוא לכלכלה',
    'מיקרו כלכלה'
  );

-- ==========================================================
-- SCE - Year 2 courses (add as needed)
-- ==========================================================
-- UPDATE global_courses 
-- SET semester = 'A'
-- WHERE university_name = 'SCE'
--   AND academic_year = 2
--   AND course_name IN (...);

-- ==========================================================
-- Verification: Check how many courses have semester set
-- ==========================================================
SELECT 
    university_name,
    academic_year,
    semester,
    COUNT(*) as course_count
FROM global_courses
WHERE university_name = 'SCE'
GROUP BY university_name, academic_year, semester
ORDER BY academic_year, semester;

-- ==========================================================
-- Check courses that still have NULL semester
-- ==========================================================
SELECT 
    university_name,
    degree_name,
    academic_year,
    course_name,
    semester
FROM global_courses
WHERE university_name = 'SCE'
  AND semester IS NULL
ORDER BY academic_year, course_name;

-- ==========================================================
-- Test query (same as API will run)
-- ==========================================================
SELECT 
    id,
    course_name,
    credits,
    grade_breakdown_json,
    difficulty,
    degree_name,
    academic_year,
    semester
FROM global_courses
WHERE university_name = 'SCE'
  AND (
    ('הנדסת תעשייה וניהול' IS NOT NULL AND degree_name = 'הנדסת תעשייה וניהול') OR
    degree_name IS NULL
  )
  AND (academic_year = 1 OR academic_year IS NULL)
  AND (semester = 'A' OR semester IS NULL)
ORDER BY
  CASE WHEN degree_name = 'הנדסת תעשייה וניהול' THEN 1 ELSE 2 END,
  CASE WHEN degree_name IS NULL THEN 2 ELSE 3 END,
  course_name ASC;

-- Expected: Should return all Year 1, Semester A courses for SCE/הנדסת תעשייה וניהול
-- Plus any courses where semester IS NULL (will be shown as recommendations)
