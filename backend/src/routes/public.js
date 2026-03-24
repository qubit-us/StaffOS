// Public routes — no authentication required
// Used by the public-facing job board for browsing and self-applying

import { Router } from 'express';
import { db } from '../config/database.js';
import bcrypt from 'bcryptjs';

const router = Router();

const PUBLIC_ORG_ID = '00000000-0000-0000-0000-000000000099';

// ============================================================
// PUBLIC JOB LISTINGS
// ============================================================

// GET /api/public/jobs — browse all public jobs (no auth)
router.get('/jobs', async (req, res) => {
  try {
    const { search, skills, location, job_type, visa, remote, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let where = `j.is_public = true AND j.status = 'open'`;
    const params = [];
    let idx = 1;

    if (search) {
      where += ` AND (j.title ILIKE $${idx} OR j.description ILIKE $${idx})`;
      params.push(`%${search}%`); idx++;
    }
    if (location) {
      where += ` AND (j.location_city ILIKE $${idx} OR j.location_state ILIKE $${idx})`;
      params.push(`%${location}%`); idx++;
    }
    if (job_type) { where += ` AND j.job_type = $${idx++}`; params.push(job_type); }
    if (remote === 'true') { where += ` AND j.remote_allowed = true`; }

    const { rows } = await db.query(
      `SELECT j.id, j.title, j.description, j.location_city, j.location_state,
              j.location_country, j.remote_allowed, j.job_type, j.rate_type,
              j.experience_min, j.experience_max, j.required_skills,
              j.nice_to_have_skills, j.visa_requirements, j.start_date,
              j.deadline, j.created_at,
              o.name as agency_name, o.logo_url as agency_logo
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

    res.json({ jobs: rows, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/jobs/:id — single job detail (no auth)
router.get('/jobs/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT j.id, j.title, j.description, j.location_city, j.location_state,
              j.location_country, j.remote_allowed, j.job_type, j.rate_type,
              j.experience_min, j.experience_max, j.required_skills,
              j.nice_to_have_skills, j.visa_requirements, j.start_date,
              j.deadline, j.created_at, j.positions_count,
              o.name as agency_name, o.logo_url as agency_logo, o.website as agency_website
       FROM jobs j
       JOIN organizations o ON o.id = j.org_id
       WHERE j.id = $1 AND j.is_public = true AND j.status = 'open'`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Job not found or no longer available' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// SELF-REGISTRATION & APPLICATION
// ============================================================

// POST /api/public/register — self-register as a candidate
router.post('/register', async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const {
      first_name, last_name, email, password,
      phone, title, location_city, location_state,
      visa_status, years_of_experience, skills,
      expected_rate_min, expected_rate_max,
    } = req.body;

    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (!first_name || !last_name) return res.status(400).json({ error: 'Name is required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    // Check email not already used
    const { rows: existing } = await client.query(
      `SELECT id FROM users WHERE email = $1`, [email]
    );
    if (existing.length) return res.status(409).json({ error: 'An account with this email already exists' });

    // Create user under the public org
    const passwordHash = await bcrypt.hash(password, 12);
    const { rows: [user] } = await client.query(
      `INSERT INTO users (org_id, email, password_hash, first_name, last_name, email_verified)
       VALUES ($1, $2, $3, $4, $5, false) RETURNING id, email, first_name, last_name`,
      [PUBLIC_ORG_ID, email, passwordHash, first_name, last_name]
    );

    // Create their candidate profile
    const { rows: [candidate] } = await client.query(
      `INSERT INTO candidates (
         org_id, submitted_by_user_id, upload_source,
         first_name, last_name, email, phone, title,
         location_city, location_state, visa_status,
         years_of_experience, skills,
         expected_rate_min, expected_rate_max
       ) VALUES ($1,$2,'self_applied',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [
        PUBLIC_ORG_ID, user.id,
        first_name, last_name, email, phone || null, title || null,
        location_city || null, location_state || null,
        visa_status || 'unknown',
        years_of_experience || null,
        skills || [],
        expected_rate_min || null, expected_rate_max || null,
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name },
      candidate_id: candidate.id,
      message: 'Account created successfully. You can now apply to jobs.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/public/apply — apply to a job (requires basic auth via token in body or header)
router.post('/apply', async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { job_id, candidate_id, cover_note, expected_rate } = req.body;

    if (!job_id || !candidate_id) {
      return res.status(400).json({ error: 'job_id and candidate_id are required' });
    }

    // Verify the job is public and open
    const { rows: [job] } = await client.query(
      `SELECT id, org_id, title FROM jobs WHERE id = $1 AND is_public = true AND status = 'open'`,
      [job_id]
    );
    if (!job) return res.status(404).json({ error: 'Job not found or no longer accepting applications' });

    // Verify candidate exists and belongs to public org
    const { rows: [candidate] } = await client.query(
      `SELECT id, first_name, last_name FROM candidates WHERE id = $1 AND org_id = $2`,
      [candidate_id, PUBLIC_ORG_ID]
    );
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    // Duplicate check — same candidate, same job
    const { rows: dup } = await client.query(
      `SELECT id FROM submissions WHERE job_id = $1 AND candidate_id = $2`,
      [job_id, candidate_id]
    );
    if (dup.length) {
      return res.status(409).json({ error: 'You have already applied to this job' });
    }

    // Create the submission
    const { rows: [submission] } = await client.query(
      `INSERT INTO submissions (
         job_id, candidate_id, org_id,
         submission_source, internal_stage,
         agency_pay_rate, stage_notes,
         is_anonymized, profile_unlocked
       ) VALUES ($1, $2, $3, 'self_applied', 'new', $4, $5, false, false)
       RETURNING id`,
      [job_id, candidate_id, job.org_id, expected_rate || null, cover_note || null]
    );

    await client.query('COMMIT');

    res.status(201).json({
      submission_id: submission.id,
      message: `Successfully applied to "${job.title}". The agency will review your application.`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;
