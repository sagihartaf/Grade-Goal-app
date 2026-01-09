-- Migration: Global Course Catalog
-- Purpose: Create a searchable catalog of courses with pre-populated data (credits, grade breakdown) for universities and degrees
-- Date: 2025

-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create global_courses table
CREATE TABLE global_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_name TEXT NOT NULL,
  degree_name TEXT NULL, -- NULL = shared across all degrees (e.g., "Calculus 1" for all engineering degrees)
  course_name TEXT NOT NULL,
  credits REAL NOT NULL,
  grade_breakdown_json JSONB NOT NULL, -- Array of {name, weight, isMagen} objects
  difficulty VARCHAR(10) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  academic_year INTEGER NULL, -- Optional: track which academic year this applies to
  last_verified_at TIMESTAMP NULL, -- Track data freshness for maintenance
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Prevent duplicate entries per university/degree/course combination
  UNIQUE(university_name, degree_name, course_name),
  
  -- Constraints
  CONSTRAINT global_courses_credits_range CHECK (credits >= 0.1 AND credits <= 20),
  CONSTRAINT global_courses_grade_breakdown_valid CHECK (
    jsonb_typeof(grade_breakdown_json) = 'array' AND
    jsonb_array_length(grade_breakdown_json) > 0
  )
);

-- Create indexes for performance

-- Full-text search index using pg_trgm for fuzzy matching
CREATE INDEX idx_global_courses_search ON global_courses 
  USING gin (course_name gin_trgm_ops);

-- University + degree lookup (for degree-specific courses)
CREATE INDEX idx_global_courses_university_degree ON global_courses 
  (university_name, degree_name);

-- University-only lookup (for shared courses where degree_name IS NULL)
CREATE INDEX idx_global_courses_university_shared ON global_courses 
  (university_name) WHERE degree_name IS NULL;

-- Composite index for common query pattern (university + search)
CREATE INDEX idx_global_courses_university_name_search ON global_courses 
  (university_name, course_name);

-- Add comments for documentation
COMMENT ON TABLE global_courses IS 'Global catalog of courses with pre-populated data for universities and degrees';
COMMENT ON COLUMN global_courses.university_name IS 'Name of the academic institution';
COMMENT ON COLUMN global_courses.degree_name IS 'Specific degree program (NULL = shared across all degrees)';
COMMENT ON COLUMN global_courses.course_name IS 'Name of the course';
COMMENT ON COLUMN global_courses.credits IS 'Credit hours (Nakaz) for the course';
COMMENT ON COLUMN global_courses.grade_breakdown_json IS 'JSON array of grade components: [{name: string, weight: number, isMagen: boolean}]';
COMMENT ON COLUMN global_courses.difficulty IS 'Course difficulty level for Smart Strategy algorithm';
COMMENT ON COLUMN global_courses.academic_year IS 'Optional academic year this course data applies to';
COMMENT ON COLUMN global_courses.last_verified_at IS 'Timestamp when this course data was last verified/updated';
