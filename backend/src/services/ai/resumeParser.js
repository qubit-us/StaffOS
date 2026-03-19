import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { logger } from '../../utils/logger.js';

// OpenRouter — used for all parsing
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-flash-1.5';

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

async function parseWithOpenRouter(text) {
  const res = await axios.post(
    `${OPENROUTER_BASE}/chat/completions`,
    {
      model: OPENROUTER_MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: `${PARSE_PROMPT}\n\n${text.slice(0, 12000)}` }],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://staffos.app',
        'X-Title': 'StaffOS Resume Parser',
      },
      timeout: 60000,
    }
  );

  const choice = res.data.choices?.[0];
  const content = choice?.message?.content;

  if (!content) {
    const reason = choice?.finish_reason || 'unknown';
    throw new Error(`Model returned no content (finish_reason: ${reason}). The free model may be overloaded — please try again.`);
  }

  // Strip markdown code fences if the model wrapped the JSON
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

    logger.info(`Parsing text via OpenRouter (${OPENROUTER_MODEL})`);
    const content = await parseWithOpenRouter(extracted.text);

    const parsed = safeParseJSON(content);
    parsed.rawText = extracted.text || '';

    logger.info(`Resume parsed successfully: ${parsed.firstName} ${parsed.lastName}, ${parsed.skills?.length} skills`);
    return parsed;
  },
};
