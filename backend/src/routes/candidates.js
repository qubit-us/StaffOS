import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { db } from '../config/database.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { resumeParser } from '../services/ai/resumeParser.js';
import { duplicateDetector } from '../services/ai/duplicateDetector.js';

const router = Router();
router.use(authenticate);

const storage = multer.diskStorage({
  destination: './uploads/resumes',
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `resume-${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = ['.pdf', '.docx', '.doc'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// GET /api/candidates
router.get('/', requirePermission('VIEW_CANDIDATES'), async (req, res) => {
  const { page = 1, limit = 20, search, skills, visa_status, source } = req.query;
  const offset = (page - 1) * limit;

  let where = `c.org_id = $1`;
  const params = [req.orgId];
  let idx = 2;

  if (search) {
    where += ` AND (c.first_name ILIKE $${idx} OR c.last_name ILIKE $${idx} OR c.title ILIKE $${idx} OR c.email ILIKE $${idx})`;
    params.push(`%${search}%`); idx++;
  }
  if (skills) {
    where += ` AND c.skills && $${idx}`;
    params.push(`{${skills}}`); idx++;
  }
  if (visa_status) { where += ` AND c.visa_status = $${idx++}`; params.push(visa_status); }
  if (source) { where += ` AND c.upload_source = $${idx++}`; params.push(source); }

  const { rows } = await db.query(
    `SELECT c.id, c.title, c.skills, c.years_of_experience, c.location_city, c.location_state,
       c.visa_status, c.expected_rate_min, c.expected_rate_max, c.availability_date,
       c.upload_source, c.vendor_org_id, c.created_at, c.profile_completeness,
       c.industry_experience, c.is_active,
       c.first_name, c.last_name,
       v.name as vendor_name
     FROM candidates c
     LEFT JOIN organizations v ON v.id = c.vendor_org_id
     WHERE ${where}
     ORDER BY c.created_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    [...params, limit, offset]
  );

  const { rows: [{ count }] } = await db.query(
    `SELECT COUNT(*) FROM candidates c WHERE ${where}`, params
  );

  res.json({ candidates: rows, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/candidates/:id
router.get('/:id', requirePermission('VIEW_CANDIDATES'), async (req, res) => {
  const { rows } = await db.query(
    `SELECT c.*, v.name as vendor_name, u.first_name || ' ' || u.last_name as submitted_by_name
     FROM candidates c
     LEFT JOIN organizations v ON v.id = c.vendor_org_id
     LEFT JOIN users u ON u.id = c.submitted_by_user_id
     WHERE c.id = $1 AND c.org_id = $2`,
    [req.params.id, req.orgId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Candidate not found' });
  res.json(rows[0]);
});

// POST /api/candidates/upload — resume upload + AI parse
router.post('/upload', requirePermission('UPLOAD_RESUME'), upload.single('resume'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No resume file uploaded' });

  const { vendor_org_id, source = 'recruiter' } = req.body;

  // Save file record
  const { rows: [fileRecord] } = await db.query(
    `INSERT INTO resume_files (org_id, uploaded_by, file_name, file_path, file_size, mime_type)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [req.orgId, req.user.id, req.file.originalname, req.file.path, req.file.size, req.file.mimetype]
  );

  // Parse resume with AI
  let parsedProfile = {};
  let parseError = null;
  try {
    parsedProfile = await resumeParser.parse(req.file.path, req.file.mimetype);
  } catch (err) {
    parseError = err.message;
  }

  // Detect duplicates
  const duplicateCheck = await duplicateDetector.check(parsedProfile, req.orgId);

  // Create candidate profile
  const { rows: [candidate] } = await db.query(
    `INSERT INTO candidates (
       org_id, submitted_by_user_id, vendor_org_id, upload_source,
       first_name, last_name, email, phone, linkedin_url,
       title, summary, skills, years_of_experience, companies_worked,
       certifications, education, industry_experience, languages,
       visa_status, work_authorization, location_city, location_state, location_country,
       relocation_preference, expected_rate_min, expected_rate_max,
       raw_resume_text, parsed_data, inferred_industries, ai_summary, profile_completeness
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)
     RETURNING *`,
    [
      req.orgId, req.user.id, vendor_org_id || null, source,
      parsedProfile.firstName, parsedProfile.lastName, parsedProfile.email, parsedProfile.phone, parsedProfile.linkedinUrl,
      parsedProfile.title, parsedProfile.summary, parsedProfile.skills || [], parsedProfile.yearsOfExperience, JSON.stringify(parsedProfile.companies || []),
      JSON.stringify(parsedProfile.certifications || []), JSON.stringify(parsedProfile.education || []), parsedProfile.industries || [], JSON.stringify(parsedProfile.languages || []),
      parsedProfile.visaStatus || 'unknown', parsedProfile.workAuthorization, parsedProfile.city, parsedProfile.state, parsedProfile.country || 'US',
      parsedProfile.relocation, parsedProfile.rateMin, parsedProfile.rateMax,
      parsedProfile.rawText, JSON.stringify(parsedProfile), parsedProfile.inferredIndustries || [], parsedProfile.aiSummary, parsedProfile.completeness || 0
    ]
  );

  // Link file to candidate
  await db.query('UPDATE resume_files SET candidate_id = $1, parsed = $2, parse_status = $3 WHERE id = $4',
    [candidate.id, !parseError, parseError ? 'failed' : 'success', fileRecord.id]);

  res.status(201).json({
    candidate,
    duplicate: duplicateCheck,
    parseStatus: parseError ? 'partial' : 'success',
  });
});

// GET /api/candidates/:id/jobs — find matching jobs for a candidate
router.get('/:id/jobs', requirePermission('VIEW_MATCHES'), async (req, res) => {
  const { limit = 10 } = req.query;
  const { rows } = await db.query(
    `SELECT m.*, j.title, j.required_skills, j.location_city, j.pay_rate_min, j.pay_rate_max, j.status
     FROM ai_matches m
     JOIN jobs j ON j.id = m.job_id
     WHERE m.candidate_id = $1
     ORDER BY m.overall_score DESC
     LIMIT $2`,
    [req.params.id, limit]
  );
  res.json(rows);
});

// POST /api/candidates/:id/submit — submit to a job
router.post('/:id/submit', requirePermission('SUBMIT_CANDIDATE'), async (req, res) => {
  const { job_id } = req.body;
  if (!job_id) return res.status(400).json({ error: 'job_id required' });

  const { rows: [job] } = await db.query('SELECT * FROM jobs WHERE id = $1 AND org_id = $2', [job_id, req.orgId]);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const { rows: [existing] } = await db.query(
    'SELECT id FROM submissions WHERE job_id = $1 AND candidate_id = $2',
    [job_id, req.params.id]
  );
  if (existing) return res.status(409).json({ error: 'Candidate already submitted to this job' });

  const { rows: [submission] } = await db.query(
    `INSERT INTO submissions (job_id, candidate_id, org_id, submitted_by, stage)
     VALUES ($1, $2, $3, $4, 'submitted') RETURNING *`,
    [job_id, req.params.id, req.orgId, req.user.id]
  );

  res.status(201).json(submission);
});

export default router;
