-- StaffOS Database Schema
-- AI-Powered Recruiting Marketplace Platform

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE org_type AS ENUM ('staffing_agency', 'vendor', 'client', 'end_client');
CREATE TYPE job_status AS ENUM ('draft', 'open', 'matching', 'submitted', 'interviewing', 'filled', 'closed');
CREATE TYPE pipeline_stage AS ENUM ('submitted', 'client_review', 'shortlisted', 'interview_r1', 'interview_r2', 'offer', 'placed', 'rejected', 'withdrawn');
CREATE TYPE supply_level AS ENUM ('high', 'moderate', 'low');
CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'webhook');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'read');
CREATE TYPE upload_source AS ENUM ('direct', 'vendor', 'recruiter', 'linkedin');
CREATE TYPE visa_status AS ENUM ('citizen', 'green_card', 'h1b', 'h4_ead', 'opt', 'stem_opt', 'l1', 'tn', 'other', 'unknown');

-- ============================================================
-- ORGANIZATIONS (Multi-tenant core)
-- ============================================================

CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(100) UNIQUE NOT NULL,
  org_type      org_type NOT NULL,
  parent_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  domain        VARCHAR(255),
  logo_url      TEXT,
  website       TEXT,
  settings      JSONB DEFAULT '{}',
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_type ON organizations(org_type);
CREATE INDEX idx_organizations_parent ON organizations(parent_org_id);

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   TEXT,
  first_name      VARCHAR(100),
  last_name       VARCHAR(100),
  avatar_url      TEXT,
  is_active       BOOLEAN DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  email_verified  BOOLEAN DEFAULT false,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================
-- RBAC: Roles, Permissions, User Roles
-- ============================================================

CREATE TABLE permissions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  category    VARCHAR(100),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  is_default  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, name)
);

CREATE INDEX idx_roles_org ON roles(org_id);

CREATE TABLE role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id    UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

-- ============================================================
-- CANDIDATES
-- ============================================================

