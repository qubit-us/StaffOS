// Agency-side vendor management routes

import { Router } from 'express';
import { db } from '../config/database.js';
import { authenticate, requirePermission, requireOrgType } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.use(requireOrgType('staffing_agency'));

// GET /api/vendors
router.get('/', requirePermission('MANAGE_VENDORS'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const offset = (page - 1) * limit;

    let where = `vr.agency_org_id = $1`;
    const params = [req.orgId];
    let idx = 2;

    if (status) { where += ` AND vr.status = $${idx++}`; params.push(status); }
    if (search) { where += ` AND o.name ILIKE $${idx++}`; params.push(`%${search}%`); }

    const { rows } = await db.query(
      `SELECT o.id, o.name, o.slug, o.domain, o.logo_url, o.website, o.is_active,
              vr.status as relationship_status, vr.terms,
              vr.onboarded_by, vr.created_at as onboarded_at,
              u.first_name || ' ' || u.last_name as onboarded_by_name,
              (SELECT COUNT(*) FROM users vu WHERE vu.org_id = o.id) as user_count,
              (SELECT COUNT(*) FROM candidates c WHERE c.vendor_org_id = o.id) as candidate_count
       FROM vendor_relationships vr
       JOIN organizations o ON o.id = vr.vendor_org_id
       LEFT JOIN users u ON u.id = vr.onboarded_by
       WHERE ${where}
       ORDER BY vr.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    );

    const { rows: [{ count }] } = await db.query(
      `SELECT COUNT(*) FROM vendor_relationships vr
       JOIN organizations o ON o.id = vr.vendor_org_id
       WHERE ${where}`,
      params
    );

    res.json({ vendors: rows, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vendors/:id
router.get('/:id', requirePermission('MANAGE_VENDORS'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT o.*, vr.status as relationship_status, vr.terms, vr.created_at as onboarded_at,
              (SELECT COUNT(*) FROM candidates c WHERE c.vendor_org_id = o.id) as candidate_count
       FROM organizations o
       JOIN vendor_relationships vr ON vr.vendor_org_id = o.id
       WHERE o.id = $1 AND vr.agency_org_id = $2`,
      [req.params.id, req.orgId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Vendor not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vendors — onboard a new vendor
router.post('/', requirePermission('MANAGE_VENDORS'), async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { name, domain, website, terms,
            poc_first_name, poc_last_name, poc_email } = req.body;

    if (!name) return res.status(400).json({ error: 'Vendor name is required' });
    if (!poc_email) return res.status(400).json({ error: 'Point of contact email is required' });

    // Create the vendor organization
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    const { rows: [org] } = await client.query(
      `INSERT INTO organizations (name, slug, org_type, domain, website)
       VALUES ($1, $2, 'vendor', $3, $4) RETURNING *`,
      [name, slug, domain, website]
    );

    // Create the vendor relationship
    await client.query(
      `INSERT INTO vendor_relationships (agency_org_id, vendor_org_id, onboarded_by, terms)
       VALUES ($1, $2, $3, $4)`,
      [req.orgId, org.id, req.user.id, JSON.stringify(terms || {})]
    );

    // Create POC user account (password: TempPass123!)
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash('TempPass123!', 12);
    const { rows: [pocUser] } = await client.query(
      `INSERT INTO users (org_id, email, password_hash, first_name, last_name, email_verified)
       VALUES ($1, $2, $3, $4, $5, true) RETURNING id, email, first_name, last_name`,
      [org.id, poc_email, passwordHash, poc_first_name || '', poc_last_name || '']
    );

    // Create Vendor Admin role with permissions
    const { rows: [role] } = await client.query(
      `INSERT INTO roles (org_id, name, description, is_default)
       VALUES ($1, 'Vendor Admin', 'Full vendor access', false) RETURNING id`,
      [org.id]
    );

    await client.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT $1, id FROM permissions
       WHERE code IN ('UPLOAD_RESUME','SUBMIT_CANDIDATE','VIEW_CANDIDATES',
                      'VIEW_PIPELINE','VIEW_NOTIFICATIONS')`,
      [role.id]
    );

    await client.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
      [pocUser.id, role.id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      organization: org,
      poc_user: pocUser,
      message: `Vendor onboarded. POC login: ${poc_email} / TempPass123!`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'A vendor with this email already exists' });
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/vendors/:id
router.patch('/:id', requirePermission('MANAGE_VENDORS'), async (req, res) => {
  try {
    const { status, terms } = req.body;
    const updates = {};
    if (status !== undefined) updates.status = status;
    if (terms !== undefined) updates.terms = JSON.stringify(terms);

    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No fields to update' });

    const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 3}`);
    const { rows } = await db.query(
      `UPDATE vendor_relationships SET ${sets.join(', ')}
       WHERE vendor_org_id = $1 AND agency_org_id = $2 RETURNING *`,
      [req.params.id, req.orgId, ...Object.values(updates)]
    );
    if (!rows.length) return res.status(404).json({ error: 'Vendor not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
