-- Add priority field to candidates
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT NULL
    CHECK (priority IN ('low', 'medium', 'high'));
