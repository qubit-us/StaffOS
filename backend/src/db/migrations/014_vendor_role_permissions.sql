-- Backfill missing permissions for existing vendor org roles
-- Grants VIEW_JOBS, CREATE_JOB, EDIT_JOB, EDIT_CANDIDATE, VIEW_SUBMISSIONS,
-- MANAGE_USERS, MANAGE_ROLES, MANAGE_SETTINGS to all vendor roles that don't already have them

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN organizations o ON o.id = r.org_id AND o.org_type = 'vendor'
CROSS JOIN permissions p
WHERE p.code IN (
  'VIEW_JOBS','CREATE_JOB','EDIT_JOB',
  'EDIT_CANDIDATE','VIEW_SUBMISSIONS',
  'MANAGE_USERS','MANAGE_ROLES','MANAGE_SETTINGS'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
)
ON CONFLICT DO NOTHING;
