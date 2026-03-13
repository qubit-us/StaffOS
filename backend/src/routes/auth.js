import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const { rows } = await db.query(
    `SELECT u.*, o.org_type, o.name as org_name, o.slug as org_slug
     FROM users u JOIN organizations o ON u.org_id = o.id
     WHERE u.email = $1 AND u.is_active = true`,
    [email.toLowerCase()]
  );

  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  // Load permissions
  const { rows: perms } = await db.query(
    `SELECT DISTINCT p.code FROM user_roles ur
     JOIN role_permissions rp ON rp.role_id = ur.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE ur.user_id = $1`,
    [user.id]
  );

  const permissions = perms.map(p => p.code);

  // Load roles
  const { rows: roleRows } = await db.query(
    `SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1`,
    [user.id]
  );
  const roles = roleRows.map(r => r.name);

  await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

  const token = jwt.sign(
    { userId: user.id, orgId: user.org_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      orgId: user.org_id,
      orgName: user.org_name,
      orgSlug: user.org_slug,
      orgType: user.org_type,
      permissions,
      roles,
    },
  });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const { rows: perms } = await db.query(
    `SELECT DISTINCT p.code FROM user_roles ur
     JOIN role_permissions rp ON rp.role_id = ur.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE ur.user_id = $1`,
    [req.user.id]
  );

  const { rows: roleRows } = await db.query(
    `SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1`,
    [req.user.id]
  );

  res.json({
    user: {
      ...req.user,
      permissions: perms.map(p => p.code),
      roles: roleRows.map(r => r.name),
    },
  });
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { firstName, lastName, email, password, orgName } = req.body;

  if (!firstName || !lastName || !email || !password || !orgName) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const result = await db.transaction(async (client) => {
      // Check email not taken
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
      if (existing.rows.length > 0) throw Object.assign(new Error('Email already in use'), { status: 409 });

      // Create org
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
      const { rows: [org] } = await client.query(
        `INSERT INTO organizations (name, slug, org_type) VALUES ($1, $2, 'staffing_agency') RETURNING *`,
        [orgName, slug]
      );

      // Create user
      const hash = await bcrypt.hash(password, 12);
      const { rows: [user] } = await client.query(
        `INSERT INTO users (org_id, email, password_hash, first_name, last_name, email_verified)
         VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
        [org.id, email.toLowerCase(), hash, firstName, lastName]
      );

      // Create admin role with all permissions
      const { rows: [role] } = await client.query(
        `INSERT INTO roles (org_id, name, description) VALUES ($1, 'Admin', 'Full platform access') RETURNING *`,
        [org.id]
      );
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id) SELECT $1, id FROM permissions`,
        [role.id]
      );
      await client.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
        [user.id, role.id]
      );

      return { user, org };
    });

    const { rows: perms } = await db.query(
      `SELECT DISTINCT p.code FROM user_roles ur
       JOIN role_permissions rp ON rp.role_id = ur.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE ur.user_id = $1`,
      [result.user.id]
    );

    const token = jwt.sign(
      { userId: result.user.id, orgId: result.org.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.first_name,
        lastName: result.user.last_name,
        orgId: result.org.id,
        orgName: result.org.name,
        orgSlug: result.org.slug,
        orgType: result.org.org_type,
        permissions: perms.map(p => p.code),
        roles: ['Admin'],
      },
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

export default router;
