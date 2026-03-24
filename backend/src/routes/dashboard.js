import { Router } from 'express';
import { db } from '../config/database.js';
import { authenticate, requirePermission } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/dashboard/events?start=YYYY-MM-DD&end=YYYY-MM-DD
// Returns calendar events synthesised from jobs + submissions
router.get('/events', requirePermission('VIEW_PIPELINE'), async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end dates required' });

    const events = [];

    // ── 1. Candidate start dates (jobs with start_date in range that have placed submissions) ──
    const { rows: starts } = await db.query(
      `SELECT j.id as job_id, j.title, j.start_date::date as event_date,
              COUNT(s.id) as count
       FROM jobs j
       LEFT JOIN submissions s ON s.job_id = j.id AND s.stage = 'placed'
       WHERE j.org_id = $1
         AND j.start_date IS NOT NULL
         AND j.start_date::date BETWEEN $2 AND $3
       GROUP BY j.id, j.title, j.start_date`,
      [req.orgId, start, end]
    );
    starts.forEach(r => events.push({
      date:   r.event_date,
      type:   'candidate_start',
      title:  r.count > 0 ? `${r.title} — ${r.count} start${r.count > 1 ? 's' : ''}` : `${r.title} — starts`,
      color:  'green',
      job_id: r.job_id,
    }));

    // ── 2. Job deadlines ──
    const { rows: deadlines } = await db.query(
      `SELECT id as job_id, title, deadline::date as event_date
       FROM jobs
       WHERE org_id = $1
         AND deadline IS NOT NULL
         AND deadline::date BETWEEN $2 AND $3`,
      [req.orgId, start, end]
    );
    deadlines.forEach(r => events.push({
      date:   r.event_date,
      type:   'deadline',
      title:  `Deadline: ${r.title}`,
      color:  'orange',
      job_id: r.job_id,
    }));

    // ── 3. Active submissions in interview stages ──
    const { rows: interviews } = await db.query(
      `SELECT s.id as submission_id, s.job_id,
              c.first_name || ' ' || c.last_name as candidate_name,
              j.title as job_title,
              s.internal_stage_updated_at::date as event_date,
              s.stage
       FROM submissions s
       JOIN candidates c ON c.id = s.candidate_id
       JOIN jobs j ON j.id = s.job_id
       WHERE s.org_id = $1
         AND s.stage IN ('interview_r1','interview_r2')
         AND s.internal_stage_updated_at IS NOT NULL
         AND s.internal_stage_updated_at::date BETWEEN $2 AND $3`,
      [req.orgId, start, end]
    );
    interviews.forEach(r => events.push({
      date:          r.event_date,
      type:          r.stage === 'interview_r1' ? 'interview_r1' : 'interview_r2',
      title:         `${r.stage === 'interview_r1' ? 'R1' : 'R2'}: ${r.candidate_name} — ${r.job_title}`,
      color:         'purple',
      submission_id: r.submission_id,
      job_id:        r.job_id,
    }));

    // ── 4. Placed candidate milestones (6 months, 1 year from updated_at when placed) ──
    const { rows: placed } = await db.query(
      `SELECT s.id as submission_id, s.job_id, s.updated_at,
              c.first_name || ' ' || c.last_name as candidate_name,
              j.title as job_title
       FROM submissions s
       JOIN candidates c ON c.id = s.candidate_id
       JOIN jobs j ON j.id = s.job_id
       WHERE s.org_id = $1 AND s.stage = 'placed'`,
      [req.orgId]
    );

    const startDate = new Date(start);
    const endDate   = new Date(end);

    placed.forEach(r => {
      const placedAt = new Date(r.updated_at);
      [
        { months: 6,  label: '6-month milestone',    type: 'milestone_6mo'  },
        { months: 12, label: '1-year anniversary',   type: 'milestone_1yr'  },
        { months: 24, label: '2-year anniversary',   type: 'milestone_2yr'  },
      ].forEach(({ months, label, type }) => {
        const milestone = new Date(placedAt);
        milestone.setMonth(milestone.getMonth() + months);
        if (milestone >= startDate && milestone <= endDate) {
          events.push({
            date:          milestone.toISOString().split('T')[0],
            type,
            title:         `${r.candidate_name} — ${label}`,
            color:         'teal',
            submission_id: r.submission_id,
            job_id:        r.job_id,
          });
        }
      });
    });

    // ── 5. Contracts ending — jobs deadline coming up that have placed submissions ──
    const { rows: contracts } = await db.query(
      `SELECT j.id as job_id, j.title, j.deadline::date as event_date,
              COUNT(s.id) as placed_count
       FROM jobs j
       JOIN submissions s ON s.job_id = j.id AND s.stage = 'placed'
       WHERE j.org_id = $1
         AND j.deadline IS NOT NULL
         AND j.deadline::date BETWEEN $2 AND $3
       GROUP BY j.id, j.title, j.deadline`,
      [req.orgId, start, end]
    );
    contracts.forEach(r => {
      if (r.placed_count > 0) {
        // replace the generic deadline event with a more specific contract-ending one
        const idx = events.findIndex(e => e.job_id === r.job_id && e.type === 'deadline');
        const evt = {
          date:   r.event_date,
          type:   'contract_end',
          title:  `Contract ends: ${r.title} (${r.placed_count} contractor${r.placed_count > 1 ? 's' : ''})`,
          color:  'red',
          job_id: r.job_id,
        };
        if (idx >= 0) events[idx] = evt;
        else events.push(evt);
      }
    });

    // Sort by date
    events.sort((a, b) => a.date.localeCompare(b.date));
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/activity — recent activity feed (last 30 days)
router.get('/activity', requirePermission('VIEW_PIPELINE'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `(SELECT 'submission_new' as type,
               s.created_at as ts,
               c.first_name || ' ' || c.last_name as subject,
               j.title as context,
               s.id as ref_id,
               s.job_id,
               s.submission_source as extra
        FROM submissions s
        JOIN candidates c ON c.id = s.candidate_id
        JOIN jobs j ON j.id = s.job_id
        WHERE s.org_id = $1
        ORDER BY s.created_at DESC LIMIT 15)
       UNION ALL
       (SELECT 'stage_change' as type,
               ph.created_at as ts,
               c.first_name || ' ' || c.last_name as subject,
               j.title || ' → ' || ph.to_stage as context,
               ph.submission_id as ref_id,
               j.id as job_id,
               ph.from_stage || '→' || ph.to_stage as extra
        FROM pipeline_history ph
        JOIN submissions s ON s.id = ph.submission_id
        JOIN candidates c ON c.id = s.candidate_id
        JOIN jobs j ON j.id = s.job_id
        WHERE s.org_id = $1
        ORDER BY ph.created_at DESC LIMIT 15)
       UNION ALL
       (SELECT 'job_new' as type,
               j.created_at as ts,
               j.title as subject,
               j.location_city || ', ' || j.location_state as context,
               j.id as ref_id,
               j.id as job_id,
               j.status as extra
        FROM jobs j
        WHERE j.org_id = $1
        ORDER BY j.created_at DESC LIMIT 10)
       ORDER BY ts DESC
       LIMIT 30`,
      [req.orgId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
