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

// PATCH /api/admin/users/:id — update user (name, active status, role)
router.patch('/users/:id', requirePermission('MANAGE_USERS'), async (req, res) => {
  try {
    const { is_active, first_name, last_name, role_id } = req.body;
    if (is_active === false && req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }

    // Build dynamic update for name/active fields
    const fields = [];
    const vals = [];
    if (first_name !== undefined) { fields.push(`first_name = $${vals.length + 1}`); vals.push(first_name.trim()); }
    if (last_name  !== undefined) { fields.push(`last_name = $${vals.length + 1}`);  vals.push(last_name.trim());  }
    if (is_active  !== undefined) { fields.push(`is_active = $${vals.length + 1}`);  vals.push(is_active);          }

    let user;
    if (fields.length) {
      vals.push(req.params.id, req.orgId);
      const { rows } = await db.query(
        `UPDATE users SET ${fields.join(', ')}
         WHERE id = $${vals.length - 1} AND org_id = $${vals.length}
         RETURNING id, email, first_name, last_name, is_active`,
        vals
      );
      if (!rows.length) return res.status(404).json({ error: 'User not found' });
      user = rows[0];
    } else {
      const { rows } = await db.query(
        `SELECT id, email, first_name, last_name, is_active FROM users WHERE id = $1 AND org_id = $2`,
        [req.params.id, req.orgId]
      );
      if (!rows.length) return res.status(404).json({ error: 'User not found' });
      user = rows[0];
    }

    // Update role if provided
    if (role_id !== undefined) {
      await db.query(`DELETE FROM user_roles WHERE user_id = $1`, [user.id]);
      if (role_id) {
        const { rows: roleCheck } = await db.query(
          `SELECT id FROM roles WHERE id = $1 AND org_id = $2`, [role_id, req.orgId]
        );
        if (roleCheck.length) {
          await db.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [user.id, role_id]);
        }
      }
    }

    const action = is_active === true ? 'user.activated' : is_active === false ? 'user.deactivated' : 'user.updated';
    logAudit(req, action, 'user', user.id, { email: user.email, name: `${user.first_name} ${user.last_name}` });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id — remove user from org
// If the user has related records (candidates, audit logs, etc.), soft-delete instead
router.delete('/users/:id', requirePermission('MANAGE_USERS'), async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot remove your own account' });
    }
    const { rows: found } = await db.query(
      `SELECT id, email, first_name, last_name FROM users WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.orgId]
    );
    if (!found.length) return res.status(404).json({ error: 'User not found' });
    const u = found[0];

    try {
      await db.query(`DELETE FROM users WHERE id = $1`, [u.id]);
      logAudit(req, 'user.deleted', 'user', u.id, { email: u.email, name: `${u.first_name} ${u.last_name}` });
      res.json({ success: true, hard_deleted: true });
    } catch (fkErr) {
      // FK constraint — user has activity history, deactivate instead
      if (fkErr.code === '23503') {
        await db.query(`UPDATE users SET is_active = false WHERE id = $1`, [u.id]);
        logAudit(req, 'user.deactivated', 'user', u.id, { email: u.email, name: `${u.first_name} ${u.last_name}`, reason: 'delete_blocked_by_fk' });
        res.json({ success: true, hard_deleted: false, message: `${u.first_name} has activity history and cannot be permanently deleted. They have been deactivated instead.` });
      } else {
        throw fkErr;
      }
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users — invite internal agency user
router.post('/users', requirePermission('MANAGE_USERS'), async (req, res) => {
  const { first_name, last_name, email, role_id } = req.body;
  if (!first_name || !last_name || !email) {
    return res.status(400).json({ error: 'first_name, last_name, and email are required' });
  }
  try {
    const bcrypt = await import('bcryptjs');
    const tempPassword = 'Password123!';
    const passwordHash = await bcrypt.default.hash(tempPassword, 10);

    const { rows: existing } = await db.query(
      `SELECT id FROM users WHERE email = $1`, [email.toLowerCase()]
    );
    if (existing.length) return res.status(409).json({ error: 'A user with that email already exists' });

    const { rows: [user] } = await db.query(
      `INSERT INTO users (org_id, email, password_hash, first_name, last_name, email_verified, must_change_password)
       VALUES ($1, $2, $3, $4, $5, true, true)
       RETURNING id, email, first_name, last_name`,
      [req.orgId, email.toLowerCase(), passwordHash, first_name.trim(), last_name.trim()]
    );

    if (role_id) {
      const { rows: roleCheck } = await db.query(
        `SELECT id FROM roles WHERE id = $1 AND org_id = $2`, [role_id, req.orgId]
      );
      if (roleCheck.length) {
        await db.query(
          `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
          [user.id, role_id]
        );
      }
    }

    logAudit(req, 'user.invited', 'user', user.id, { email: user.email });
    res.status(201).json({ user, temp_password: tempPassword });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ROLES ──────────────────────────────────────────────────────

