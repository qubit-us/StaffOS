import fs from 'fs/promises';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../utils/logger.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    // Try text extraction first
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const buffer = await fs.readFile(filePath);
      const data = await pdfParse(buffer);
      if (data.text && data.text.trim().length >= 50) return { text: data.text, source: 'text' };
    } catch {}
    // Fall back to Claude vision for image-based / scanned PDFs
    return { text: null, source: 'pdf_vision', filePath };
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

export const resumeParser = {
  async parse(filePath, mimeType) {
    logger.info(`Parsing resume: ${path.basename(filePath)}`);

    const extracted = await extractText(filePath);

    let response;

    if (extracted.source === 'pdf_vision') {
      // Send PDF directly to Claude — handles scanned/image-based PDFs
      const buffer = await fs.readFile(extracted.filePath);
      const base64 = buffer.toString('base64');

      response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            },
            { type: 'text', text: PARSE_PROMPT },
          ],
        }],
      });
    } else {
      const truncated = extracted.text.slice(0, 12000);
      response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: `${PARSE_PROMPT}\n\n${truncated}`,
        }],
      });
    }

    const content = response.content[0].text.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI did not return valid JSON');

    const parsed = JSON.parse(jsonMatch[0]);
    parsed.rawText = extracted.text || '';

    logger.info(`Resume parsed successfully: ${parsed.firstName} ${parsed.lastName}, ${parsed.skills?.length} skills`);
    return parsed;
  },
};
