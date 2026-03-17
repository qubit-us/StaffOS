import axios from 'axios';

export const linkedinEnricher = {
  async enrich(linkedinUrl) {
    const apiKey = process.env.PROXYCURL_API_KEY;
    if (!apiKey) throw new Error('PROXYCURL_API_KEY not configured');

    const { data } = await axios.get('https://nubela.co/proxycurl/api/v2/linkedin', {
      params: { url: linkedinUrl, use_cache: 'if-present', fallback_to_cache: 'on-error' },
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 15000,
    });

    return mapToCandidate(data);
  },
};

function mapToCandidate(data) {
  const skills = data.skills?.map(s => s.name).filter(Boolean) || [];

  const companies = (data.experiences || []).map(e => ({
    company: e.company,
    title: e.title,
    start: e.starts_at ? `${e.starts_at.month || ''}/${e.starts_at.year}` : null,
    end: e.ends_at ? `${e.ends_at.month || ''}/${e.ends_at.year}` : 'Present',
    description: e.description || null,
    location: e.location || null,
  }));

  const education = (data.education || []).map(e => ({
    school: e.school,
    degree: e.degree_name,
    field: e.field_of_study,
    end: e.ends_at?.year || null,
    start: e.starts_at?.year || null,
  }));

  const certifications = (data.certifications || []).map(c => c.name).filter(Boolean);

  const languages = (data.languages || []).map(l =>
    typeof l === 'string' ? { name: l } : { name: l.name, proficiency: l.proficiency }
  );

  // Estimate years of experience from earliest job
  let yearsOfExperience = null;
  if (data.experiences?.length) {
    const years = data.experiences.map(e => e.starts_at?.year).filter(Boolean);
    if (years.length) {
      yearsOfExperience = new Date().getFullYear() - Math.min(...years);
    }
  }

  return {
    firstName: data.first_name || null,
    lastName: data.last_name || null,
    title: data.headline || null,
    summary: data.summary || null,
    skills,
    companies,
    education,
    certifications,
    languages,
    yearsOfExperience,
    city: data.city || null,
    state: data.state || null,
    country: data.country_full_name || data.country || null,
  };
}
