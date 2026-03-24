import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { rows } = await db.query(
      `SELECT u.*, o.org_type, o.name as org_name, o.slug as org_slug
       FROM users u JOIN organizations o ON u.org_id = o.id
       WHERE u.email = $1 AND u.is_active = true`,
      [email.toLowerCase()]
    );

    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.password_hash) {
      return res.status(401).json({ error: 'This account uses Google Sign-In. Please use the "Sign in with Google" button.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const { rows: perms } = await db.query(
      `SELECT DISTINCT p.code FROM user_roles ur
       JOIN role_permissions rp ON rp.role_id = ur.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE ur.user_id = $1`,
      [user.id]
    );

    const { rows: roleRows } = await db.query(
      `SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1`,
      [user.id]
    );

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
        permissions: perms.map(p => p.code),
        roles: roleRows.map(r => r.name),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
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

    const u = req.user;
    res.json({
      user: {
        id: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        orgId: u.org_id,
        orgName: u.org_name,
        orgSlug: u.org_slug,
        orgType: u.org_type,
        permissions: perms.map(p => p.code),
        roles: roleRows.map(r => r.name),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
      if (existing.rows.length > 0) throw Object.assign(new Error('Email already in use'), { status: 409 });

      const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
      const { rows: [org] } = await client.query(
        `INSERT INTO organizations (name, slug, org_type) VALUES ($1, $2, 'staffing_agency') RETURNING *`,
        [orgName, slug]
      );

      const hash = await bcrypt.hash(password, 12);
      const { rows: [user] } = await client.query(
        `INSERT INTO users (org_id, email, password_hash, first_name, last_name, email_verified)
         VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
        [org.id, email.toLowerCase(), hash, firstName, lastName]
      );

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
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

// POST /api/auth/google — verify Google credential and return StaffOS JWT
router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Google credential is required' });
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(500).json({ error: 'Google SSO is not configured on this server' });

  try {
    // 1. Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, given_name: firstName, family_name: lastName, picture } = payload;

    if (!email) return res.status(400).json({ error: 'Could not retrieve email from Google account' });

    // 2. Find existing user by google_id or email
    const { rows } = await db.query(
      `SELECT u.*, o.org_type, o.name as org_name, o.slug as org_slug
       FROM users u JOIN organizations o ON u.org_id = o.id
       WHERE (u.google_id = $1 OR u.email = $2)
         AND u.is_active = true AND o.is_active = true
       LIMIT 1`,
      [googleId, email.toLowerCase()]
    );

    let user = rows[0];

    if (!user) {
      return res.status(404).json({
        error: 'No StaffOS account found for this Google account. Contact your administrator to get access.',
      });
    }

    // 3. Link google_id if this is the first Google sign-in for this account
    if (!user.google_id) {
      await db.query(
        `UPDATE users SET google_id = $1, auth_provider = 'google', last_login_at = NOW() WHERE id = $2`,
        [googleId, user.id]
      );
    } else {
      await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
    }

    // 4. Fetch permissions and roles
    const { rows: perms } = await db.query(
      `SELECT DISTINCT p.code FROM user_roles ur
       JOIN role_permissions rp ON rp.role_id = ur.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE ur.user_id = $1`,
      [user.id]
    );
    const { rows: roleRows } = await db.query(
      `SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1`,
      [user.id]
    );

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
        firstName: user.first_name || firstName || '',
        lastName: user.last_name || lastName || '',
        orgId: user.org_id,
        orgName: user.org_name,
        orgSlug: user.org_slug,
        orgType: user.org_type,
        permissions: perms.map(p => p.code),
        roles: roleRows.map(r => r.name),
      },
    });
  } catch (err) {
    if (err.message?.includes('Token used too late') || err.message?.includes('Invalid token')) {
      return res.status(401).json({ error: 'Google token expired or invalid. Please try again.' });
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
