import { Router } from 'express';
import { db } from '../config/database.js';
import { authenticate, requirePermission } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const VALID_STAGES = ['submitted','client_review','shortlisted','interview_r1','interview_r2','offer','placed','rejected','withdrawn'];

// GET /api/submissions?job_id=...
router.get('/', requirePermission('VIEW_PIPELINE'), async (req, res) => {
  const { job_id, stage, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let where = `s.org_id = $1`;
  const params = [req.orgId];
  let idx = 2;

  if (job_id) { where += ` AND s.job_id = $${idx++}`; params.push(job_id); }
  if (stage)  { where += ` AND s.stage = $${idx++}`; params.push(stage); }

  const { rows } = await db.query(
    `SELECT s.*,
       j.title as job_title,
       c.title as candidate_title, c.skills, c.years_of_experience,
       c.location_city, c.visa_status, c.expected_rate_min, c.expected_rate_max,
       -- Anonymized unless unlocked
       CASE WHEN s.profile_unlocked THEN c.first_name ELSE 'Candidate' END as first_name,
       CASE WHEN s.profile_unlocked THEN c.last_name  ELSE '#' || SUBSTRING(c.id::text,1,6) END as last_name,
       CASE WHEN s.profile_unlocked THEN c.email      ELSE NULL END as email,
       CASE WHEN s.profile_unlocked THEN c.phone      ELSE NULL END as phone,
       m.overall_score as match_score,
       v.name as vendor_name
     FROM submissions s
     JOIN jobs j ON j.id = s.job_id
     JOIN candidates c ON c.id = s.candidate_id
     LEFT JOIN ai_matches m ON m.id = s.match_id
     LEFT JOIN organizations v ON v.id = c.vendor_org_id
     WHERE ${where}
     ORDER BY s.created_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    [...params, limit, offset]
  );

  res.json({ submissions: rows, total: rows.length });
});

// PATCH /api/submissions/:id/stage — move pipeline stage
router.patch('/:id/stage', requirePermission('MANAGE_PIPELINE'), async (req, res) => {
  const { stage, notes } = req.body;

  if (!VALID_STAGES.includes(stage)) {
    return res.status(400).json({ error: `Invalid stage. Valid: ${VALID_STAGES.join(', ')}` });
  }

  const { rows: [current] } = await db.query(
    'SELECT * FROM submissions WHERE id = $1 AND org_id = $2',
    [req.params.id, req.orgId]
  );
  if (!current) return res.status(404).json({ error: 'Submission not found' });

  // Record history
  await db.query(
    `INSERT INTO pipeline_history (submission_id, from_stage, to_stage, changed_by, notes)
     VALUES ($1, $2, $3, $4, $5)`,
    [current.id, current.stage, stage, req.user.id, notes]
  );

  const { rows: [updated] } = await db.query(
    'UPDATE submissions SET stage = $1 WHERE id = $2 RETURNING *',
    [stage, current.id]
  );

  res.json(updated);
});

// POST /api/submissions/:id/unlock — unlock anonymized profile
router.post('/:id/unlock', requirePermission('UNLOCK_CANDIDATE'), async (req, res) => {
  const { rows: [updated] } = await db.query(
    `UPDATE submissions SET profile_unlocked = true, unlocked_by = $1, unlocked_at = NOW()
     WHERE id = $2 AND org_id = $3 RETURNING *`,
    [req.user.id, req.params.id, req.orgId]
  );
  if (!updated) return res.status(404).json({ error: 'Submission not found' });
  res.json({ message: 'Profile unlocked', submission: updated });
});

export default router;
