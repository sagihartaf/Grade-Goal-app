-- ============================================
-- Row Level Security (RLS) Policies for GradeGoal
-- ============================================
-- This script enables RLS and creates policies for all tables
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_components ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Users can insert their own profile (for initial profile creation)
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Users cannot delete their own profile (optional - remove if you want to allow deletion)
-- CREATE POLICY "Users can delete own profile"
--   ON users FOR DELETE
--   USING (id = auth.uid());

-- ============================================
-- SEMESTERS TABLE POLICIES
-- ============================================
-- Users can view their own semesters
CREATE POLICY "Users can view own semesters"
  ON semesters FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert semesters for themselves
CREATE POLICY "Users can insert own semesters"
  ON semesters FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own semesters
CREATE POLICY "Users can update own semesters"
  ON semesters FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own semesters
CREATE POLICY "Users can delete own semesters"
  ON semesters FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- COURSES TABLE POLICIES
-- ============================================
-- Users can view courses in their own semesters
CREATE POLICY "Users can view own courses"
  ON courses FOR SELECT
  USING (
    semester_id IN (
      SELECT id FROM semesters WHERE user_id = auth.uid()
    )
  );

-- Users can insert courses into their own semesters
CREATE POLICY "Users can insert own courses"
  ON courses FOR INSERT
  WITH CHECK (
    semester_id IN (
      SELECT id FROM semesters WHERE user_id = auth.uid()
    )
  );

-- Users can update courses in their own semesters
CREATE POLICY "Users can update own courses"
  ON courses FOR UPDATE
  USING (
    semester_id IN (
      SELECT id FROM semesters WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    semester_id IN (
      SELECT id FROM semesters WHERE user_id = auth.uid()
    )
  );

-- Users can delete courses from their own semesters
CREATE POLICY "Users can delete own courses"
  ON courses FOR DELETE
  USING (
    semester_id IN (
      SELECT id FROM semesters WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- GRADE_COMPONENTS TABLE POLICIES
-- ============================================
-- Users can view grade components in their own courses
CREATE POLICY "Users can view own grade components"
  ON grade_components FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM courses
      WHERE semester_id IN (
        SELECT id FROM semesters WHERE user_id = auth.uid()
      )
    )
  );

-- Users can insert grade components into their own courses
CREATE POLICY "Users can insert own grade components"
  ON grade_components FOR INSERT
  WITH CHECK (
    course_id IN (
      SELECT id FROM courses
      WHERE semester_id IN (
        SELECT id FROM semesters WHERE user_id = auth.uid()
      )
    )
  );

-- Users can update grade components in their own courses
CREATE POLICY "Users can update own grade components"
  ON grade_components FOR UPDATE
  USING (
    course_id IN (
      SELECT id FROM courses
      WHERE semester_id IN (
        SELECT id FROM semesters WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    course_id IN (
      SELECT id FROM courses
      WHERE semester_id IN (
        SELECT id FROM semesters WHERE user_id = auth.uid()
      )
    )
  );

-- Users can delete grade components from their own courses
CREATE POLICY "Users can delete own grade components"
  ON grade_components FOR DELETE
  USING (
    course_id IN (
      SELECT id FROM courses
      WHERE semester_id IN (
        SELECT id FROM semesters WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================
-- VERIFICATION QUERIES (Optional - run these to test)
-- ============================================
-- Check if RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('users', 'semesters', 'courses', 'grade_components');

-- Check existing policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;



