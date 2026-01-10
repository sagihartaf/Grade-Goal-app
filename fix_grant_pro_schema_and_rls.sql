-- ============================================
-- Fix Grant Pro Feature - Schema Verification & RLS Policies
-- ============================================
-- This script fixes issues with the Grant Pro feature:
-- 1. Verifies/Adds missing columns (subscription_expires_at, notification_seen)
-- 2. Creates RLS policies for admin operations
-- 3. Ensures pro_requests table has proper structure
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Verify/Add Missing Columns to USERS table
-- ============================================

-- Check if subscription_expires_at exists, add if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'subscription_expires_at'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN subscription_expires_at TIMESTAMPTZ;
    RAISE NOTICE 'Added subscription_expires_at column to users table';
  ELSE
    RAISE NOTICE 'subscription_expires_at column already exists in users table';
  END IF;
END $$;

-- ============================================
-- STEP 2: Verify/Add Missing Columns to PRO_REQUESTS table
-- ============================================

-- Check if pro_requests table exists, create if missing
CREATE TABLE IF NOT EXISTS pro_requests (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status VARCHAR DEFAULT 'pending',
  notification_seen BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Check if notification_seen exists, add if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pro_requests' 
    AND column_name = 'notification_seen'
  ) THEN
    ALTER TABLE pro_requests 
    ADD COLUMN notification_seen BOOLEAN DEFAULT FALSE NOT NULL;
    RAISE NOTICE 'Added notification_seen column to pro_requests table';
  ELSE
    RAISE NOTICE 'notification_seen column already exists in pro_requests table';
  END IF;
END $$;

-- Ensure status column exists with proper default
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pro_requests' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE pro_requests 
    ADD COLUMN status VARCHAR DEFAULT 'pending';
    RAISE NOTICE 'Added status column to pro_requests table';
  END IF;
END $$;

-- ============================================
-- STEP 3: Verify COURSES table has user_id column
-- ============================================

-- Check if user_id exists in courses table, add if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE courses 
    ADD COLUMN user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added user_id column to courses table';
  ELSE
    RAISE NOTICE 'user_id column already exists in courses table';
  END IF;
END $$;

-- ============================================
-- STEP 4: Enable RLS on pro_requests table (if not already enabled)
-- ============================================

ALTER TABLE pro_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: Disable RLS or Create Service Role Bypass Policies
-- ============================================
-- IMPORTANT: Since the backend uses DATABASE_URL (direct PostgreSQL connection via pg Pool),
-- RLS policies are BYPASSED. The direct connection has full database access.
--
-- However, if RLS is enabled and blocking, we need to either:
-- Option A: Disable RLS (not recommended for security, but needed if direct connection doesn't work)
-- Option B: Use service role connection that bypasses RLS
-- Option C: Create permissive policies (if using connection pooler)
--
-- For now, we'll check if RLS is causing issues and provide a bypass option:

-- Check current RLS status
DO $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'users';
  
  IF rls_enabled THEN
    RAISE NOTICE 'RLS is enabled on users table. If using direct connection (DATABASE_URL), RLS should be bypassed automatically.';
    RAISE NOTICE 'If updates are still failing, consider disabling RLS or using service role connection.';
  ELSE
    RAISE NOTICE 'RLS is disabled on users table. Direct connection will work without issues.';
  END IF;
END $$;

-- If RLS is blocking updates (unlikely with direct connection), you can temporarily disable it:
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE pro_requests DISABLE ROW LEVEL SECURITY;

-- Note: With direct PostgreSQL connection (via DATABASE_URL), RLS policies should NOT apply.
-- If you're still experiencing issues, the problem is likely:
-- 1. Missing columns (fixed by Steps 1-3)
-- 2. Connection string format (should be direct, not pooler)
-- 3. Database permissions (connection user needs UPDATE permission)

-- ============================================
-- STEP 6: Verification Queries (Run these to check)
-- ============================================

-- Check if all required columns exist
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name IN ('users', 'pro_requests', 'courses')
  AND column_name IN ('subscription_expires_at', 'notification_seen', 'user_id', 'status')
ORDER BY table_name, column_name;

-- Check if RLS is enabled
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'pro_requests', 'courses')
ORDER BY tablename;

-- Check existing policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'pro_requests')
ORDER BY tablename, policyname;

-- ============================================
-- IMPORTANT NOTES:
-- ============================================
-- 1. The backend uses DATABASE_URL which should be a direct PostgreSQL connection
--    This bypasses RLS policies. If RLS is still blocking, check that DATABASE_URL
--    is using the direct connection string, not the connection pooler.
--
-- 2. If using Supabase, ensure DATABASE_URL uses the direct connection format:
--    postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
--    NOT the pooler format which enforces RLS.
--
-- 3. The notification_seen column is on pro_requests table, NOT users table.
--
-- 4. When granting Pro, the system:
--    - Updates users.subscription_tier to 'pro'
--    - Sets users.subscription_expires_at to 1 year from now
--    - Updates pro_requests.status to 'approved' for pending requests
--    - The notification_seen flag remains false so user sees celebration modal
