-- Migration 007: Add security clearance, education, and travel fields to jobs

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS clearance_level      VARCHAR(50)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS clearance_status     VARCHAR(30)  DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS polygraph            VARCHAR(30)  DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS education_requirement VARCHAR(30) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS travel_requirement   VARCHAR(20)  DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS contract_vehicle     VARCHAR(100) DEFAULT NULL;

COMMENT ON COLUMN jobs.clearance_level      IS 'none, public_trust, secret, top_secret, ts_sci, ts_sci_poly';
COMMENT ON COLUMN jobs.clearance_status     IS 'not_required, must_have_active, must_be_clearable';
COMMENT ON COLUMN jobs.polygraph            IS 'none, ci_poly, full_scope_poly';
COMMENT ON COLUMN jobs.education_requirement IS 'none, high_school, associates, bachelors, masters, phd';
COMMENT ON COLUMN jobs.travel_requirement   IS 'none, minimal, up_to_25, up_to_50, up_to_100';
COMMENT ON COLUMN jobs.contract_vehicle     IS 'Free text: IDIQ, T&M, FFP, etc.';
