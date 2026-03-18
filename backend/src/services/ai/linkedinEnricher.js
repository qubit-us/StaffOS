import axios from 'axios';

// Normalize LinkedIn URL to the format ProxyCurl expects
function normalizeLinkedInUrl(url) {
  try {
    const u = new URL(url.trim());
    // Ensure https and www
    u.protocol = 'https:';
    if (!u.hostname.startsWith('www.')) u.hostname = 'www.' + u.hostname;
    // Strip query params and trailing slashes
    const clean = `${u.origin}${u.pathname}`.replace(/\/$/, '');
    return clean;
  } catch {
    return url.trim();
  }
}

export const linkedinEnricher = {
  async enrich(linkedinUrl) {
    const apiKey = process.env.PROXYCURL_API_KEY;
    if (!apiKey) throw new Error('PROXYCURL_API_KEY not configured');

    const normalized = normalizeLinkedInUrl(linkedinUrl);

    if (!normalized.includes('linkedin.com/in/')) {
      throw new Error('Invalid LinkedIn URL. Expected format: linkedin.com/in/username');
    }

    let response;
    try {
      response = await axios.get('https://nubela.co/proxycurl/api/v2/linkedin', {
        params: { url: normalized, use_cache: 'if-present', fallback_to_cache: 'on-error' },
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 20000,
      });
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) throw new Error('LinkedIn profile not found. Make sure the URL is correct and the profile is public.');
      if (status === 400) throw new Error('Invalid LinkedIn URL format.');
      if (status === 401) throw new Error('ProxyCurl API key is invalid.');
      if (status === 403) throw new Error('ProxyCurl credits exhausted. Please top up your account.');
      if (status === 429) throw new Error('ProxyCurl rate limit reached. Please try again in a moment.');
      throw new Error(`LinkedIn fetch failed: ${err.message}`);
    }

    return mapToCandidate(response.data);
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
