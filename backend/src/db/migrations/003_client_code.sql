-- Migration 003: Add auto-generated client_code to client_relationships
-- Format: CLT-0001, CLT-0002, ...

CREATE SEQUENCE IF NOT EXISTS client_code_seq START 1;

CREATE OR REPLACE FUNCTION next_client_code()
RETURNS VARCHAR AS $$
  SELECT 'CLT-' || LPAD(nextval('client_code_seq')::text, 4, '0');
$$ LANGUAGE sql;

ALTER TABLE client_relationships
  ADD COLUMN IF NOT EXISTS client_code VARCHAR(20) UNIQUE DEFAULT next_client_code();

-- Backfill any existing rows that have no code yet
UPDATE client_relationships
SET client_code = next_client_code()
WHERE client_code IS NULL;
