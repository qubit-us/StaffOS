import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import path from 'path';
import multer from 'multer';
import { Resend } from 'resend';
import { OAuth2Client } from 'google-auth-library';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@staffos360.com';
import { uploadToR2 } from '../utils/r2.js';

const uploadAvatar = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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
      `SELECT u.*, o.org_type, o.name as org_name, o.slug as org_slug, o.logo_url as org_logo
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

    // Audit: attach org/user to req manually since authenticate hasn't run
    req.orgId = user.org_id;
    req.user = { id: user.id };
    logAudit(req, 'user.login', 'user', user.id, { email: user.email, method: 'password' });

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
        phone: user.phone || null,
        title: user.title || null,
        avatarUrl: user.avatar_url || null,
        orgId: user.org_id,
        orgName: user.org_name,
        orgSlug: user.org_slug,
        orgType: user.org_type,
        orgLogo: user.org_logo || null,
        permissions: perms.map(p => p.code),
        roles: roleRows.map(r => r.name),
        mustChangePassword: user.must_change_password || false,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both current and new password are required' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
  if (currentPassword === newPassword) return res.status(400).json({ error: 'New password must be different from current password' });

  try {
    const { rows: [user] } = await db.query(`SELECT password_hash FROM users WHERE id = $1`, [req.user.id]);
    if (!user?.password_hash) return res.status(400).json({ error: 'Password change not available for SSO accounts' });

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 12);
    await db.query(`UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2`, [hash, req.user.id]);

    logAudit(req, 'user.password_changed', 'user', req.user.id, {});
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/auth/profile
router.patch('/profile', authenticate, async (req, res) => {
  try {
    const { first_name, last_name, phone, title } = req.body;
    const updates = Object.fromEntries(
      Object.entries({ first_name, last_name, phone, title }).filter(([, v]) => v !== undefined)
    );
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No fields to update' });
    const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`);
    const { rows: [user] } = await db.query(
      `UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $1
       RETURNING id, email, first_name, last_name, phone, title, avatar_url`,
      [req.user.id, ...Object.values(updates)]
    );
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/profile/avatar
router.post('/profile/avatar', authenticate, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
    const key = `avatars/${req.user.id}${ext}`;
    const avatarUrl = await uploadToR2(key, req.file.buffer, req.file.mimetype);
    await db.query(`UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2`, [avatarUrl, req.user.id]);
    res.json({ avatar_url: avatarUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auth/profile/avatar
router.delete('/profile/avatar', authenticate, async (req, res) => {
  try {
    await db.query(`UPDATE users SET avatar_url = NULL, updated_at = NOW() WHERE id = $1`, [req.user.id]);
    res.json({ message: 'Avatar removed' });
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
        phone: u.phone || null,
        title: u.title || null,
        avatarUrl: u.avatar_url || null,
        orgId: u.org_id,
        orgName: u.org_name,
        orgSlug: u.org_slug,
        orgType: u.org_type,
        orgLogo: u.org_logo || null,
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

    req.orgId = result.org.id;
    req.user = { id: result.user.id };
    logAudit(req, 'org.signup', 'organization', result.org.id, { orgName: result.org.name, email: result.user.email });

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

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const { rows: [user] } = await db.query(
      `SELECT id, email, first_name FROM users WHERE email = $1 AND is_active = true`,
      [email.toLowerCase()]
    );

    // Always return success to avoid email enumeration
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      `UPDATE users SET metadata = metadata || $1::jsonb WHERE id = $2`,
      [JSON.stringify({ reset_token: token, reset_token_expires: expires.toISOString() }), user.id]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'https://staffos.vercel.app';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await resend.emails.send({
      from: EMAIL_FROM,
      to: user.email,
      subject: 'Reset your StaffOS password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
          <h2 style="color:#4f46e5;">Reset your password</h2>
          <p>Hi ${user.first_name},</p>
          <p>Click the button below to reset your StaffOS password. This link expires in <strong>1 hour</strong>.</p>
          <a href="${resetUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Reset Password</a>
          <p style="color:#64748b;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const { rows: [user] } = await db.query(
      `SELECT id, metadata FROM users WHERE metadata->>'reset_token' = $1 AND is_active = true`,
      [token]
    );

    if (!user) return res.status(400).json({ error: 'Invalid or expired reset link' });

    const expires = new Date(user.metadata.reset_token_expires);
    if (expires < new Date()) return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });

    const hash = await bcrypt.hash(password, 12);
    await db.query(
      `UPDATE users SET password_hash = $1, metadata = metadata - 'reset_token' - 'reset_token_expires' WHERE id = $2`,
      [hash, user.id]
    );

    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

    req.orgId = user.org_id;
    req.user = { id: user.id };
    logAudit(req, 'user.login', 'user', user.id, { email: user.email, method: 'google' });

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
