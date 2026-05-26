-- Add hybrid_work flag to jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS hybrid_work BOOLEAN NOT NULL DEFAULT false;
