-- StaffOS Seed Data

-- ============================================================
-- PERMISSIONS
-- ============================================================

INSERT INTO permissions (code, description, category) VALUES
  ('CREATE_JOB',          'Create new job postings',            'jobs'),
  ('EDIT_JOB',            'Edit existing job postings',          'jobs'),
  ('DELETE_JOB',          'Delete job postings',                 'jobs'),
  ('VIEW_JOBS',           'View all jobs',                       'jobs'),
  ('VIEW_CANDIDATES',     'View candidate profiles',             'candidates'),
  ('SUBMIT_CANDIDATE',    'Submit a candidate to a job',         'candidates'),
  ('APPROVE_SUBMISSION',  'Approve candidate submissions',       'candidates'),
  ('UPLOAD_RESUME',       'Upload candidate resumes',            'candidates'),
  ('VIEW_PIPELINE',       'View interview pipeline',             'pipeline'),
  ('MANAGE_PIPELINE',     'Move candidates through pipeline',    'pipeline'),
  ('VIEW_MATCHES',        'View AI match results',               'matching'),
  ('RUN_MATCHING',        'Trigger AI matching engine',          'matching'),
  ('MANAGE_USERS',        'Manage organization users',           'admin'),
  ('MANAGE_ROLES',        'Manage roles and permissions',        'admin'),
  ('MANAGE_VENDORS',      'Onboard and manage vendors',          'admin'),
  ('VIEW_ANALYTICS',      'View platform analytics',             'analytics'),
  ('MANAGE_SETTINGS',     'Manage organization settings',        'admin'),
  ('UNLOCK_CANDIDATE',    'Unlock anonymized candidate profiles','candidates'),
  ('VIEW_NOTIFICATIONS',  'View notifications',                  'system'),
  ('MANAGE_WEBHOOKS',     'Manage webhook integrations',         'integrations'),
  ('MANAGE_CLIENTS',     'Onboard and manage clients',          'admin'),
  ('VIEW_CLIENT_PORTAL', 'Access the client-facing portal',     'client'),
  ('CREATE_REQUIREMENT', 'Create job requirements as a client', 'client'),
  ('EDIT_REQUIREMENT',   'Edit own job requirements',           'client'),
  ('REVIEW_CANDIDATE',   'Review candidates submitted by the agency', 'client'),
  ('APPROVE_CANDIDATE',  'Approve or reject submitted candidates',    'client'),
  ('VIEW_SUBMISSIONS',   'View candidate submissions for own jobs',   'client'),
  ('REQUEST_INTERVIEW',  'Request an interview for a candidate',      'client');

-- ============================================================
-- DEMO ORGANIZATIONS
-- ============================================================

INSERT INTO organizations (id, name, slug, org_type, settings) VALUES
  ('00000000-0000-0000-0000-000000000001', 'TalentBridge Staffing', 'talentbridge', 'staffing_agency', '{"primary_color": "#6366f1", "timezone": "America/New_York"}'),
  ('00000000-0000-0000-0000-000000000002', 'TechTalent Vendors Inc', 'techtalent-vendors', 'vendor',         '{}'),
  ('00000000-0000-0000-0000-000000000003', 'Acme Corp MSP',         'acme-msp',         'client',          '{}'),
  ('00000000-0000-0000-0000-000000000004', 'GlobalTech End Client', 'globaltech',        'end_client',      '{}');

-- Vendor relationship
INSERT INTO vendor_relationships (agency_org_id, vendor_org_id, status)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'active');

-- Client relationship
INSERT INTO client_relationships (agency_org_id, client_org_id, status)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'active');

-- ============================================================
-- DEMO USERS (password: Password123!)
-- bcrypt hash of 'Password123!'
-- ============================================================

