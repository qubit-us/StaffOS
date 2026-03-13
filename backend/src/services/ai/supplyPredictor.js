import Anthropic from '@anthropic-ai/sdk';
import { db } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const supplyPredictor = {
  async predict(job, orgId) {
    // Count available candidates with matching skills
    const skillFilter = job.required_skills?.length ? job.required_skills : [];

    const { rows: [{ count: total }] } = await db.query(
      'SELECT COUNT(*) FROM candidates WHERE org_id = $1 AND is_active = true', [orgId]
    );

    let skillMatch = 0;
    if (skillFilter.length) {
      const { rows: [{ count }] } = await db.query(
        `SELECT COUNT(*) FROM candidates WHERE org_id = $1 AND is_active = true AND skills && $2`,
        [orgId, skillFilter]
      );
      skillMatch = parseInt(count);
    } else {
      skillMatch = parseInt(total);
    }

    const visaMatch = job.visa_requirements?.some(v => v.toLowerCase().includes('gc') || v.toLowerCase().includes('citizen'));
    let authorizedCount = skillMatch;
    if (visaMatch) {
      const { rows: [{ count }] } = await db.query(
        `SELECT COUNT(*) FROM candidates
         WHERE org_id = $1 AND is_active = true
         AND visa_status IN ('citizen','green_card') ${skillFilter.length ? 'AND skills && $2' : ''}`,
        skillFilter.length ? [orgId, skillFilter] : [orgId]
      );
      authorizedCount = parseInt(count);
    }

    const ratio = parseInt(total) > 0 ? authorizedCount / Math.max(parseInt(total), 1) : 0;

    let level;
    if (authorizedCount >= 10 || ratio > 0.15)  level = 'high';
    else if (authorizedCount >= 3 || ratio > 0.05) level = 'moderate';
    else level = 'low';

    // Get AI recommendation for low supply
    let recommendation = null;
    if (level === 'low') {
      try {
        const response = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          messages: [{
            role: 'user',
            content: `A staffing agency has low candidate supply for this job:
Title: ${job.title}
Required Skills: ${job.required_skills?.join(', ')}
Experience: ${job.experience_min}+ years
Location: ${job.location_city}, ${job.location_state}

Provide JSON with:
{
  "alternativeSkills": ["similar skills that could substitute"],
  "alternativeRoles": ["similar job titles to search for"],
  "sourcingRecommendations": ["where to find these candidates"],
  "marketInsight": "1 sentence about talent market"
}`,
          }],
        });
        const match = response.content[0].text.match(/\{[\s\S]*\}/);
        if (match) recommendation = JSON.parse(match[0]);
      } catch (err) {
        logger.error('Supply prediction AI error:', err.message);
      }
    }

    // Find vendors likely to have candidates
    const { rows: vendors } = await db.query(
      `SELECT DISTINCT o.id, o.name,
         COUNT(c.id) FILTER (WHERE c.skills && $1) as matching_candidates
       FROM vendor_relationships vr
       JOIN organizations o ON o.id = vr.vendor_org_id
       JOIN candidates c ON c.vendor_org_id = o.id
       WHERE vr.agency_org_id = $2 AND vr.status = 'active'
       GROUP BY o.id, o.name
       ORDER BY matching_candidates DESC
       LIMIT 5`,
      [skillFilter.length ? skillFilter : ['{}'], orgId]
    );

    return {
      level,
      candidatePoolCount: authorizedCount,
      totalPool: parseInt(total),
      recommendation,
      recommendedVendors: vendors,
      predictedAt: new Date().toISOString(),
    };
  },
};
