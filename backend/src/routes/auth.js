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

export default router;
