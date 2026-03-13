import { db } from '../../config/database.js';

export const duplicateDetector = {
  async check(profile, orgId) {
    const checks = [];

    if (profile.email) {
      const { rows } = await db.query(
        'SELECT id, first_name, last_name FROM candidates WHERE org_id = $1 AND email = $2 LIMIT 1',
        [orgId, profile.email.toLowerCase()]
      );
      if (rows.length) checks.push({ type: 'email', candidate: rows[0] });
    }

    if (profile.phone) {
      const { rows } = await db.query(
        'SELECT id, first_name, last_name FROM candidates WHERE org_id = $1 AND phone = $2 LIMIT 1',
        [orgId, profile.phone]
      );
      if (rows.length) checks.push({ type: 'phone', candidate: rows[0] });
    }

    if (profile.linkedinUrl) {
      const { rows } = await db.query(
        'SELECT id, first_name, last_name FROM candidates WHERE org_id = $1 AND linkedin_url = $2 LIMIT 1',
        [orgId, profile.linkedinUrl]
      );
      if (rows.length) checks.push({ type: 'linkedin', candidate: rows[0] });
    }

    if (checks.length) {
      return {
        isDuplicate: true,
        confidence: 'high',
        matches: checks,
        message: `Potential duplicate detected via ${checks.map(c => c.type).join(', ')}`,
      };
    }

    return { isDuplicate: false };
  },
};
