import { scanBlueprint } from './gemini_scan.js';
import dotenv from 'dotenv';
dotenv.config();

import Database from 'better-sqlite3';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { PDFDocument, PDFName, PDFString, PDFNumber, PDFArray } from 'pdf-lib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4010;
const DB_PATH = path.join(__dirname, '../voltqc.db');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const db = new Database(DB_PATH);

// Idempotent schema migrations — add new columns if they don't exist yet
try { db.exec("ALTER TABLE QC_Checklist ADD COLUMN sheet_number TEXT DEFAULT ''"); } catch(e) {}
try { db.exec("ALTER TABLE QC_Checklist ADD COLUMN sheet_title  TEXT DEFAULT ''"); } catch(e) {}

// Back-fill filepath for any document rows that are missing it.
// These are legacy rows that pre-date the explicit filepath INSERT.
{
  const missingPath = db.prepare(
    "SELECT id, filename FROM Documents WHERE filepath IS NULL OR filepath = ''"
  ).all();
  const uploadDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../uploads');
  const backfill  = db.prepare("UPDATE Documents SET filepath = ? WHERE id = ?");
  for (const row of missingPath) {
    backfill.run(path.join(uploadDir, row.filename), row.id);
  }
  if (missingPath.length > 0) {
    console.log(`[migration] Back-filled filepath for ${missingPath.length} document row(s)`);
  }
}

// Canonical section order matching the VDC QC Distribution Template
const SECTION_ORDER = [
  'PROCESS COMPLIANCE',
  'AVAILABLE DESIGN INFORMATION',
  'GENERAL DRAFTING',
  'GENERAL DESIGN',
  'ELECTRICAL ROOMS',
  'SLEEVING',
  'EMERGENCY',
];

function sectionRank(name) {
  const idx = SECTION_ORDER.indexOf((name || '').toUpperCase());
  return idx === -1 ? 999 : idx;
}

function getChecklistData() {
  try {
    return db.prepare('SELECT * FROM QC_Checklist').all();
  } catch(e) {
    console.error('getChecklistData error:', e.message);
    return [];
  }
}

app.get('/api/checklist', (req, res) => {
  const data = getChecklistData().sort((a, b) => {
    const sr = sectionRank(a.Section) - sectionRank(b.Section);
    if (sr !== 0) return sr;
    return (a.id || 0) - (b.id || 0);
  });
  res.json(data);
});

app.get('/api/score', (req, res) => {
  const checklist = getChecklistData();
  let totalPossible = 0, passedPoints = 0;
  for (const item of checklist) {
    const pts = parseFloat(item.Point_Value) || 0;
    if (item.Status !== 'N/A') totalPossible += pts;
    if (item.Status === 'YES') passedPoints += pts;
  }
  const percentage = totalPossible > 0 ? (passedPoints / totalPossible) * 100 : 0;
  res.json({
    totalPossible, passedPoints,
    percentage: Math.round(percentage * 100) / 100,
    passed: percentage >= 85, threshold: 85,
    totalItems: checklist.length,
    passedItems: checklist.filter(i => i.Status === 'YES').length,
    failedItems: checklist.filter(i => i.Status === 'NO').length,
    naItems: checklist.filter(i => i.Status === 'N/A').length,
  });
});

app.get('/api/sections', (req, res) => {
  const data = getChecklistData();
  const sections = {};
  for (const item of data) {
    const sec = item.Section || 'Uncategorized';
    if (!sections[sec]) sections[sec] = { name: sec, items: [], totalPoints: 0, passedPoints: 0 };
    const pts = parseFloat(item.Point_Value) || 0;
    sections[sec].items.push(item);
    if (item.Status !== 'N/A') sections[sec].totalPoints += pts;
    if (item.Status === 'YES') sections[sec].passedPoints += pts;
  }
  res.json(
    Object.values(sections)
      .sort((a, b) => sectionRank(a.name) - sectionRank(b.name))
      .map(s => ({
        ...s,
        percentage: s.totalPoints > 0 ? Math.round((s.passedPoints / s.totalPoints) * 10000) / 100 : 0
      }))
  );
});

