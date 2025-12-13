-- Migration: Add degree_name to users table
-- Purpose: Allow users to specify their degree program (e.g., "הנדסת תעשייה וניהול")
-- Date: 2025

-- Add degree_name column to users table
ALTER TABLE users ADD COLUMN degree_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.degree_name IS 'User''s degree program name (e.g., Computer Science, Industrial Engineering)';

