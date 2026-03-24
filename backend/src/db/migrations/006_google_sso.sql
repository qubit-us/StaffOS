-- Migration 006: Add Google SSO support
-- google_id stores the Google sub (unique user identifier)
-- auth_provider tracks how the account was created

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_id    VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'local';