const AGENCY_PERMISSIONS = [
  'VIEW_JOBS','CREATE_JOB','EDIT_JOB','DELETE_JOB',
  'VIEW_CANDIDATES','EDIT_CANDIDATE','SET_CANDIDATE_PRIORITY',
  'SCREEN_CANDIDATE','VALIDATE_CANDIDATE','UNLOCK_CANDIDATE','UPLOAD_RESUME',
  'VIEW_PIPELINE','MANAGE_PIPELINE','SUBMIT_CANDIDATE','SUBMIT_TO_CLIENT','APPROVE_SUBMISSION',
  'VIEW_MATCHES','RUN_MATCHING','VIEW_RATES','MANAGE_RATES',
  'MANAGE_CLIENTS','MANAGE_VENDORS','MANAGE_EMPLOYERS',
  'VIEW_ANALYTICS','VIEW_NOTIFICATIONS','VIEW_SUBMISSIONS',
  'MANAGE_USERS','MANAGE_ROLES','MANAGE_SETTINGS','MANAGE_WEBHOOKS',
];

// GET /api/admin/roles
router.get('/roles', requirePermission('MANAGE_ROLES'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT r.id, r.name, r.description, r.is_default, r.created_at,
              array_agg(DISTINCT p.code) FILTER (WHERE p.code IS NOT NULL) as permissions,
              array_agg(DISTINCT rp.permission_id) FILTER (WHERE rp.permission_id IS NOT NULL) as permission_ids,
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

// POST /api/admin/roles
router.post('/roles', requirePermission('MANAGE_ROLES'), async (req, res) => {
  try {
    const { name, description, permission_ids = [] } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Role name is required' });
    const { rows: validPerms } = await db.query(
      `SELECT id FROM permissions WHERE id = ANY($1) AND code = ANY($2)`,
      [permission_ids, AGENCY_PERMISSIONS]
    );
    const validIds = validPerms.map(p => p.id);
    const { rows: [role] } = await db.query(
      `INSERT INTO roles (org_id, name, description, is_default) VALUES ($1, $2, $3, false) RETURNING *`,
      [req.orgId, name.trim(), description?.trim() || null]
    );
    if (validIds.length) {
      await db.query(
        `INSERT INTO role_permissions (role_id, permission_id) SELECT $1, UNNEST($2::uuid[])`,
        [role.id, validIds]
      );
    }
    res.status(201).json({ ...role, permission_ids: validIds });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A role with this name already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/roles/:id
router.patch('/roles/:id', requirePermission('MANAGE_ROLES'), async (req, res) => {
  try {
    const { rows: [role] } = await db.query(
      `SELECT * FROM roles WHERE id = $1 AND org_id = $2`, [req.params.id, req.orgId]
    );
    if (!role) return res.status(404).json({ error: 'Role not found' });
    if (role.is_default) return res.status(403).json({ error: 'System roles cannot be modified' });
    const { name, description, permission_ids } = req.body;
    if (name !== undefined || description !== undefined) {
      const updates = Object.fromEntries(
        Object.entries({ name: name?.trim(), description: description?.trim() }).filter(([, v]) => v !== undefined)
      );
      if (Object.keys(updates).length) {
        const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`);
        await db.query(`UPDATE roles SET ${sets.join(', ')} WHERE id = $1`, [role.id, ...Object.values(updates)]);
      }
    }
    if (permission_ids !== undefined) {
      const { rows: validPerms } = await db.query(
        `SELECT id FROM permissions WHERE id = ANY($1) AND code = ANY($2)`,
        [permission_ids, AGENCY_PERMISSIONS]
      );
      const validIds = validPerms.map(p => p.id);
      await db.query(`DELETE FROM role_permissions WHERE role_id = $1`, [role.id]);
      if (validIds.length) {
        await db.query(
          `INSERT INTO role_permissions (role_id, permission_id) SELECT $1, UNNEST($2::uuid[])`,
          [role.id, validIds]
        );
      }
    }
    const { rows: [updated] } = await db.query(
      `SELECT r.*, array_agg(DISTINCT rp.permission_id) FILTER (WHERE rp.permission_id IS NOT NULL) as permission_ids
       FROM roles r LEFT JOIN role_permissions rp ON rp.role_id = r.id
       WHERE r.id = $1 GROUP BY r.id`, [role.id]
    );
    res.json(updated);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A role with this name already exists' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/roles/:id
router.delete('/roles/:id', requirePermission('MANAGE_ROLES'), async (req, res) => {
  try {
    const { rows: [role] } = await db.query(
      `SELECT * FROM roles WHERE id = $1 AND org_id = $2`, [req.params.id, req.orgId]
    );
    if (!role) return res.status(404).json({ error: 'Role not found' });
    if (role.is_default) return res.status(403).json({ error: 'System roles cannot be deleted' });
    const { rows: [{ count }] } = await db.query(
      `SELECT COUNT(*) FROM user_roles WHERE role_id = $1`, [role.id]
    );
    if (parseInt(count) > 0) return res.status(409).json({ error: `This role is assigned to ${count} user(s). Reassign them first.` });
    await db.query(`DELETE FROM roles WHERE id = $1`, [role.id]);
    res.json({ message: 'Role deleted' });
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
