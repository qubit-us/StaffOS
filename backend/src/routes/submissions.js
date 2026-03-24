import { Router } from 'express';
import { db } from '../config/database.js';
import { authenticate, requirePermission } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const VALID_CLIENT_STAGES  = ['submitted','client_review','shortlisted','interview_r1','interview_r2','offer','placed','rejected','withdrawn'];
const VALID_INTERNAL_STAGES = ['new','screening','validated','on_hold','rejected_internal'];

// GET /api/submissions
router.get('/', requirePermission('VIEW_PIPELINE'), async (req, res) => {
  try {
    const { job_id, stage, internal_stage, source, vendor_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const canViewRates = req.user.org_type === 'staffing_agency';

    let where = `s.org_id = $1`;
    const params = [req.orgId];
    let idx = 2;

    if (job_id)         { where += ` AND s.job_id = $${idx++}`;           params.push(job_id); }
    if (stage)          { where += ` AND s.stage = $${idx++}`;             params.push(stage); }
    if (internal_stage) { where += ` AND s.internal_stage = $${idx++}`;    params.push(internal_stage); }
    if (source)         { where += ` AND s.submission_source = $${idx++}`;  params.push(source); }
    if (vendor_id)      { where += ` AND s.vendor_org_id = $${idx++}`;     params.push(vendor_id); }

    // Vendors only see their own submissions
    if (req.user.org_type === 'vendor') {
      where += ` AND s.vendor_org_id = $${idx++}`;
      params.push(req.orgId);
    }

    const { rows } = await db.query(
      `SELECT s.id, s.job_id, s.candidate_id, s.stage, s.internal_stage,
              s.internal_stage_notes, s.submission_source, s.client_status,
              s.profile_unlocked, s.is_anonymized, s.created_at,
              s.vendor_org_id,
              -- Rates: only show to agency
              ${canViewRates ? 's.agency_pay_rate, s.vendor_pay_rate,' : ''}
              j.title as job_title, j.client_bill_rate,
              c.title as candidate_title, c.skills, c.years_of_experience,
              c.location_city, c.location_state, c.visa_status,
              c.expected_rate_min, c.expected_rate_max,
              CASE WHEN s.profile_unlocked THEN c.first_name ELSE 'Candidate' END as first_name,
              CASE WHEN s.profile_unlocked THEN c.last_name  ELSE '#' || SUBSTRING(c.id::text,1,6) END as last_name,
              CASE WHEN s.profile_unlocked THEN c.email      ELSE NULL END as email,
              CASE WHEN s.profile_unlocked THEN c.phone      ELSE NULL END as phone,
              m.overall_score as match_score,
              v.name as vendor_name,
              u.first_name || ' ' || u.last_name as submitted_by_name
       FROM submissions s
       JOIN jobs j ON j.id = s.job_id
       JOIN candidates c ON c.id = s.candidate_id
       LEFT JOIN ai_matches m ON m.id = s.match_id
       LEFT JOIN organizations v ON v.id = s.vendor_org_id
       LEFT JOIN users u ON u.id = s.submitted_by
       WHERE ${where}
       ORDER BY s.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    );

    const { rows: [{ count }] } = await db.query(
      `SELECT COUNT(*) FROM submissions s WHERE ${where}`, params
    );

    res.json({ submissions: rows, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/submissions — create a new submission (agency or vendor)
router.post('/', requirePermission('SUBMIT_CANDIDATE'), async (req, res) => {
  try {
    const {
      job_id, candidate_id,
      agency_pay_rate, vendor_pay_rate,
      stage_notes, vendor_org_id,
    } = req.body;

    if (!job_id || !candidate_id) {
      return res.status(400).json({ error: 'job_id and candidate_id are required' });
    }

    // Verify job belongs to this org
    const { rows: [job] } = await db.query(
      `SELECT id FROM jobs WHERE id = $1 AND org_id = $2`, [job_id, req.orgId]
    );
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Duplicate check
    const { rows: dup } = await db.query(
      `SELECT id FROM submissions WHERE job_id = $1 AND candidate_id = $2`, [job_id, candidate_id]
    );
    if (dup.length) return res.status(409).json({ error: 'This candidate has already been submitted to this job' });

    // Determine source
    const submission_source = vendor_org_id ? 'vendor_submitted' : 'agency_direct';

    const { rows: [submission] } = await db.query(
      `INSERT INTO submissions (
         job_id, candidate_id, org_id, submitted_by,
         submission_source, vendor_org_id,
         agency_pay_rate, vendor_pay_rate,
         internal_stage, stage_notes,
         is_anonymized, profile_unlocked
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'new',$9, true, false)
       RETURNING *`,
      [
        job_id, candidate_id, req.orgId, req.user.id,
        submission_source, vendor_org_id || null,
        agency_pay_rate || null, vendor_pay_rate || null,
        stage_notes || null,
      ]
    );

    res.status(201).json(submission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/submissions/:id/internal-stage — agency moves internal screening stage
router.patch('/:id/internal-stage', requirePermission('SCREEN_CANDIDATE'), async (req, res) => {
  try {
    const { internal_stage, notes } = req.body;

    if (!VALID_INTERNAL_STAGES.includes(internal_stage)) {
      return res.status(400).json({ error: `Invalid stage. Valid: ${VALID_INTERNAL_STAGES.join(', ')}` });
    }

    const { rows: [current] } = await db.query(
      `SELECT * FROM submissions WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.orgId]
    );
    if (!current) return res.status(404).json({ error: 'Submission not found' });

    // Only validated candidates can be submitted to client
    // (client_status resets to pending_review if re-validated)
    const { rows: [updated] } = await db.query(
      `UPDATE submissions
       SET internal_stage = $1,
           internal_stage_notes = $2,
           internal_stage_updated_by = $3,
           internal_stage_updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [internal_stage, notes || null, req.user.id, current.id]
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/submissions/:id/stage — move client-facing pipeline stage
// Only allowed when internal_stage = 'validated'
router.patch('/:id/stage', requirePermission('MANAGE_PIPELINE'), async (req, res) => {
  try {
    const { stage, notes } = req.body;

    if (!VALID_CLIENT_STAGES.includes(stage)) {
      return res.status(400).json({ error: `Invalid stage. Valid: ${VALID_CLIENT_STAGES.join(', ')}` });
    }

    const { rows: [current] } = await db.query(
      `SELECT * FROM submissions WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.orgId]
    );
    if (!current) return res.status(404).json({ error: 'Submission not found' });

    if (current.internal_stage !== 'validated') {
      return res.status(400).json({
        error: `Candidate must be internally validated before moving to client pipeline. Current internal stage: ${current.internal_stage}`
      });
    }

    await db.query(
      `INSERT INTO pipeline_history (submission_id, from_stage, to_stage, changed_by, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [current.id, current.stage, stage, req.user.id, notes]
    );

    const { rows: [updated] } = await db.query(
      `UPDATE submissions SET stage = $1, stage_notes = $2 WHERE id = $3 RETURNING *`,
      [stage, notes || null, current.id]
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/submissions/:id/rates — update rate fields (agency only)
router.patch('/:id/rates', requirePermission('MANAGE_RATES'), async (req, res) => {
  try {
    const { agency_pay_rate, vendor_pay_rate } = req.body;
    const { rows: [updated] } = await db.query(
      `UPDATE submissions SET agency_pay_rate = $1, vendor_pay_rate = $2
       WHERE id = $3 AND org_id = $4 RETURNING id, agency_pay_rate, vendor_pay_rate`,
      [agency_pay_rate, vendor_pay_rate, req.params.id, req.orgId]
    );
    if (!updated) return res.status(404).json({ error: 'Submission not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/submissions/:id/unlock
router.post('/:id/unlock', requirePermission('UNLOCK_CANDIDATE'), async (req, res) => {
  try {
    const { rows: [updated] } = await db.query(
      `UPDATE submissions SET profile_unlocked = true, unlocked_by = $1, unlocked_at = NOW()
       WHERE id = $2 AND org_id = $3 RETURNING *`,
      [req.user.id, req.params.id, req.orgId]
    );
    if (!updated) return res.status(404).json({ error: 'Submission not found' });
    res.json({ message: 'Profile unlocked', submission: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
