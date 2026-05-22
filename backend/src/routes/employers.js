import { Router } from 'express';
import { db } from '../config/database.js';
import { authenticate, requirePermission } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/employers?search=
router.get('/', requirePermission('VIEW_CANDIDATES'), async (req, res) => {
  const { search } = req.query;
  let where = 'org_id = $1';
  const params = [req.orgId];
  if (search) {
    where += ' AND name ILIKE $2';
    params.push(`%${search}%`);
  }
  const { rows } = await db.query(
    `SELECT id, name, ein, contact_name, contact_email, contact_phone, notes
     FROM employers WHERE ${where} ORDER BY name ASC LIMIT 50`,
    params
  );
  res.json(rows);
});

// POST /api/employers — create a new employer
router.post('/', requirePermission('VIEW_CANDIDATES'), async (req, res) => {
  const { name, ein, contact_name, contact_email, contact_phone, notes } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Employer name is required' });

  const { rows: [existing] } = await db.query(
    `SELECT id FROM employers WHERE org_id = $1 AND LOWER(name) = LOWER($2)`,
    [req.orgId, name.trim()]
  );
  if (existing) return res.json(existing); // return existing if duplicate

  const { rows: [employer] } = await db.query(
    `INSERT INTO employers (org_id, name, ein, contact_name, contact_email, contact_phone, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.orgId, name.trim(), ein || null, contact_name || null, contact_email || null, contact_phone || null, notes || null]
  );
  res.status(201).json(employer);
});

// PATCH /api/employers/:id
router.patch('/:id', requirePermission('VIEW_CANDIDATES'), async (req, res) => {
  const allowed = ['name', 'ein', 'contact_name', 'contact_email', 'contact_phone', 'notes'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No fields to update' });

  const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`);
  const { rows: [employer] } = await db.query(
    `UPDATE employers SET ${sets.join(', ')} WHERE id = $1 AND org_id = $${Object.keys(updates).length + 2} RETURNING *`,
    [req.params.id, ...Object.values(updates), req.orgId]
  );
  if (!employer) return res.status(404).json({ error: 'Employer not found' });
  res.json(employer);
});

export default router;
