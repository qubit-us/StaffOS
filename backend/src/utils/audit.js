import { db } from '../config/database.js';

/**
 * Log an audit event. Never throws — audit failures must not break the main request.
 *
 * @param {object} req       - Express request (for user, org, ip)
 * @param {string} action    - e.g. 'candidate.created', 'job.updated', 'user.login'
 * @param {string} entityType - e.g. 'candidate', 'job', 'submission', 'user'
 * @param {string} entityId  - UUID of the affected record (nullable)
 * @param {object} metadata  - Extra context (name, title, from_stage, etc.)
 */
export async function logAudit(req, action, entityType, entityId, metadata = {}) {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null;
    await db.query(
      `INSERT INTO audit_logs (org_id, user_id, action, entity_type, entity_id, new_data, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        req.orgId || null,
        req.user?.id || null,
        action,
        entityType || null,
        entityId || null,
        JSON.stringify(metadata),
        ip,
      ]
    );
  } catch (_) {
    // Silent — audit must never break the main flow
  }
}