INSERT INTO users (id, org_id, email, password_hash, first_name, last_name, email_verified) VALUES
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'admin@talentbridge.io',    '$2b$12$7ids7gbGDmo.KGDTKPYydejgfec0D8RoId3zg649vK0O2.8zN.qzy', 'Sarah',  'Chen',    true),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'recruiter@talentbridge.io','$2b$12$7ids7gbGDmo.KGDTKPYydejgfec0D8RoId3zg649vK0O2.8zN.qzy', 'Marcus', 'Johnson', true),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000002', 'vendor@techtalent.com',   '$2b$12$7ids7gbGDmo.KGDTKPYydejgfec0D8RoId3zg649vK0O2.8zN.qzy', 'Priya',  'Patel',   true),
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000003', 'admin@acme-msp.com',      '$2b$12$7ids7gbGDmo.KGDTKPYydejgfec0D8RoId3zg649vK0O2.8zN.qzy', 'James',  'Walker',  true),
  ('00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0000-000000000003', 'hiring@acme-msp.com',     '$2b$12$7ids7gbGDmo.KGDTKPYydejgfec0D8RoId3zg649vK0O2.8zN.qzy', 'Linda',  'Torres',  true);

-- ============================================================
-- ROLES
-- ============================================================

-- Staffing Agency roles
INSERT INTO roles (id, org_id, name, description, is_default) VALUES
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000001', 'Agency Admin',      'Full platform access',           false),
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0000-000000000001', 'Senior Recruiter',  'Full recruiting access',         false),
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0000-000000000001', 'Junior Recruiter',  'Limited recruiting access',      true),
  ('00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0000-000000000001', 'Account Manager',   'Client and job management',      false),
  ('00000000-0000-0000-0002-000000000005', '00000000-0000-0000-0000-000000000001', 'Delivery Manager',  'Delivery and pipeline oversight', false),
  -- Vendor roles
  ('00000000-0000-0000-0002-000000000006', '00000000-0000-0000-0000-000000000002', 'Vendor Admin',      'Full vendor access',             false),
  ('00000000-0000-0000-0002-000000000007', '00000000-0000-0000-0000-000000000002', 'Vendor Recruiter',  'Submit candidates',              true),
  -- Client roles
  ('00000000-0000-0000-0002-000000000008', '00000000-0000-0000-0000-000000000003', 'Client Admin',      'Full client portal access',      false),
  ('00000000-0000-0000-0002-000000000009', '00000000-0000-0000-0000-000000000003', 'Client Viewer',     'Read-only client portal access', true);

-- Assign permissions to Agency Admin role (all permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0002-000000000001', id FROM permissions;

-- Senior Recruiter permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0002-000000000002', id FROM permissions
WHERE code IN ('CREATE_JOB','EDIT_JOB','VIEW_JOBS','VIEW_CANDIDATES','SUBMIT_CANDIDATE',
               'APPROVE_SUBMISSION','UPLOAD_RESUME','VIEW_PIPELINE','MANAGE_PIPELINE',
               'VIEW_MATCHES','RUN_MATCHING','VIEW_ANALYTICS','UNLOCK_CANDIDATE');

-- Vendor Recruiter permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0002-000000000007', id FROM permissions
WHERE code IN ('UPLOAD_RESUME','SUBMIT_CANDIDATE','VIEW_CANDIDATES','VIEW_PIPELINE','VIEW_NOTIFICATIONS');

-- Client Admin permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0002-000000000008', id FROM permissions
WHERE code IN ('VIEW_CLIENT_PORTAL','CREATE_REQUIREMENT','EDIT_REQUIREMENT','REVIEW_CANDIDATE',
               'APPROVE_CANDIDATE','VIEW_SUBMISSIONS','REQUEST_INTERVIEW','VIEW_NOTIFICATIONS');

-- Client Viewer permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0002-000000000009', id FROM permissions
WHERE code IN ('VIEW_CLIENT_PORTAL','VIEW_SUBMISSIONS','VIEW_NOTIFICATIONS');

-- Assign roles to users
INSERT INTO user_roles (user_id, role_id) VALUES
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000001'),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0002-000000000002'),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0002-000000000006'),
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0002-000000000008'),
  ('00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0002-000000000009');
