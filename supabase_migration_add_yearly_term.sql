-- Migration: Add 'Yearly' term option
-- Purpose: Allow users to create completed year semesters without splitting into A/B
-- Date: 2025

-- Add 'Yearly' to the term enum
ALTER TYPE term ADD VALUE 'Yearly';

-- Note: PostgreSQL enum values cannot be removed once added
-- This is a safe, non-breaking addition


