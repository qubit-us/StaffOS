-- Employer companies (H1B sponsoring / C2C employers)
CREATE TABLE IF NOT EXISTS employers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id),
  name          VARCHAR(255) NOT NULL,
  ein           VARCHAR(20),
  contact_name  VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Add employment/employer fields to candidates
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS employment_type  VARCHAR(10)
    CHECK (employment_type IN ('w2', 'c2c', '1099')),
  ADD COLUMN IF NOT EXISTS employer_id      UUID REFERENCES employers(id),
  ADD COLUMN IF NOT EXISTS employer_name_raw VARCHAR(255);
