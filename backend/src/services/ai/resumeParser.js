import fs from 'fs/promises';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../utils/logger.js';

let _anthropic = null;
function getClient() {
  if (!_anthropic && process.env.ANTHROPIC_API_KEY) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const buffer = await fs.readFile(filePath);
      const data = await pdfParse(buffer);
      if (data.text && data.text.trim().length >= 50) return { text: data.text, source: 'text' };
    } catch {}
    // Scanned/image-based PDF — no text could be extracted
    throw new Error('This PDF appears to be a scanned image. Please upload a text-based PDF or convert to DOCX.');
  }

  if (ext === '.docx') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    if (result.value?.trim().length >= 50) return { text: result.value, source: 'text' };
    throw new Error('Could not extract text from DOCX file');
  }

  if (ext === '.doc') {
    try {
      const WordExtractor = (await import('word-extractor')).default;
      const extractor = new WordExtractor();
      const doc = await extractor.extract(filePath);
      const text = doc.getBody();
      if (text?.trim().length >= 50) return { text, source: 'text' };
    } catch {}
    throw new Error('Could not extract text from DOC file. Try converting to DOCX or PDF.');
  }

  const text = await fs.readFile(filePath, 'utf-8');
  return { text, source: 'text' };
}

const PARSE_PROMPT = `You are an expert recruiter AI. Extract structured data from the following resume text.

Return ONLY valid JSON with this exact structure:
{
  "firstName": "string or null",
  "lastName": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "linkedinUrl": "string or null",
  "title": "current or most recent job title",
  "summary": "professional summary (2-3 sentences)",
  "skills": ["array", "of", "technical", "and", "soft", "skills"],
  "yearsOfExperience": number or null,
  "companies": [{"name": "...", "title": "...", "startDate": "...", "endDate": "...", "description": "..."}],
  "education": [{"institution": "...", "degree": "...", "field": "...", "year": "..."}],
  "certifications": [{"name": "...", "issuer": "...", "year": "..."}],
  "languages": [{"language": "...", "proficiency": "native|fluent|professional|basic"}],
  "visaStatus": "citizen|green_card|h1b|h4_ead|opt|stem_opt|l1|tn|other|unknown",
  "workAuthorization": "string describing authorization",
  "city": "string or null",
  "state": "string or null",
  "country": "US",
  "relocation": "willing|not_willing|open",
  "rateMin": number or null,
  "rateMax": number or null,
  "industries": ["direct industries from experience"],
  "inferredIndustries": ["industries inferred from companies, e.g. Bosch -> Automotive"],
  "aiSummary": "AI-written 2-sentence recruiter-facing summary",
  "completeness": 0-100
}

Industry inference rules:
- Companies like Google/Meta/Amazon → Technology, E-commerce
- Bosch/Ford/GM → Automotive, Manufacturing
- JPMorgan/Goldman/Citi → Financial Services, Banking
- UnitedHealth/CVS/Pfizer → Healthcare, Pharma
- Deloitte/McKinsey/Accenture → Consulting
- Boeing/Lockheed → Aerospace, Defense

Resume text:`;

async function parseWithClaude(text) {
  const client = getClient();
  if (!client) throw new Error('Anthropic API key not configured');

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: `${PARSE_PROMPT}\n\n${text.slice(0, 12000)}` }],
  });

  const content = response.content[0]?.text;
  if (!content) throw new Error('Claude returned no content');

  // Strip markdown code fences if present
  return content.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
}

function safeParseJSON(raw) {
  // First try straight parse
  try { return JSON.parse(raw); } catch {}

  // Try extracting the outermost {...} block
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI did not return valid JSON');

  // Remove trailing commas before ] or } (common free-model quirk)
  const cleaned = match[0].replace(/,\s*([\]}])/g, '$1');
  return JSON.parse(cleaned);
}

export const resumeParser = {
  async parse(filePath) {
    logger.info(`Parsing resume: ${path.basename(filePath)}`);

    const extracted = await extractText(filePath);

    logger.info('Parsing text via Claude Haiku');
    const content = await parseWithClaude(extracted.text);

    const parsed = safeParseJSON(content);
    parsed.rawText = extracted.text || '';

    logger.info(`Resume parsed successfully: ${parsed.firstName} ${parsed.lastName}, ${parsed.skills?.length} skills`);
    return parsed;
  },
};
