-- Migration: Hybrid Semesters (Per-Semester Legacy Data)
-- Purpose: Allow users to create "completed year" semesters with bulk data that can be augmented with individual courses
-- Date: 2025

-- Add legacy data columns to semesters table
ALTER TABLE semesters ADD COLUMN legacy_credits REAL DEFAULT 0 NOT NULL;
ALTER TABLE semesters ADD COLUMN legacy_gpa REAL DEFAULT 0 NOT NULL;
ALTER TABLE semesters ADD COLUMN is_legacy_visible BOOLEAN DEFAULT false NOT NULL;

-- Add constraints
ALTER TABLE semesters ADD CONSTRAINT semester_legacy_gpa_range CHECK (legacy_gpa >= 0 AND legacy_gpa <= 100);
ALTER TABLE semesters ADD CONSTRAINT semester_legacy_credits_positive CHECK (legacy_credits >= 0);

-- Add comments for documentation
COMMENT ON COLUMN semesters.legacy_credits IS 'Bulk credits for "completed year" semesters (can be combined with individual courses)';
COMMENT ON COLUMN semesters.legacy_gpa IS 'Bulk average for legacy credits (0-100 scale)';
COMMENT ON COLUMN semesters.is_legacy_visible IS 'Flag to indicate this is a hybrid semester with bulk data';

-- Note: We're keeping users.legacy_credits and users.legacy_gpa for backward compatibility
-- but new functionality will use per-semester legacy data

