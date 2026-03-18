import { Router } from 'express';
import { db } from '../config/database.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { embeddingService } from '../services/ai/embeddingService.js';
import { matchingEngine } from '../services/matching/matchingEngine.js';
import { supplyPredictor } from '../services/ai/supplyPredictor.js';

const router = Router();
router.use(authenticate);

// GET /api/jobs
router.get('/', requirePermission('VIEW_JOBS'), async (req, res) => {
  const { status, page = 1, limit = 20, search } = req.query;
  const offset = (page - 1) * limit;

  let where = `j.org_id = $1`;
  const params = [req.orgId];
  let paramIdx = 2;

  if (status) { where += ` AND j.status = $${paramIdx++}`; params.push(status); }
  if (search) { where += ` AND (j.title ILIKE $${paramIdx} OR j.description ILIKE $${paramIdx})`; params.push(`%${search}%`); paramIdx++; }

  const { rows: jobs } = await db.query(
    `SELECT j.*,
       c.name as client_name, ec.name as end_client_name,
       u.first_name || ' ' || u.last_name as created_by_name,
       (SELECT COUNT(*) FROM submissions s WHERE s.job_id = j.id) as submission_count,
       (SELECT COUNT(*) FROM ai_matches m WHERE m.job_id = j.id) as match_count
     FROM jobs j
     LEFT JOIN organizations c ON c.id = j.client_org_id
     LEFT JOIN organizations ec ON ec.id = j.end_client_org_id
     LEFT JOIN users u ON u.id = j.created_by
     WHERE ${where}
     ORDER BY j.created_at DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
    [...params, limit, offset]
  );

  const { rows: [{ count }] } = await db.query(
    `SELECT COUNT(*) FROM jobs j WHERE ${where}`,
    params
  );

  res.json({ jobs, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/jobs/:id
router.get('/:id', requirePermission('VIEW_JOBS'), async (req, res) => {
  const { rows } = await db.query(
    `SELECT j.*,
       c.name as client_name, ec.name as end_client_name,
       u.first_name || ' ' || u.last_name as created_by_name
     FROM jobs j
     LEFT JOIN organizations c ON c.id = j.client_org_id
     LEFT JOIN organizations ec ON ec.id = j.end_client_org_id
     LEFT JOIN users u ON u.id = j.created_by
     WHERE j.id = $1 AND j.org_id = $2`,
    [req.params.id, req.orgId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Job not found' });
  res.json(rows[0]);
});

// POST /api/jobs
router.post('/', requirePermission('CREATE_JOB'), async (req, res) => {
  const {
    title, description, required_skills, nice_to_have_skills,
    experience_min, experience_max, location_city, location_state,
    location_country, remote_allowed, visa_requirements, pay_rate_min,
    pay_rate_max, rate_type, job_type, industry, client_org_id, end_client_org_id, deadline
  } = req.body;

  if (!title) return res.status(400).json({ error: 'Job title is required' });

  const { rows } = await db.query(
    `INSERT INTO jobs (
       org_id, created_by, title, description, required_skills, nice_to_have_skills,
       experience_min, experience_max, location_city, location_state, location_country,
       remote_allowed, visa_requirements, pay_rate_min, pay_rate_max, rate_type, job_type,
       industry, client_org_id, end_client_org_id, deadline, status
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,'open')
     RETURNING *`,
    [
      req.orgId, req.user.id, title, description,
      required_skills || [], nice_to_have_skills || [],
      experience_min, experience_max, location_city, location_state, location_country || 'US',
      remote_allowed || false, visa_requirements || [], pay_rate_min, pay_rate_max,
      rate_type || 'hourly', job_type || 'contract', industry || [], client_org_id, end_client_org_id, deadline
    ]
  );

  const job = rows[0];

  // Async: generate embedding + supply prediction
  setImmediate(async () => {
    try {
      const embedding = await embeddingService.generateJobEmbedding(job);
      if (embedding) {
        await db.query('UPDATE jobs SET job_embedding = $1 WHERE id = $2', [JSON.stringify(embedding), job.id]);
      }
      const supply = await supplyPredictor.predict(job, req.orgId);
      await db.query('UPDATE jobs SET supply_level = $1, supply_analysis = $2 WHERE id = $3',
        [supply.level, JSON.stringify(supply), job.id]);
    } catch (err) {
      console.error('Background job processing error:', err.message);
    }
  });

  res.status(201).json(job);
});

// PATCH /api/jobs/:id
router.patch('/:id', requirePermission('EDIT_JOB'), async (req, res) => {
  const allowed = ['title','description','required_skills','nice_to_have_skills',
    'experience_min','experience_max','location_city','location_state','remote_allowed',
    'visa_requirements','pay_rate_min','pay_rate_max','rate_type','job_type','industry','status','deadline'];

  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields to update' });

  const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`);
  const vals = Object.values(updates);

  const { rows } = await db.query(
    `UPDATE jobs SET ${sets.join(', ')} WHERE id = $1 AND org_id = $${vals.length + 2} RETURNING *`,
    [req.params.id, ...vals, req.orgId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Job not found' });
  res.json(rows[0]);
});

// POST /api/jobs/:id/match — trigger AI matching
router.post('/:id/match', requirePermission('RUN_MATCHING'), async (req, res) => {
  const { rows } = await db.query('SELECT * FROM jobs WHERE id = $1 AND org_id = $2', [req.params.id, req.orgId]);
  if (!rows.length) return res.status(404).json({ error: 'Job not found' });

  const job = rows[0];
  await db.query(`UPDATE jobs SET status = 'matching' WHERE id = $1`, [job.id]);

  // Run matching async and return immediately
  setImmediate(() => matchingEngine.matchJobToCandidates(job, req.orgId).catch(console.error));

  res.json({ message: 'Matching started', jobId: job.id });
});

// GET /api/jobs/:id/matches
router.get('/:id/matches', requirePermission('VIEW_MATCHES'), async (req, res) => {
  const { limit = 20, min_score = 0.3 } = req.query;

  const { rows } = await db.query(
    `SELECT m.*,
       c.title as candidate_title, c.skills, c.years_of_experience,
       c.location_city, c.location_state, c.visa_status,
       c.expected_rate_min, c.expected_rate_max,
       c.industry_experience, c.availability_date,
       -- Anonymized by default
       CASE WHEN m.is_reviewed THEN c.first_name ELSE 'Candidate' END as first_name,
       CASE WHEN m.is_reviewed THEN c.last_name  ELSE '#' || SUBSTRING(c.id::text, 1, 6) END as last_name
     FROM ai_matches m
     JOIN candidates c ON c.id = m.candidate_id
     WHERE m.job_id = $1 AND m.overall_score >= $2
     ORDER BY m.overall_score DESC
     LIMIT $3`,
    [req.params.id, min_score, limit]
  );

  res.json(rows);
});

export default router;
