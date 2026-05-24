-- Grant new permissions (added in migration 013) to existing agency admin roles
-- These were added after org creation so default Admin roles don't have them yet

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN organizations o ON o.id = r.org_id AND o.org_type = 'staffing_agency'
CROSS JOIN permissions p
WHERE p.code IN ('EDIT_CANDIDATE', 'SET_CANDIDATE_PRIORITY', 'MANAGE_EMPLOYERS')
AND r.is_default = true
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
)
ON CONFLICT DO NOTHING;
