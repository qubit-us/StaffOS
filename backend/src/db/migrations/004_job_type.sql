-- Migration 004: Add job_type column to jobs table
-- Values: contract, full_time, part_time, internship

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_type VARCHAR(20) DEFAULT 'contract';
