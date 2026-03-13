import Anthropic from '@anthropic-ai/sdk';
import { db } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function skillOverlap(jobSkills = [], candidateSkills = []) {
  if (!jobSkills.length) return 0.5;
  const jobSet = new Set(jobSkills.map(s => s.toLowerCase()));
  const matched = candidateSkills.filter(s => jobSet.has(s.toLowerCase()));
  return matched.length / jobSkills.length;
}

function experienceScore(jobMin, jobMax, candidateYears) {
  if (!candidateYears) return 0.5;
  const min = jobMin || 0;
  const max = jobMax || 20;
  if (candidateYears >= min && candidateYears <= max + 3) return 1.0;
  if (candidateYears < min) return Math.max(0, 1 - (min - candidateYears) * 0.15);
  return Math.max(0.5, 1 - (candidateYears - max - 3) * 0.05);
}

function visaScore(jobVisaReqs = [], candidateVisa) {
  if (!jobVisaReqs.length) return 1.0;
  const any = jobVisaReqs.some(r => r.toLowerCase().includes('any') || r.toLowerCase().includes('all'));
  if (any) return 1.0;
  const gc = jobVisaReqs.some(r => r.toLowerCase().includes('gc') || r.toLowerCase().includes('green card'));
  const citizen = jobVisaReqs.some(r => r.toLowerCase().includes('citizen'));
  if (citizen && candidateVisa === 'citizen') return 1.0;
  if (gc && ['citizen','green_card'].includes(candidateVisa)) return 1.0;
  if (['citizen','green_card','h1b'].includes(candidateVisa)) return 0.7;
  return 0.3;
}

function rateScore(jobMin, jobMax, candidateMin, candidateMax) {
  if (!candidateMin || !jobMax) return 0.8;
  if (candidateMin <= jobMax) return 1.0;
  const gap = candidateMin - jobMax;
  return Math.max(0, 1 - gap / jobMax);
}

function locationScore(job, candidate) {
  if (job.remote_allowed) return 1.0;
  if (!job.location_state || !candidate.location_state) return 0.7;
  if (job.location_state === candidate.location_state) return 1.0;
  if (candidate.relocation_preference === 'willing') return 0.8;
  return 0.4;
}

async function getAIExplanation(job, candidate, scores) {
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Write a 2-sentence recruiter explanation for why this candidate matches this job.
Job: ${job.title} requiring ${job.required_skills?.join(', ')}
Candidate: ${candidate.title} with ${candidate.years_of_experience}yrs, skills: ${candidate.skills?.join(', ')}
Overall score: ${Math.round(scores.overall * 100)}%
Be specific and professional.`,
      }],
    });
    return response.content[0].text.trim();
  } catch {
    return `Candidate matches ${Math.round(scores.overall * 100)}% of job requirements.`;
  }
}

export const matchingEngine = {
  async matchJobToCandidates(job, orgId, limit = 50) {
    logger.info(`Starting matching for job: ${job.title} (${job.id})`);

    // Try vector similarity first if embeddings exist
    let candidates = [];

    if (job.job_embedding) {
      const { rows } = await db.query(
        `SELECT * FROM candidates
         WHERE org_id = $1 AND is_active = true
         ORDER BY profile_embedding <=> $2::vector
         LIMIT $3`,
        [orgId, JSON.stringify(job.job_embedding), limit * 2]
      );
      candidates = rows;
    } else {
      // Fallback: skill-based query
      const skillFilter = job.required_skills?.length
        ? `AND c.skills && $2`
        : '';
      const params = job.required_skills?.length
        ? [orgId, `{${job.required_skills.join(',')}}`]
        : [orgId];

      const { rows } = await db.query(
        `SELECT * FROM candidates c WHERE c.org_id = $1 ${skillFilter} AND c.is_active = true LIMIT $${params.length + 1}`,
        [...params, limit * 2]
      );
      candidates = rows;
    }

    logger.info(`Evaluating ${candidates.length} candidates for job ${job.id}`);

    const matches = [];
    for (const candidate of candidates) {
      const skills    = skillOverlap(job.required_skills, candidate.skills);
      const exp       = experienceScore(job.experience_min, job.experience_max, candidate.years_of_experience);
      const visa      = visaScore(job.visa_requirements, candidate.visa_status);
      const rate      = rateScore(job.pay_rate_min, job.pay_rate_max, candidate.expected_rate_min, candidate.expected_rate_max);
      const location  = locationScore(job, candidate);

      const industry_s = job.industry?.length && candidate.industry_experience?.length
        ? job.industry.filter(i => candidate.industry_experience.includes(i)).length / job.industry.length
        : 0.5;

      const overall = (skills * 0.35) + (exp * 0.20) + (visa * 0.15) + (rate * 0.10) + (location * 0.10) + (industry_s * 0.10);

      if (overall < 0.2) continue;

      const matchedSkills  = (job.required_skills || []).filter(s => candidate.skills?.map(x => x.toLowerCase()).includes(s.toLowerCase()));
      const missingSkills  = (job.required_skills || []).filter(s => !candidate.skills?.map(x => x.toLowerCase()).includes(s.toLowerCase()));

      const explanation = overall > 0.6 ? await getAIExplanation(job, candidate, { overall }) : null;

      matches.push({
        jobId: job.id, candidateId: candidate.id, orgId,
        overall, skills, exp, visa, rate, location, industry: industry_s,
        matchedSkills, missingSkills, explanation,
      });
    }

    matches.sort((a, b) => b.overall - a.overall);
    const topMatches = matches.slice(0, limit);

    // Upsert matches to DB
    for (const m of topMatches) {
      await db.query(
        `INSERT INTO ai_matches (job_id, candidate_id, org_id, overall_score, skills_score,
           experience_score, industry_score, location_score, visa_score, rate_score,
           matched_skills, missing_skills, ai_explanation)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (job_id, candidate_id)
         DO UPDATE SET overall_score=$4, skills_score=$5, experience_score=$6,
           industry_score=$7, location_score=$8, visa_score=$9, rate_score=$10,
           matched_skills=$11, missing_skills=$12, ai_explanation=$13, updated_at=NOW()`,
        [m.jobId, m.candidateId, m.orgId, m.overall, m.skills, m.exp,
         m.industry, m.location, m.visa, m.rate,
         m.matchedSkills, m.missingSkills, m.explanation]
      );
    }

    await db.query(`UPDATE jobs SET status = 'open' WHERE id = $1`, [job.id]);

    logger.info(`Matching complete for job ${job.id}: ${topMatches.length} matches stored`);
    return topMatches;
  },
};
