// Org-level admin routes — works for any org type (client, vendor, agency)
// Scoped entirely to req.orgId from JWT

import { Router } from 'express';
import { db } from '../config/database.js';
import { authenticate, requirePermission } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/org-admin/users
router.get('/users', requirePermission('MANAGE_USERS'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.is_active,
              u.created_at, u.last_login_at,
              array_agg(r.name ORDER BY r.name) FILTER (WHERE r.id IS NOT NULL) as roles,
              array_agg(r.id ORDER BY r.name) FILTER (WHERE r.id IS NOT NULL) as role_ids
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.org_id = $1
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
      [req.orgId]
    );
    res.json({ users: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/org-admin/roles
router.get('/roles', requirePermission('MANAGE_USERS'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT r.id, r.name, r.description,
              array_agg(p.code ORDER BY p.code) FILTER (WHERE p.id IS NOT NULL) as permissions
       FROM roles r
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id
       WHERE r.org_id = $1
       GROUP BY r.id
       ORDER BY r.name`,
      [req.orgId]
    );
    res.json({ roles: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/org-admin/users
router.post('/users', requirePermission('MANAGE_USERS'), async (req, res) => {
  try {
    const { email, first_name, last_name, role_id } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash('Password123!', 12);

    const { rows: [user] } = await db.query(
      `INSERT INTO users (org_id, email, password_hash, first_name, last_name, email_verified)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, email, first_name, last_name, is_active, created_at`,
      [req.orgId, email.toLowerCase(), passwordHash, first_name || '', last_name || '']
    );

    if (role_id) {
      const { rows: roleCheck } = await db.query(
        `SELECT id FROM roles WHERE id = $1 AND org_id = $2`, [role_id, req.orgId]
      );
      if (roleCheck.length) {
        await db.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [user.id, role_id]);
      }
    }

    res.status(201).json({ user, message: 'User created. Temporary password: Password123!' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A user with this email already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/org-admin/users/:id
router.patch('/users/:id', requirePermission('MANAGE_USERS'), async (req, res) => {
  try {
    const { is_active, role_id, first_name, last_name } = req.body;

    const { rows: [user] } = await db.query(
      `SELECT id FROM users WHERE id = $1 AND org_id = $2`, [req.params.id, req.orgId]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (req.params.id === req.user.id && is_active === false) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    const updates = Object.fromEntries(
      Object.entries({ is_active, first_name, last_name }).filter(([, v]) => v !== undefined)
    );

    if (Object.keys(updates).length) {
      const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`);
      await db.query(
        `UPDATE users SET ${sets.join(', ')} WHERE id = $1`,
        [req.params.id, ...Object.values(updates)]
      );
    }

    if (role_id !== undefined) {
      await db.query(`DELETE FROM user_roles WHERE user_id = $1`, [req.params.id]);
      if (role_id) {
        const { rows: roleCheck } = await db.query(
          `SELECT id FROM roles WHERE id = $1 AND org_id = $2`, [role_id, req.orgId]
        );
        if (!roleCheck.length) return res.status(400).json({ error: 'Invalid role' });
        await db.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [req.params.id, role_id]);
      }
    }

    const { rows: [updated] } = await db.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.is_active, u.created_at,
              array_agg(r.name ORDER BY r.name) FILTER (WHERE r.id IS NOT NULL) as roles,
              array_agg(r.id ORDER BY r.name) FILTER (WHERE r.id IS NOT NULL) as role_ids
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [req.params.id]
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/org-admin/settings
router.get('/settings', requirePermission('MANAGE_USERS'), async (req, res) => {
  try {
    const { rows: [org] } = await db.query(
      `SELECT id, name, slug, domain, website, phone, industry, company_size, logo_url
       FROM organizations WHERE id = $1`,
      [req.orgId]
    );
    res.json(org);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/org-admin/settings
router.patch('/settings', requirePermission('MANAGE_USERS'), async (req, res) => {
  try {
    const { name, domain, website, phone, industry, company_size } = req.body;
    const updates = Object.fromEntries(
      Object.entries({ name, domain, website, phone, industry, company_size })
        .filter(([, v]) => v !== undefined)
    );
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No fields to update' });

    const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`);
    const { rows: [org] } = await db.query(
      `UPDATE organizations SET ${sets.join(', ')} WHERE id = $1
       RETURNING id, name, slug, domain, website, phone, industry, company_size`,
      [req.orgId, ...Object.values(updates)]
    );
    res.json(org);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
