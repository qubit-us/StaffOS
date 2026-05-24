-- Ensure agency default admin roles have ALL permissions.
-- Covers permissions added in migrations 002 and 013 that weren't
-- granted to admin roles created before those migrations ran.

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN organizations o ON o.id = r.org_id AND o.org_type = 'staffing_agency'
CROSS JOIN permissions p
WHERE r.is_default = true
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
)
ON CONFLICT DO NOTHING;
