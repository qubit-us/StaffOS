// Client portal routes — used by client org users to manage their requirements,
// view submitted candidates, and approve/reject them.

import { Router } from 'express';
import { db } from '../config/database.js';
import { authenticate, requirePermission, requireOrgType } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.use(requireOrgType('client'));

// ============================================================
// DASHBOARD
// ============================================================

// GET /api/client-portal/me — returns client code for this org
router.get('/me', requirePermission('VIEW_CLIENT_PORTAL'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT cr.client_code, cr.agency_org_id, o.name as agency_name
       FROM client_relationships cr
       JOIN organizations o ON o.id = cr.agency_org_id
       WHERE cr.client_org_id = $1
       LIMIT 1`,
      [req.orgId]
    );
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/client-portal/dashboard
router.get('/dashboard', requirePermission('VIEW_CLIENT_PORTAL'), async (req, res) => {
  try {
    const [jobs, submissions, pendingReviews, approved] = await Promise.all([
      db.query(
        `SELECT COUNT(*) FROM jobs WHERE client_org_id = $1 AND status NOT IN ('closed','filled')`,
        [req.orgId]
      ),
      db.query(
        `SELECT COUNT(*) FROM submissions s
         JOIN jobs j ON j.id = s.job_id
         WHERE j.client_org_id = $1`,
        [req.orgId]
      ),
      db.query(
        `SELECT COUNT(*) FROM submissions s
         JOIN jobs j ON j.id = s.job_id
         WHERE j.client_org_id = $1 AND s.client_status = 'pending_review'`,
        [req.orgId]
      ),
      db.query(
        `SELECT COUNT(*) FROM submissions s
         JOIN jobs j ON j.id = s.job_id
         WHERE j.client_org_id = $1 AND s.client_status = 'approved'`,
        [req.orgId]
      ),
    ]);

    // Recent submissions pending review
    const { rows: recentPending } = await db.query(
      `SELECT s.id, s.client_status, s.created_at,
              j.title as job_title, j.location_city, j.location_state,
              c.title as candidate_title, c.skills, c.years_of_experience,
              c.visa_status, c.expected_rate_min, c.expected_rate_max,
              CASE WHEN s.profile_unlocked THEN c.first_name ELSE 'Candidate' END as first_name,
              CASE WHEN s.profile_unlocked THEN c.last_name ELSE '#' || SUBSTRING(c.id::text,1,6) END as last_name
       FROM submissions s
       JOIN jobs j ON j.id = s.job_id
       JOIN candidates c ON c.id = s.candidate_id
       WHERE j.client_org_id = $1 AND s.client_status = 'pending_review'
       ORDER BY s.created_at DESC LIMIT 5`,
      [req.orgId]
    );

    res.json({
      stats: {
        open_requirements: parseInt(jobs.rows[0].count),
        total_submissions: parseInt(submissions.rows[0].count),
        pending_review: parseInt(pendingReviews.rows[0].count),
        approved: parseInt(approved.rows[0].count),
      },
      recent_pending: recentPending,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// REQUIREMENTS (Jobs posted for this client)
// ============================================================

// GET /api/client-portal/requirements
router.get('/requirements', requirePermission('VIEW_CLIENT_PORTAL'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (page - 1) * limit;

    let where = `j.client_org_id = $1`;
    const params = [req.orgId];
    let idx = 2;

    if (status) { where += ` AND j.status = $${idx++}`; params.push(status); }
    if (search) { where += ` AND j.title ILIKE $${idx++}`; params.push(`%${search}%`); }

    const { rows } = await db.query(
      `SELECT j.id, j.title, j.status, j.location_city, j.location_state, j.remote_allowed,
              j.client_bill_rate, j.positions_count, j.start_date, j.client_poc,
              j.is_carry_forward, j.required_skills, j.visa_requirements,
              j.experience_min, j.experience_max, j.deadline, j.created_at,
              j.rate_type, j.job_type,
              o.name as agency_name,
              (SELECT COUNT(*) FROM submissions s WHERE s.job_id = j.id) as submission_count,
              (SELECT COUNT(*) FROM submissions s WHERE s.job_id = j.id AND s.client_status = 'pending_review') as pending_review_count,
              (SELECT COUNT(*) FROM submissions s WHERE s.job_id = j.id AND s.client_status = 'approved') as approved_count
       FROM jobs j
       JOIN organizations o ON o.id = j.org_id
       WHERE ${where}
       ORDER BY j.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    );

    const { rows: [{ count }] } = await db.query(
      `SELECT COUNT(*) FROM jobs j WHERE ${where}`, params
    );

    res.json({ requirements: rows, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/client-portal/requirements/:id
router.get('/requirements/:id', requirePermission('VIEW_CLIENT_PORTAL'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT j.*, o.name as agency_name,
              (SELECT COUNT(*) FROM submissions s WHERE s.job_id = j.id) as submission_count
       FROM jobs j
       JOIN organizations o ON o.id = j.org_id
       WHERE j.id = $1 AND j.client_org_id = $2`,
      [req.params.id, req.orgId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Requirement not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/client-portal/requirements — client creates a new requirement
router.post('/requirements', requirePermission('CREATE_REQUIREMENT'), async (req, res) => {
  try {
    const {
      title, description, required_skills, nice_to_have_skills,
      experience_min, experience_max, location_city, location_state,
      location_country, remote_allowed, visa_requirements,
      client_bill_rate, positions_count, start_date, client_poc,
      is_carry_forward, rate_type, job_type, deadline, agency_org_id
    } = req.body;

    if (!title) return res.status(400).json({ error: 'Job title is required' });
    if (!agency_org_id) return res.status(400).json({ error: 'Agency org ID is required' });

    // Verify agency has a relationship with this client
    const { rows: rel } = await db.query(
      `SELECT 1 FROM client_relationships
       WHERE agency_org_id = $1 AND client_org_id = $2 AND status = 'active'`,
      [agency_org_id, req.orgId]
    );
    if (!rel.length) return res.status(403).json({ error: 'No active relationship with this agency' });

    const { rows } = await db.query(
      `INSERT INTO jobs (
         org_id, client_org_id, title, description, required_skills, nice_to_have_skills,
         experience_min, experience_max, location_city, location_state, location_country,
         remote_allowed, visa_requirements, client_bill_rate, positions_count, start_date,
         client_poc, is_carry_forward, rate_type, job_type, deadline, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,'open')
       RETURNING *`,
      [
        agency_org_id, req.orgId, title, description,
        required_skills || [], nice_to_have_skills || [],
        experience_min, experience_max, location_city, location_state, location_country || 'US',
        remote_allowed || false, visa_requirements || [],
        client_bill_rate, positions_count || 1, start_date,
        client_poc, is_carry_forward || false, rate_type || 'hourly',
        job_type || 'contract', deadline
      ]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// SUBMISSIONS (Candidates submitted by the agency)
// ============================================================

// GET /api/client-portal/submissions
router.get('/submissions', requirePermission('VIEW_SUBMISSIONS'), async (req, res) => {
  try {
    const { page = 1, limit = 20, client_status, job_id, search } = req.query;
    const offset = (page - 1) * limit;

    let where = `j.client_org_id = $1`;
    const params = [req.orgId];
    let idx = 2;

    if (client_status) { where += ` AND s.client_status = $${idx++}`; params.push(client_status); }
    if (job_id) { where += ` AND s.job_id = $${idx++}`; params.push(job_id); }
    if (search) {
      where += ` AND (j.title ILIKE $${idx} OR c.title ILIKE $${idx})`;
      params.push(`%${search}%`); idx++;
    }

    const { rows } = await db.query(
      `SELECT s.id, s.stage, s.client_status, s.client_feedback, s.sub_rate,
              s.profile_unlocked, s.created_at as submitted_at,
              s.client_reviewed_at,
              j.id as job_id, j.title as job_title, j.location_city, j.location_state,
              j.client_bill_rate, j.start_date, j.job_type,
              c.id as candidate_id, c.title as candidate_title, c.skills, c.years_of_experience,
              c.visa_status, c.expected_rate_min, c.expected_rate_max,
              c.location_city as candidate_city, c.location_state as candidate_state,
              CASE WHEN s.profile_unlocked THEN c.first_name ELSE 'Candidate' END as first_name,
              CASE WHEN s.profile_unlocked THEN c.last_name ELSE '#' || SUBSTRING(c.id::text,1,6) END as last_name,
              u.first_name || ' ' || u.last_name as submitted_by_name
       FROM submissions s
       JOIN jobs j ON j.id = s.job_id
       JOIN candidates c ON c.id = s.candidate_id
       LEFT JOIN users u ON u.id = s.submitted_by
       WHERE ${where}
       ORDER BY s.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    );

    const { rows: [{ count }] } = await db.query(
      `SELECT COUNT(*) FROM submissions s
       JOIN jobs j ON j.id = s.job_id WHERE ${where}`,
      params
    );

    res.json({ submissions: rows, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/client-portal/submissions/:id
router.get('/submissions/:id', requirePermission('VIEW_SUBMISSIONS'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.*, j.title as job_title, j.client_bill_rate, j.location_city, j.location_state,
              j.required_skills, j.visa_requirements, j.start_date, j.job_type,
              c.title as candidate_title, c.skills, c.years_of_experience, c.visa_status,
              c.expected_rate_min, c.expected_rate_max, c.location_city as candidate_city,
              c.location_state as candidate_state, c.summary, c.companies_worked,
              c.education, c.certifications, c.languages,
              CASE WHEN s.profile_unlocked THEN c.first_name ELSE 'Candidate' END as first_name,
              CASE WHEN s.profile_unlocked THEN c.last_name ELSE '#' || SUBSTRING(c.id::text,1,6) END as last_name,
              CASE WHEN s.profile_unlocked THEN c.email ELSE NULL END as email,
              CASE WHEN s.profile_unlocked THEN c.phone ELSE NULL END as phone,
              u.first_name || ' ' || u.last_name as submitted_by_name
       FROM submissions s
       JOIN jobs j ON j.id = s.job_id
       JOIN candidates c ON c.id = s.candidate_id
       LEFT JOIN users u ON u.id = s.submitted_by
       WHERE s.id = $1 AND j.client_org_id = $2`,
      [req.params.id, req.orgId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Submission not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/client-portal/requirements/:id — edit requirement
router.patch('/requirements/:id', requirePermission('EDIT_REQUIREMENT'), async (req, res) => {
  try {
    const { rows: [job] } = await db.query(
      `SELECT id, status FROM jobs WHERE id = $1 AND client_org_id = $2`,
      [req.params.id, req.orgId]
    );
    if (!job) return res.status(404).json({ error: 'Requirement not found' });
    if (['closed', 'filled'].includes(job.status)) {
      return res.status(400).json({ error: 'Cannot edit a closed or filled requirement' });
    }

    const allowed = [
      'title', 'description', 'required_skills', 'nice_to_have_skills',
      'experience_min', 'experience_max', 'location_city', 'location_state',
      'location_country', 'remote_allowed', 'visa_requirements',
      'client_bill_rate', 'positions_count', 'start_date', 'client_poc',
      'is_carry_forward', 'rate_type', 'job_type', 'deadline',
    ];
    const updates = Object.fromEntries(
      allowed.map(k => [k, req.body[k]]).filter(([, v]) => v !== undefined)
    );
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No fields to update' });

    const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`);
    const { rows } = await db.query(
      `UPDATE jobs SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
      [req.params.id, ...Object.values(updates)]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/client-portal/requirements/:id/close — close a requirement
router.patch('/requirements/:id/close', requirePermission('EDIT_REQUIREMENT'), async (req, res) => {
  try {
    const { rows: [job] } = await db.query(
      `SELECT id, status FROM jobs WHERE id = $1 AND client_org_id = $2`,
      [req.params.id, req.orgId]
    );
    if (!job) return res.status(404).json({ error: 'Requirement not found' });
    if (job.status === 'closed') return res.status(400).json({ error: 'Already closed' });

    const { rows } = await db.query(
      `UPDATE jobs SET status = 'closed' WHERE id = $1 RETURNING id, title, status`,
      [req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/client-portal/submissions/:id/review — approve/reject/request interview
router.patch('/submissions/:id/review', requirePermission('APPROVE_CANDIDATE'), async (req, res) => {
  try {
    const { client_status, client_feedback } = req.body;

    const validStatuses = ['pending_review', 'under_review', 'approved', 'rejected', 'interview_requested'];
    if (!validStatuses.includes(client_status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Verify this submission belongs to a job for this client
    const { rows: check } = await db.query(
      `SELECT s.id FROM submissions s
       JOIN jobs j ON j.id = s.job_id
       WHERE s.id = $1 AND j.client_org_id = $2`,
      [req.params.id, req.orgId]
    );
    if (!check.length) return res.status(404).json({ error: 'Submission not found' });

    const { rows } = await db.query(
      `UPDATE submissions
       SET client_status = $1, client_feedback = $2,
           client_reviewed_by = $3, client_reviewed_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [client_status, client_feedback, req.user.id, req.params.id]
    );

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
