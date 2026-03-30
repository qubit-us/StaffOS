import { Router } from 'express';
import { db } from '../config/database.js';
import { authenticate, requirePermission } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/audit-logs — full org audit log (admin only)
router.get('/', requirePermission('MANAGE_USERS'), async (req, res) => {
  try {
    const { user_id, action, entity_type, from, to, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let where = `a.org_id = $1`;
    const params = [req.orgId];
    let idx = 2;

    if (user_id)     { where += ` AND a.user_id = $${idx++}`;      params.push(user_id); }
    if (action)      { where += ` AND a.action ILIKE $${idx++}`;   params.push(`%${action}%`); }
    if (entity_type) { where += ` AND a.entity_type = $${idx++}`;  params.push(entity_type); }
    if (from)        { where += ` AND a.created_at >= $${idx++}`;  params.push(from); }
    if (to)          { where += ` AND a.created_at <= $${idx++}`;  params.push(to); }

    const { rows } = await db.query(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.new_data as metadata,
              a.ip_address, a.created_at,
              u.first_name, u.last_name, u.email
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE ${where}
       ORDER BY a.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    );

    const { rows: [{ count }] } = await db.query(
      `SELECT COUNT(*) FROM audit_logs a WHERE ${where}`, params
    );

    // Distinct users for filter dropdown
    const { rows: users } = await db.query(
      `SELECT DISTINCT u.id, u.first_name, u.last_name
       FROM audit_logs a
       JOIN users u ON u.id = a.user_id
       WHERE a.org_id = $1
       ORDER BY u.first_name`,
      [req.orgId]
    );

    res.json({ logs: rows, total: parseInt(count), page: parseInt(page), limit: parseInt(limit), users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/audit-logs/my — current user's own activity
router.get('/my', async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const offset = (page - 1) * limit;

    const { rows } = await db.query(
      `SELECT id, action, entity_type, entity_id, new_data as metadata, created_at
       FROM audit_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const { rows: [{ count }] } = await db.query(
      `SELECT COUNT(*) FROM audit_logs WHERE user_id = $1`, [req.user.id]
    );

    res.json({ logs: rows, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/audit-logs/vendor — vendor-scoped: their submissions' stage changes
router.get('/vendor', async (req, res) => {
  try {
    if (req.user.org_type !== 'vendor') return res.status(403).json({ error: 'Vendor access only' });
    const { page = 1, limit = 30 } = req.query;
    const offset = (page - 1) * limit;

    const { rows } = await db.query(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.new_data as metadata, a.created_at,
              u.first_name, u.last_name
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.entity_type IN ('submission', 'candidate')
         AND (a.new_data->>'vendor_org_id' = $1 OR a.org_id IN (
           SELECT DISTINCT org_id FROM submissions WHERE vendor_org_id = $1
         ))
       ORDER BY a.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.orgId, limit, offset]
    );

    res.json({ logs: rows, total: rows.length, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/audit-logs/client — client-scoped: activity on their jobs
router.get('/client', async (req, res) => {
  try {
    if (req.user.org_type !== 'client') return res.status(403).json({ error: 'Client access only' });
    const { page = 1, limit = 30 } = req.query;
    const offset = (page - 1) * limit;

    const { rows } = await db.query(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.new_data as metadata, a.created_at,
              u.first_name, u.last_name
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.entity_type = 'submission'
         AND a.new_data->>'client_org_id' = $1
       ORDER BY a.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.orgId, limit, offset]
    );

    res.json({ logs: rows, total: rows.length, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
