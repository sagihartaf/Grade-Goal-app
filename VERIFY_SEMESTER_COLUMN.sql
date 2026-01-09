-- ==========================================================
-- Verification Query for global_courses semester column
-- ==========================================================
-- Run this in Supabase SQL Editor to verify the column exists and has correct constraints

-- Check if semester column exists and its data type
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'global_courses' 
  AND column_name = 'semester';

-- Expected Result:
-- column_name: semester
-- data_type: character varying (or varchar)
-- character_maximum_length: 1
-- is_nullable: YES
-- column_default: NULL

-- ==========================================================
-- Check the CHECK constraint on semester column
-- ==========================================================
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'global_courses'
  AND con.contype = 'c'  -- 'c' = CHECK constraint
  AND pg_get_constraintdef(con.oid) LIKE '%semester%';

-- Expected Result:
-- Should show: CHECK ((semester)::text = ANY (ARRAY[('A'::character varying)::text, ('B'::character varying)::text, ('S'::character varying)::text]))
-- OR similar constraint with semester IN ('A', 'B', 'S')

-- ==========================================================
-- Sample query to test the data
-- ==========================================================
SELECT 
    university_name,
    degree_name,
    course_name,
    academic_year,
    semester,
    credits
FROM global_courses
WHERE university_name = 'SCE'
  AND academic_year = 1
  AND semester = 'A'
LIMIT 5;

-- This should return SCE courses for Year 1, Semester A
-- If it returns 0 rows, the data hasn't been populated yet with semester values

-- ==========================================================
-- Check all distinct semester values in the table
-- ==========================================================
SELECT 
    semester,
    COUNT(*) as course_count
FROM global_courses
GROUP BY semester
ORDER BY semester;

-- Expected: You should see 'A', 'B', 'S', and NULL
-- If you see other values or get an error, the column needs to be fixed

-- ==========================================================
-- OPTIONAL: If you need to update the semester column for existing data
-- ==========================================================
-- This is a sample UPDATE - modify as needed based on your data

-- Example: Update all Year 1, Semester A courses for SCE
-- UPDATE global_courses 
-- SET semester = 'A'
-- WHERE university_name = 'SCE' 
--   AND academic_year = 1
--   AND degree_name = 'הנדסת תעשייה וניהול'
--   AND course_name IN ('חדוו״א 1', 'פיזיקה 1', ...);

-- Example: Update Year 1, Semester B courses
-- UPDATE global_courses 
-- SET semester = 'B'
-- WHERE university_name = 'SCE' 
--   AND academic_year = 1
--   AND course_name IN (...);
