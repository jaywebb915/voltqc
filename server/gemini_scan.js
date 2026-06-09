import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Scans a blueprint PDF against the checklist.
 * Returns an object: { sheet_number, sheet_title, findings: [...] }
 * Each finding: { id, status, comment }
 */
export async function scanBlueprint(pdfPath, checklistItems) {
  const pdfData = fs.readFileSync(pdfPath);
  const base64PDF = pdfData.toString('base64');

  const checklistText = checklistItems
    .filter(i => i.Status === 'Pending')
    .map(i => `ID ${i.id}: ${i.Question}`)
    .join('\n');

  const prompt = `You are an expert electrical engineer reviewing a blueprint for quality control.

STEP 1 — Title block extraction:
Look at the drawing's title block (usually bottom-right corner) and extract:
- sheet_number: the drawing/sheet number (e.g. "E-2.01", "E-101", "EL-001")
- sheet_title: the full title of the drawing (e.g. "ELECTRICAL FLOOR PLAN - LEVEL 1")
If either value is not visible or the drawing has no title block, use an empty string "".

STEP 2 — QC checklist review:
Analyze the blueprint and answer each checklist question below with YES, NO, or N/A.
Provide a brief comment (max 20 words) explaining each answer.

Return ONLY a single JSON object in this exact format — no markdown, no extra text:
{
  "sheet_number": "E-2.01",
  "sheet_title": "ELECTRICAL FLOOR PLAN",
  "findings": [
    {"id": 1, "status": "YES", "comment": "Brief explanation here"},
    {"id": 2, "status": "NO", "comment": "Brief explanation here"}
  ]
}

CHECKLIST QUESTIONS:
${checklistText}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: base64PDF,
            },
          },
          { text: prompt },
        ],
      },
    ],
  });

  const text = response.text;

  try {
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    // New format: { sheet_number, sheet_title, findings }
    if (parsed && Array.isArray(parsed.findings)) {
      return {
        sheet_number: parsed.sheet_number || '',
        sheet_title:  parsed.sheet_title  || '',
        findings:     parsed.findings,
      };
    }

    // Legacy fallback: plain array
    if (Array.isArray(parsed)) {
      return { sheet_number: '', sheet_title: '', findings: parsed };
    }

    return { sheet_number: '', sheet_title: '', findings: [] };
  } catch(e) {
    console.error('Failed to parse Gemini response:', text);
    return { sheet_number: '', sheet_title: '', findings: [] };
  }
}