CREATE TABLE candidates (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                  UUID NOT NULL REFERENCES organizations(id),
  submitted_by_user_id    UUID REFERENCES users(id),
  vendor_org_id           UUID REFERENCES organizations(id),
  upload_source           upload_source DEFAULT 'direct',

  -- Identity (hidden from clients until unlocked)
  first_name              VARCHAR(100),
  last_name               VARCHAR(100),
  email                   VARCHAR(255),
  phone                   VARCHAR(50),
  linkedin_url            TEXT,

  -- Professional profile
  title                   VARCHAR(255),
  summary                 TEXT,
  skills                  TEXT[] DEFAULT '{}',
  years_of_experience     DECIMAL(4,1),
  companies_worked        JSONB DEFAULT '[]',
  certifications          JSONB DEFAULT '[]',
  education               JSONB DEFAULT '[]',
  industry_experience     TEXT[] DEFAULT '{}',
  languages               JSONB DEFAULT '[]',

  -- Work authorization
  visa_status             visa_status DEFAULT 'unknown',
  work_authorization      TEXT,
  international_experience BOOLEAN DEFAULT false,

  -- Location & availability
  location_city           VARCHAR(100),
  location_state          VARCHAR(100),
  location_country        VARCHAR(100) DEFAULT 'US',
  relocation_preference   VARCHAR(50),
  remote_preference       VARCHAR(50),
  availability_date       DATE,
  availability_type       VARCHAR(50),

  -- Compensation
  expected_rate_min       DECIMAL(10,2),
  expected_rate_max       DECIMAL(10,2),
  rate_type               VARCHAR(20) DEFAULT 'hourly',

  -- AI-enriched fields
  inferred_industries     TEXT[] DEFAULT '{}',
  ai_summary              TEXT,
  profile_completeness    INTEGER DEFAULT 0,

  -- Embeddings for semantic search
  profile_embedding       vector(1536),

  -- Status
  is_active               BOOLEAN DEFAULT true,
  is_anonymized           BOOLEAN DEFAULT false,
  duplicate_of            UUID REFERENCES candidates(id),
  duplicate_score         DECIMAL(5,4),

  -- Raw data
  raw_resume_text         TEXT,
  parsed_data             JSONB DEFAULT '{}',

  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_candidates_org ON candidates(org_id);
CREATE INDEX idx_candidates_vendor ON candidates(vendor_org_id);
CREATE INDEX idx_candidates_email ON candidates(email);
CREATE INDEX idx_candidates_skills ON candidates USING GIN(skills);
CREATE INDEX idx_candidates_industries ON candidates USING GIN(industry_experience);
CREATE INDEX idx_candidates_embedding ON candidates USING ivfflat(profile_embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- RESUME FILES
-- ============================================================

CREATE TABLE resume_files (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id    UUID REFERENCES candidates(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES organizations(id),
  uploaded_by     UUID REFERENCES users(id),
  file_name       VARCHAR(255) NOT NULL,
  file_path       TEXT NOT NULL,
  file_size       INTEGER,
  mime_type       VARCHAR(100),
  parsed          BOOLEAN DEFAULT false,
  parse_status    VARCHAR(50) DEFAULT 'pending',
  parse_error     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_resume_files_candidate ON resume_files(candidate_id);

-- ============================================================
-- JOBS
-- ============================================================

CREATE TABLE jobs (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                UUID NOT NULL REFERENCES organizations(id),
  created_by            UUID REFERENCES users(id),
  client_org_id         UUID REFERENCES organizations(id),
  end_client_org_id     UUID REFERENCES organizations(id),

  title                 VARCHAR(255) NOT NULL,
  description           TEXT,
  required_skills       TEXT[] DEFAULT '{}',
  nice_to_have_skills   TEXT[] DEFAULT '{}',
  experience_min        DECIMAL(4,1),
  experience_max        DECIMAL(4,1),

  location_city         VARCHAR(100),
  location_state        VARCHAR(100),
  location_country      VARCHAR(100) DEFAULT 'US',
  remote_allowed        BOOLEAN DEFAULT false,

  visa_requirements     TEXT[] DEFAULT '{}',
  work_authorization    TEXT,

  pay_rate_min          DECIMAL(10,2),
  pay_rate_max          DECIMAL(10,2),
  rate_type             VARCHAR(20) DEFAULT 'hourly',

  industry              TEXT[] DEFAULT '{}',
  status                job_status DEFAULT 'draft',

  -- AI supply prediction
  supply_level          supply_level,
  supply_analysis       JSONB DEFAULT '{}',

  -- Embeddings
  job_embedding         vector(1536),

  metadata              JSONB DEFAULT '{}',
  deadline              DATE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_org ON jobs(org_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_skills ON jobs USING GIN(required_skills);
CREATE INDEX idx_jobs_embedding ON jobs USING ivfflat(job_embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- AI MATCHES
-- ============================================================

CREATE TABLE ai_matches (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id                UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id          UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  org_id                UUID NOT NULL REFERENCES organizations(id),

  -- Score components
  overall_score         DECIMAL(5,4) NOT NULL,
  skills_score          DECIMAL(5,4),
  experience_score      DECIMAL(5,4),
  industry_score        DECIMAL(5,4),
  location_score        DECIMAL(5,4),
  visa_score            DECIMAL(5,4),
  rate_score            DECIMAL(5,4),
  language_score        DECIMAL(5,4),
  semantic_score        DECIMAL(5,4),

  -- Match details
  matched_skills        TEXT[] DEFAULT '{}',
  missing_skills        TEXT[] DEFAULT '{}',
  match_reasons         JSONB DEFAULT '[]',
  ai_explanation        TEXT,

  is_reviewed           BOOLEAN DEFAULT false,
  reviewed_by           UUID REFERENCES users(id),
  reviewed_at           TIMESTAMPTZ,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, candidate_id)
);

CREATE INDEX idx_matches_job ON ai_matches(job_id);
CREATE INDEX idx_matches_candidate ON ai_matches(candidate_id);
CREATE INDEX idx_matches_score ON ai_matches(overall_score DESC);

-- ============================================================
-- SUBMISSIONS / INTERVIEW PIPELINE
-- ============================================================

CREATE TABLE submissions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id            UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id      UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  org_id            UUID NOT NULL REFERENCES organizations(id),
  submitted_by      UUID REFERENCES users(id),
  match_id          UUID REFERENCES ai_matches(id),

  stage             pipeline_stage DEFAULT 'submitted',
  stage_notes       TEXT,
  is_anonymized     BOOLEAN DEFAULT true,
  profile_unlocked  BOOLEAN DEFAULT false,
  unlocked_by       UUID REFERENCES users(id),
  unlocked_at       TIMESTAMPTZ,

  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, candidate_id)
);

CREATE INDEX idx_submissions_job ON submissions(job_id);
CREATE INDEX idx_submissions_candidate ON submissions(candidate_id);
CREATE INDEX idx_submissions_stage ON submissions(stage);

CREATE TABLE pipeline_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id   UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  from_stage      pipeline_stage,
  to_stage        pipeline_stage NOT NULL,
  changed_by      UUID REFERENCES users(id),
  notes           TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pipeline_history_submission ON pipeline_history(submission_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  user_id         UUID REFERENCES users(id),
  type            VARCHAR(100) NOT NULL,
  title           VARCHAR(255) NOT NULL,
  body            TEXT,
  data            JSONB DEFAULT '{}',
  channel         notification_channel DEFAULT 'in_app',
  status          notification_status DEFAULT 'pending',
  read_at         TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_org ON notifications(org_id);
CREATE INDEX idx_notifications_status ON notifications(status);

-- ============================================================
-- SUPPLY PREDICTIONS
-- ============================================================

CREATE TABLE supply_predictions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id                UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  org_id                UUID NOT NULL REFERENCES organizations(id),
  supply_level          supply_level NOT NULL,
  candidate_pool_count  INTEGER DEFAULT 0,
  prediction_data       JSONB DEFAULT '{}',
  recommended_vendors   UUID[] DEFAULT '{}',
  alternative_skills    TEXT[] DEFAULT '{}',
  similar_candidates    UUID[] DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VENDOR RELATIONSHIPS
-- ============================================================

CREATE TABLE vendor_relationships (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_org_id   UUID NOT NULL REFERENCES organizations(id),
  vendor_org_id   UUID NOT NULL REFERENCES organizations(id),
  status          VARCHAR(50) DEFAULT 'active',
  onboarded_by    UUID REFERENCES users(id),
  terms           JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_org_id, vendor_org_id)
);

-- ============================================================
-- INTEGRATION / WEBHOOK EVENTS
-- ============================================================

CREATE TABLE webhook_endpoints (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  url             TEXT NOT NULL,
  events          TEXT[] DEFAULT '{}',
  secret          TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE webhook_deliveries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint_id     UUID NOT NULL REFERENCES webhook_endpoints(id),
  event_type      VARCHAR(100) NOT NULL,
  payload         JSONB NOT NULL,
  status          VARCHAR(50) DEFAULT 'pending',
  response_code   INTEGER,
  response_body   TEXT,
  attempts        INTEGER DEFAULT 0,
  next_retry_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID REFERENCES organizations(id),
  user_id     UUID REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_org ON audit_logs(org_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_candidates_updated BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_jobs_updated BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_submissions_updated BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_ai_matches_updated BEFORE UPDATE ON ai_matches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
