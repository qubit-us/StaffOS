-- Migration 001: Client Portal
-- Adds client relationship management, client-specific fields on jobs/submissions,
-- and client portal permissions & roles.

-- ============================================================
-- 1. CLIENT RELATIONSHIPS
-- Tracks which clients are onboarded to which staffing agency
-- ============================================================

CREATE TABLE IF NOT EXISTS client_relationships (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status            VARCHAR(50) DEFAULT 'active',
  onboarded_by      UUID REFERENCES users(id),
  contract_start    DATE,
  contract_end      DATE,
  terms             JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_org_id, client_org_id)
);

CREATE INDEX IF NOT EXISTS idx_client_rel_agency ON client_relationships(agency_org_id);
CREATE INDEX IF NOT EXISTS idx_client_rel_client ON client_relationships(client_org_id);

-- ============================================================
-- 2. JOBS TABLE — new client-facing fields
-- ============================================================

-- Explicit billing rate the client pays the agency
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS client_bill_rate    DECIMAL(10,2);

-- Number of open positions the client needs filled
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS positions_count     INTEGER DEFAULT 1;

-- When the client needs the candidate to start
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS start_date          DATE;

-- Client Point of Contact (CPOC) — name of the person at the client side
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS client_poc          VARCHAR(255);

-- New requirement vs carry-forward from a previous period
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_carry_forward    BOOLEAN DEFAULT false;

-- ============================================================
-- 3. SUBMISSIONS TABLE — client review fields
-- ============================================================

-- Rate at which the candidate is submitted (what agency pays vendor/candidate)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS sub_rate              DECIMAL(10,2);

-- Client's review decision on this submission (separate from internal pipeline stage)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS client_status         VARCHAR(50) DEFAULT 'pending_review';
-- Values: pending_review | under_review | approved | rejected | interview_requested

-- Free-text feedback from the client on this candidate
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS client_feedback       TEXT;

-- Who at the client org reviewed this submission and when
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS client_reviewed_by    UUID REFERENCES users(id);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS client_reviewed_at    TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_submissions_client_status ON submissions(client_status);

-- ============================================================
-- 4. PERMISSIONS — client portal & client management
-- ============================================================

INSERT INTO permissions (code, description, category) VALUES
  ('MANAGE_CLIENTS',      'Onboard and manage clients',                   'admin'),
  ('VIEW_CLIENT_PORTAL',  'Access the client-facing portal',              'client'),
  ('CREATE_REQUIREMENT',  'Create job requirements as a client',          'client'),
  ('EDIT_REQUIREMENT',    'Edit own job requirements',                    'client'),
  ('REVIEW_CANDIDATE',    'Review candidates submitted by the agency',    'client'),
  ('APPROVE_CANDIDATE',   'Approve or reject submitted candidates',       'client'),
  ('VIEW_SUBMISSIONS',    'View candidate submissions for own jobs',      'client'),
  ('REQUEST_INTERVIEW',   'Request an interview for a candidate',         'client')
ON CONFLICT (code) DO NOTHING;
