// Admin routes — user, role, and org settings management
// Only accessible to staffing_agency org type with appropriate permissions

import { Router } from 'express';
import { db } from '../config/database.js';
import { authenticate, requirePermission, requireOrgType } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';

const router = Router();
router.use(authenticate);
router.use(requireOrgType('staffing_agency'));

// ── USERS ──────────────────────────────────────────────────────

// GET /api/admin/users
router.get('/users', requirePermission('MANAGE_USERS'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.is_active,
              u.created_at, u.last_login_at,
              array_agg(r.name ORDER BY r.name) FILTER (WHERE r.name IS NOT NULL) as roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.org_id = $1
       GROUP BY u.id
       ORDER BY u.created_at ASC`,
      [req.orgId]
    );
    res.json({ users: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/users/:id — toggle active status
router.patch('/users/:id', requirePermission('MANAGE_USERS'), async (req, res) => {
  try {
    const { is_active } = req.body;
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }
    const { rows } = await db.query(
      `UPDATE users SET is_active = $1
       WHERE id = $2 AND org_id = $3
       RETURNING id, email, first_name, last_name, is_active`,
      [is_active, req.params.id, req.orgId]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    logAudit(req, is_active ? 'user.activated' : 'user.deactivated', 'user', req.params.id, {
      email: rows[0].email, name: `${rows[0].first_name} ${rows[0].last_name}`,
    });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ROLES ──────────────────────────────────────────────────────

// GET /api/admin/roles
router.get('/roles', requirePermission('MANAGE_ROLES'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT r.id, r.name, r.description, r.is_default, r.created_at,
              array_agg(p.code ORDER BY p.code) FILTER (WHERE p.code IS NOT NULL) as permissions,
              COUNT(DISTINCT ur.user_id) as user_count
       FROM roles r
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id
       LEFT JOIN user_roles ur ON ur.role_id = r.id
       WHERE r.org_id = $1
       GROUP BY r.id
       ORDER BY r.created_at ASC`,
      [req.orgId]
    );
    res.json({ roles: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/permissions — all available permissions
router.get('/permissions', requirePermission('MANAGE_ROLES'), async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT id, code, description FROM permissions ORDER BY code`);
    res.json({ permissions: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ORG SETTINGS ───────────────────────────────────────────────

// GET /api/admin/settings
router.get('/settings', requirePermission('MANAGE_SETTINGS'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, slug, domain, website, logo_url, phone, industry, company_size,
              address_street, address_suite, address_city, address_state, address_zip, address_country, ein,
              settings, created_at
       FROM organizations WHERE id = $1`,
      [req.orgId]
    );
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/settings
router.patch('/settings', requirePermission('MANAGE_SETTINGS'), async (req, res) => {
  try {
    const { name, slug, domain, website, phone, industry, company_size,
            address_street, address_suite, address_city, address_state, address_zip, address_country, ein } = req.body;
    const updates = Object.fromEntries(
      Object.entries({ name, slug, domain, website, phone, industry, company_size,
                        address_street, address_suite, address_city, address_state, address_zip, address_country, ein })
        .filter(([, v]) => v !== undefined)
    );
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No fields to update' });

    const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`);
    const { rows: [org] } = await db.query(
      `UPDATE organizations SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $1
       RETURNING id, name, slug, domain, website, phone, industry, company_size,
                 address_street, address_suite, address_city, address_state, address_zip, address_country, ein, created_at`,
      [req.orgId, ...Object.values(updates)]
    );
    res.json(org);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
