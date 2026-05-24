-- Grant VIEW_MATCHES and RUN_MATCHING to existing vendor org roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN organizations o ON o.id = r.org_id AND o.org_type = 'vendor'
CROSS JOIN permissions p
WHERE p.code IN ('VIEW_MATCHES', 'RUN_MATCHING')
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
)
ON CONFLICT DO NOTHING;
