-- Migration 005: Expand client onboarding fields
-- Adds address, contact, legal, and billing details to orgs and client_relationships

-- ── Organizations: address + contact + company details ─────────
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS phone          VARCHAR(30),
  ADD COLUMN IF NOT EXISTS industry       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS company_size   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS address_street VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address_suite  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS address_city   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS address_state  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS address_zip    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS address_country VARCHAR(100) DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS ein            VARCHAR(20);

-- ── Client relationships: billing, account owner, notes ────────
ALTER TABLE client_relationships
  ADD COLUMN IF NOT EXISTS contract_type      VARCHAR(20) DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS net_payment_terms  INTEGER     DEFAULT 30,
  ADD COLUMN IF NOT EXISTS account_manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes              TEXT;