const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.get('/api/documents', (req, res) => {
  try {
    const docs = db.prepare('SELECT * FROM Documents ORDER BY created_at DESC').all();
    const documents = docs.map(doc => {
      let metadata = {};
      try { metadata = JSON.parse(doc.metadata || '{}'); } catch(e) {}
      return {
        id: doc.id,
        filename: doc.filename,
        status: doc.status || (doc.classification ? 'Completed' : 'Processing'),
        sheet_type: doc.classification,
        floor_number: metadata.floor,
        building_area: metadata.building_area,
        file_size: metadata.file_size_bytes,
        uploaded_at: doc.created_at,
        analysis_details: metadata
      };
    });
    res.json(documents);
  } catch(e) {
    res.json([]);
  }
});

app.get('/api/documents/:id', (req, res) => {
  try {
    const doc = db.prepare('SELECT * FROM Documents WHERE id = ?').get(parseInt(req.params.id));
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    let metadata = {};
    try { metadata = JSON.parse(doc.metadata || '{}'); } catch(e) {}
    res.json({
      id: doc.id,
      filename: doc.filename,
      status: doc.status || (doc.classification ? 'Completed' : 'Processing'),
      sheet_type: doc.classification,
      floor_number: metadata.floor,
      building_area: metadata.building_area,
      file_size: metadata.file_size_bytes,
      uploaded_at: doc.created_at,
      analysis_details: metadata
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/documents/upload', (req, res) => {
  const { filename, fileSize, content } = req.body;
  if (!filename) return res.status(400).json({ error: 'filename is required' });
  const filepath = path.join(UPLOAD_DIR, filename);

  // Write file to disk
  if (content) {
    const buffer = Buffer.from(content, 'base64');
    fs.writeFileSync(filepath, buffer);
  } else {
    fs.writeFileSync(filepath, 'Mock content for ' + filename);
  }

  // Prefer actual on-disk size; fall back to client-reported value
  let fileSizeBytes = fileSize || 0;
  try { fileSizeBytes = fs.statSync(filepath).size; } catch(_) {}

  const metadata = JSON.stringify({ file_size_bytes: fileSizeBytes });
  const now = new Date().toISOString();

  const stmt = db.prepare(
    "INSERT INTO Documents (filename, filepath, status, metadata, created_at) VALUES (?, ?, 'Queued', ?, ?)"
  );
  const result = stmt.run(filename, filepath, metadata, now);

  res.status(201).json({
    id: result.lastInsertRowid,
    filename,
    status: 'Queued',
    file_size: fileSizeBytes,
    uploaded_at: now,
  });
});

// Resolve the disk path for a document row.
// Prefers the stored filepath; falls back to UPLOAD_DIR/filename for rows
// that pre-date the filepath column or were written without it.
function resolveDocPath(doc) {
  if (doc.filepath && fs.existsSync(doc.filepath)) return doc.filepath;
  const fallback = path.join(UPLOAD_DIR, doc.filename);
  return fs.existsSync(fallback) ? fallback : null;
}

app.get('/api/documents/:id/file', (req, res) => {
  try {
    const doc = db.prepare('SELECT * FROM Documents WHERE id = ?').get(parseInt(req.params.id));
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const filePath = resolveDocPath(doc);
    if (!filePath) return res.status(404).json({ error: 'File not on disk' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${doc.filename}"`);
    res.sendFile(path.resolve(filePath));
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/documents/:id', (req, res) => {
  db.prepare('DELETE FROM Documents WHERE id = ?').run(parseInt(req.params.id));
  res.json({ success: true });
});

// ── Annotated blueprint export ────────────────────────────────────────────────
// Returns the original uploaded PDF with FreeText annotations added for every
// checklist item that Gemini marked NO. Annotations use Bluebeam-compatible
// style: blue border, yellow fill, black text — standard PDF FreeText objects
// that Bluebeam (and Acrobat) can open, reposition, and edit natively.
app.get('/api/documents/:id/annotated', async (req, res) => {
  try {
    const doc = db.prepare('SELECT * FROM Documents WHERE id = ?').get(parseInt(req.params.id));
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const filePath = resolveDocPath(doc);
    if (!filePath) {
      return res.status(404).json({
        error: `File not on disk. Expected at: ${doc.filepath || path.join(UPLOAD_DIR, doc.filename)}`
      });
    }

    // Fetch all NO items from the checklist (these are the flagged/failed items)
    const failedItems = db.prepare(
      "SELECT * FROM QC_Checklist WHERE Status = 'NO' ORDER BY id"
    ).all();

    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc   = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

    if (failedItems.length > 0) {
      const page          = pdfDoc.getPage(0);
      const { width, height } = page.getSize();

      // Annotation dimensions and layout constants (points)
      const ANNO_W      = Math.min(Math.round(width * 0.38), 240); // ~38% page width
      const ANNO_H      = 62;
      const PADDING_TOP = 20;
      const PADDING_X   = 18;
      const GAP         = 8;

      // Collect existing page annotations so we don't overwrite them
      const annotsKey = PDFName.of('Annots');
      let existingRefs = [];
      try {
        const raw = page.node.get(annotsKey);
        if (raw) {
          // raw may be a PDFArray directly or a PDFRef to one
          const arr = raw instanceof PDFArray ? raw : pdfDoc.context.lookupMaybe(raw, PDFArray);
          if (arr) existingRefs = arr.asArray();
        }
      } catch(_) {}

      const newRefs = [];

      for (let i = 0; i < failedItems.length; i++) {
        const item   = failedItems[i];
        const yTop   = height - PADDING_TOP - i * (ANNO_H + GAP);
        const yBot   = yTop - ANNO_H;

        // Stop adding annotations if they'd run off the bottom of the page
        if (yBot < PADDING_TOP) break;

        // Build annotation text
        const sheetRef = item.sheet_number ? `[${item.sheet_number}] ` : '';
        const lines    = [
          `${sheetRef}[NO] ${item.Section}`,
          item.Question.length > 80 ? item.Question.slice(0, 77) + '…' : item.Question,
        ];
        if (item.Comments) {
          const c = item.Comments.length > 70 ? item.Comments.slice(0, 67) + '…' : item.Comments;
          lines.push(`→ ${c}`);
        }
        const contentText = lines.join('\n');

        // Border style sub-dictionary
        const bsDict = pdfDoc.context.obj({
          Type: PDFName.of('Border'),
          W:    PDFNumber.of(1.5),
          S:    PDFName.of('S'),
        });

        // FreeText annotation dictionary
        // C  = border color (blue)   IC = interior color (yellow)
        // DA = default appearance    F  = flags (4 = Print)
        const annotDict = pdfDoc.context.obj({
          Type:         PDFName.of('Annot'),
          Subtype:      PDFName.of('FreeText'),
          Rect:         [PADDING_X, yBot, PADDING_X + ANNO_W, yTop],
          Contents:     PDFString.of(contentText),
          T:            PDFString.of('VoltQC'),
          Subj:         PDFString.of('QC Failure'),
          DA:           PDFString.of('/Helv 7 Tf 0 0 0 rg'),
          Q:            PDFNumber.of(0),
          F:            PDFNumber.of(4),
          C:            [0.0, 0.47, 0.84],
          IC:           [1.0, 1.0, 0.0],
          BS:           bsDict,
          CreationDate: PDFString.of(
            `D:${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}Z`
          ),
        });

        newRefs.push(pdfDoc.context.register(annotDict));
      }

      // Write merged Annots array back to the page
      page.node.set(annotsKey, pdfDoc.context.obj([...existingRefs, ...newRefs]));
    }

    const annotatedBytes = await pdfDoc.save();
    const baseName = path.parse(doc.filename).name;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="annotated_${baseName}.pdf"`);
    res.send(Buffer.from(annotatedBytes));
  } catch(e) {
    console.error('Annotated export error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/dashboard', (req, res) => {
  const checklist = getChecklistData();
  let docs = [];
  try { docs = db.prepare('SELECT * FROM Documents').all(); } catch(e) {}
  let totalPoints = 0, passedPoints = 0;
  checklist.forEach(item => {
    const pts = parseFloat(item.Point_Value) || 0;
    if (item.Status !== 'N/A') totalPoints += pts;
    if (item.Status === 'YES') passedPoints += pts;
  });
  const score = totalPoints > 0 ? (passedPoints / totalPoints) * 100 : 0;
  res.json({
    overview: {
      projectName: 'VoltQC Project',
      projectPhase: 'VDC Review',
      totalItems: checklist.length,
      passedItems: checklist.filter(i => i.Status === 'YES').length,
      failedItems: checklist.filter(i => i.Status === 'NO').length,
      naItems: checklist.filter(i => i.Status === 'N/A').length,
      overallScore: Math.round(score * 100) / 100,
      threshold: 85,
      sheetsReviewed: docs.filter(d => d.classification).length,
      documentsUploaded: docs.length,
      lastReviewDate: new Date().toISOString(),
      reviewCycle: 'A',
    },
    trends: [{ date: '2026-06-06', score: Math.round(score * 100) / 100 }],
    breakdown: [],
    recentActivity: docs.slice(0, 5).map(d => ({
      type: 'document',
      msg: `${d.filename} ${d.classification ? 'profiled as ' + d.classification : 'uploaded'}`,
      timestamp: d.created_at
    }))
  });
});

app.post('/api/checklist/findings', (req, res) => {
  const { findings } = req.body;
  if (!findings || !Array.isArray(findings)) {
    return res.status(400).json({ error: 'findings array required' });
  }
  let updated = 0;
  const stmt = db.prepare("UPDATE QC_Checklist SET Status = ?, Comments = ? WHERE id = ?");
  for (const f of findings) {
    if (f.id) {
      stmt.run(f.status || 'YES', f.comment || 'AI verified', parseInt(f.id));
      updated++;
    }
  }
  res.json({ success: true, items_updated: updated });
});

app.patch('/api/checklist/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { Status, Comments } = req.body;
  try {
    if (Status) {
      db.prepare('UPDATE QC_Checklist SET Status = ? WHERE id = ?').run(Status, id);
    }
    if (Comments !== undefined) {
      db.prepare('UPDATE QC_Checklist SET Comments = ? WHERE id = ?').run(Comments, id);
    }
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/checklist/reset', (req, res) => {
  try {
    db.prepare("UPDATE QC_Checklist SET Status = 'Pending', Comments = ''").run();
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/documents/:id/analyze', async (req, res) => {
  try {
    const doc = db.prepare('SELECT * FROM Documents WHERE id = ?').get(parseInt(req.params.id));
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const filePath = resolveDocPath(doc);
    if (!filePath) return res.status(404).json({ error: 'File not found on disk' });
    const checklist = getChecklistData();
    const findings = await scanBlueprint(filePath, checklist);
    const stmt = db.prepare('UPDATE QC_Checklist SET Status = ?, Comments = ? WHERE id = ?');
    for (const f of findings) {
      if (f.id && f.status) stmt.run(f.status, f.comment || '', parseInt(f.id));
    }
    db.prepare("UPDATE Documents SET status = 'Completed' WHERE id = ?").run(doc.id);
    res.json({ success: true, items_updated: findings.length, findings });
  } catch(e) {
    console.error('Analyze error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/scan', async (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: 'filename required' });

  const filePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found. Please upload the blueprint first.' });
  }

  try {
    // Reset all checklist items to Pending before scanning so the score
    // reflects only the current document, not accumulated prior scans.
    db.prepare("UPDATE QC_Checklist SET Status = 'Pending', Comments = ''").run();
    // Re-apply permanent N/A defaults
    db.prepare("UPDATE QC_Checklist SET Status = 'N/A' WHERE Question LIKE '%feeder schedule%'").run();
    db.prepare("UPDATE QC_Checklist SET Status = 'N/A' WHERE Question LIKE '%sleeves evenly placed%'").run();
    db.prepare("UPDATE QC_Checklist SET Status = 'N/A' WHERE Question LIKE '%back edges of sleeves%'").run();

    const checklist = getChecklistData();
    const { sheet_number, sheet_title, findings } = await scanBlueprint(filePath, checklist);

    // Clear sheet info on all items before writing new results
    db.prepare("UPDATE QC_Checklist SET sheet_number = '', sheet_title = ''").run();

    const stmt = db.prepare('UPDATE QC_Checklist SET Status = ?, Comments = ?, sheet_number = ?, sheet_title = ? WHERE id = ?');
    for (const f of findings) {
      if (f.id && f.status) {
        stmt.run(f.status, f.comment || '', sheet_number, sheet_title, parseInt(f.id));
      }
    }

    // Mark the corresponding document as Completed and store sheet info
    try {
      const meta = (() => {
        const doc = db.prepare('SELECT metadata FROM Documents WHERE filename = ?').get(filename);
        try { return JSON.parse(doc?.metadata || '{}'); } catch(e) { return {}; }
      })();
      meta.sheet_number = sheet_number;
      meta.sheet_title  = sheet_title;
      db.prepare("UPDATE Documents SET status = 'Completed', metadata = ? WHERE filename = ?")
        .run(JSON.stringify(meta), filename);
    } catch(e) { /* non-fatal */ }

    res.json({
      success: true,
      items_updated: findings.length,
      sheet_number,
      sheet_title,
      findings
    });
  } catch(e) {
    console.error('Scan error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`VoltQC API server running on http://0.0.0.0:${PORT}`);
  console.log(`  Database: ${DB_PATH}`);
});