import fs from 'fs/promises';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../utils/logger.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function extractText(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    const pdfParse = (await import('pdf-parse')).default;
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === '.docx' || ext === '.doc') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  return await fs.readFile(filePath, 'utf-8');
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

export const resumeParser = {
  async parse(filePath, mimeType) {
    logger.info(`Parsing resume: ${path.basename(filePath)}`);

    const rawText = await extractText(filePath, mimeType);

    if (!rawText || rawText.trim().length < 50) {
      throw new Error('Could not extract meaningful text from resume');
    }

    const truncated = rawText.slice(0, 12000); // Token limit protection

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `${PARSE_PROMPT}\n\n${truncated}`,
      }],
    });

    const content = response.content[0].text.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI did not return valid JSON');

    const parsed = JSON.parse(jsonMatch[0]);
    parsed.rawText = rawText;

    logger.info(`Resume parsed successfully: ${parsed.firstName} ${parsed.lastName}, ${parsed.skills?.length} skills`);
    return parsed;
  },
};
