import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function scanBlueprint(pdfPath, checklistItems) {
  const pdfData = fs.readFileSync(pdfPath);
  const base64PDF = pdfData.toString('base64');

  const checklistText = checklistItems
    .filter(i => i.Status === 'Pending')
    .map(i => `ID ${i.id}: ${i.Question}`)
    .join('\n');

  const prompt = `You are an expert electrical engineer reviewing a blueprint for quality control.

Analyze this electrical blueprint and answer each of the following QC checklist questions.
For each question respond with YES, NO, or N/A.
Also provide a brief comment explaining your answer (max 20 words).

Return ONLY a JSON array in this exact format, no other text:
[
  {"id": 1, "status": "YES", "comment": "Brief explanation here"},
  {"id": 2, "status": "NO", "comment": "Brief explanation here"}
]

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
    return JSON.parse(clean);
  } catch(e) {
    console.error('Failed to parse Gemini response:', text);
    return [];
  }
}