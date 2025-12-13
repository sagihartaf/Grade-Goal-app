-- Migration: Add legacy academic data to users table
-- Purpose: Allow users to input past academic history in bulk without entering individual courses
-- Date: 2025

-- Add legacy_credits column (total credits earned before using the system)
ALTER TABLE users ADD COLUMN legacy_credits REAL DEFAULT 0 NOT NULL;

-- Add legacy_gpa column (weighted average of those legacy credits)
ALTER TABLE users ADD COLUMN legacy_gpa REAL DEFAULT 0 NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.legacy_credits IS 'Total credits earned before using the system (bulk entry)';
COMMENT ON COLUMN users.legacy_gpa IS 'Weighted average GPA of legacy credits (0-100 scale)';

-- Add constraint: legacy_gpa must be between 0 and 100
ALTER TABLE users ADD CONSTRAINT legacy_gpa_range CHECK (legacy_gpa >= 0 AND legacy_gpa <= 100);

-- Add constraint: legacy_credits must be non-negative
ALTER TABLE users ADD CONSTRAINT legacy_credits_positive CHECK (legacy_credits >= 0);
