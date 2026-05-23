-- New permissions: candidate editing, priority management, employer management
INSERT INTO permissions (code, description, category) VALUES
  ('EDIT_CANDIDATE',         'Edit candidate profile details',                 'candidates'),
  ('SET_CANDIDATE_PRIORITY', 'Set or change the priority level on a candidate','candidates'),
  ('MANAGE_EMPLOYERS',       'Add, edit, and delete employer company records',  'admin')
ON CONFLICT (code) DO NOTHING;
