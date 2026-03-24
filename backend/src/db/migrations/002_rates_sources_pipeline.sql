-- Migration 002: Rate layers, candidate sources, internal pipeline, public job board
-- ============================================================

-- ============================================================
-- 1. EXTEND upload_source ENUM
-- ============================================================
ALTER TYPE upload_source ADD VALUE IF NOT EXISTS 'self_applied';

-- ============================================================
-- 2. JOBS — public listing flag
-- ============================================================
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- ============================================================
-- 3. SUBMISSIONS — rate layers
-- ============================================================

-- What agency pays out (to vendor or direct candidate).
-- Replaces the old generic sub_rate.
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS agency_pay_rate      DECIMAL(10,2);

-- What vendor pays their candidate (only when submission_source = 'vendor_submitted').
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS vendor_pay_rate      DECIMAL(10,2);

-- Migrate old sub_rate → agency_pay_rate if it has data
UPDATE submissions SET agency_pay_rate = sub_rate WHERE sub_rate IS NOT NULL AND agency_pay_rate IS NULL;

-- ============================================================
-- 4. SUBMISSIONS — source tracking
-- ============================================================
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS submission_source    VARCHAR(50) DEFAULT 'agency_direct';
-- Values: agency_direct | vendor_submitted | self_applied

-- Back-fill existing rows from candidate upload_source
UPDATE submissions s
SET submission_source = CASE
  WHEN c.upload_source = 'vendor'      THEN 'vendor_submitted'
  WHEN c.upload_source = 'self_applied' THEN 'self_applied'
  ELSE 'agency_direct'
END
FROM candidates c
WHERE c.id = s.candidate_id AND s.submission_source = 'agency_direct';

-- Which vendor submitted (when submission_source = 'vendor_submitted')
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS vendor_org_id        UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_submissions_source   ON submissions(submission_source);
CREATE INDEX IF NOT EXISTS idx_submissions_vendor   ON submissions(vendor_org_id);

-- ============================================================
-- 5. SUBMISSIONS — internal screening stage
-- ============================================================
-- Separate from the client-facing `stage` column.
-- Candidates must reach 'validated' before being shown to the client.
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS internal_stage       VARCHAR(50) DEFAULT 'new';
-- Values: new | screening | validated | on_hold | rejected_internal

-- Back-fill: anything already in a client-facing stage is considered validated
UPDATE submissions
SET internal_stage = 'validated'
WHERE stage NOT IN ('submitted') OR client_status != 'pending_review';

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS internal_stage_notes TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS internal_stage_updated_at  TIMESTAMPTZ;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS internal_stage_updated_by  UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_submissions_internal_stage ON submissions(internal_stage);

-- ============================================================
-- 6. SYSTEM ORGANIZATION — Public Applicants
-- ============================================================
INSERT INTO organizations (id, name, slug, org_type, settings)
VALUES (
  '00000000-0000-0000-0000-000000000099',
  'Public Applicants',
  'public-applicants',
  'vendor',
  '{"system": true, "description": "System org for self-applied candidates from the public job board"}'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. PERMISSIONS — public portal & internal screening
-- ============================================================
INSERT INTO permissions (code, description, category) VALUES
  ('SCREEN_CANDIDATE',   'Move candidates through internal screening stages', 'pipeline'),
  ('VALIDATE_CANDIDATE', 'Mark a candidate as validated and ready for client', 'pipeline'),
  ('SUBMIT_TO_CLIENT',   'Submit a validated candidate to the client',          'pipeline'),
  ('VIEW_RATES',         'View full rate details including margins',             'finance'),
  ('MANAGE_RATES',       'Set and edit rate fields on jobs and submissions',     'finance')
ON CONFLICT (code) DO NOTHING;
