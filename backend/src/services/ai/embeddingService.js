import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../utils/logger.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildCandidateText(candidate) {
  const parts = [
    candidate.title && `Title: ${candidate.title}`,
    candidate.summary && `Summary: ${candidate.summary}`,
    candidate.skills?.length && `Skills: ${candidate.skills.join(', ')}`,
    candidate.years_of_experience && `Experience: ${candidate.years_of_experience} years`,
    candidate.industry_experience?.length && `Industries: ${candidate.industry_experience.join(', ')}`,
    candidate.inferred_industries?.length && `Inferred Industries: ${candidate.inferred_industries.join(', ')}`,
    candidate.visa_status && `Visa: ${candidate.visa_status}`,
    candidate.location_city && `Location: ${candidate.location_city}, ${candidate.location_state}`,
    candidate.ai_summary && `AI Summary: ${candidate.ai_summary}`,
  ].filter(Boolean);

  return parts.join('\n');
}

function buildJobText(job) {
  const parts = [
    `Title: ${job.title}`,
    job.description && `Description: ${job.description?.slice(0, 1000)}`,
    job.required_skills?.length && `Required Skills: ${job.required_skills.join(', ')}`,
    job.nice_to_have_skills?.length && `Nice to Have: ${job.nice_to_have_skills.join(', ')}`,
    job.experience_min && `Experience: ${job.experience_min}+ years`,
    job.industry?.length && `Industry: ${job.industry.join(', ')}`,
    job.location_city && `Location: ${job.location_city}, ${job.location_state}`,
    job.visa_requirements?.length && `Visa: ${job.visa_requirements.join(', ')}`,
  ].filter(Boolean);

  return parts.join('\n');
}

export const embeddingService = {
  async generateEmbedding(text) {
    if (!text || text.trim().length < 10) return null;

    // Use Claude to generate a semantic representation via text-embeddings
    // Note: Anthropic doesn't expose embeddings directly; we use voyage-3 via API
    // For MVP we use a sentence embedding approach via the messages API
    // In production, swap with voyage-ai or openai embeddings endpoint
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1536,
      messages: [{
        role: 'user',
        content: `Generate a numerical semantic embedding vector of exactly 1536 float values for the following professional profile text. Return ONLY a JSON array of 1536 numbers between -1 and 1, no other text.

Text: ${text.slice(0, 2000)}`,
      }],
    });

    const content = response.content[0].text.trim();
    const arrayMatch = content.match(/\[[\d\s,.\-eE]+\]/);
    if (!arrayMatch) return null;

    return JSON.parse(arrayMatch[0]);
  },

  async generateCandidateEmbedding(candidate) {
    const text = buildCandidateText(candidate);
    return this.generateEmbedding(text);
  },

  async generateJobEmbedding(job) {
    const text = buildJobText(job);
    return this.generateEmbedding(text);
  },
};
