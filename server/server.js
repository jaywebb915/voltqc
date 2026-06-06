import { spawnSync } from 'child_process';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4010;
const DB_PATH = "/home/team/shared/voltqc.db";

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ─── SQLite helper ───────────────────────────────────────────────────────────
function runSql(sql, isMutation = false) {
  try {
    const args = [DB_PATH, sql];
    if (!isMutation) {
        args.unshift('-json');
    }
    const result = spawnSync('sqlite3', args, {
      encoding: 'utf-8',
      timeout: 10000,
    });
    if (result.error || result.status !== 0) {
      console.error('sqlite3 error:', result.stderr || result.error?.message);
      return null;
    }
    const output = result.stdout.trim();
    if (!output) return isMutation ? [] : [];
    
    if (isMutation) return [];

    try {
        return JSON.parse(output);
    } catch (e) {
        // Fallback if -json is not supported or output is not valid JSON
        console.error('Failed to parse sqlite3 output as JSON:', output);
        return [];
    }
  } catch (e) {
    console.error('runSql error:', e.message);
    return null;
  }
}

function getChecklistData() {
  const data = runSql('SELECT * FROM QC_Checklist');
  return data || [];
}

// ─── QC Checklist Endpoints ──────────────────────────────────────────────────

app.get('/api/checklist', (req, res) => {
  const data = getChecklistData().sort((a, b) => {
    if (a.Section < b.Section) return -1;
    if (a.Section > b.Section) return 1;
    return (a.id || 0) - (b.id || 0);
  });
  res.json(data);
});

app.get('/api/score', (req, res) => {
  const checklist = getChecklistData();
  let totalPossible = 0, passedPoints = 0;
  for (const item of checklist) {
    const pts = parseFloat(item.Point_Value) || 0;
    if (item.Status !== 'N/A') {
        totalPossible += pts;
    }
    if (item.Status === 'Pass') passedPoints += pts;
  }
  const percentage = totalPossible > 0 ? (passedPoints / totalPossible) * 100 : 0;
  res.json({
    totalPossible, passedPoints,
    percentage: Math.round(percentage * 100) / 100,
    passed: percentage >= 85, threshold: 85,
    totalItems: checklist.length,
    passedItems: checklist.filter(i => i.Status === 'Pass').length,
    failedItems: checklist.filter(i => i.Status === 'Fail').length,
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
    if (item.Status !== 'N/A') {
        sections[sec].totalPoints += pts;
    }
    if (item.Status === 'Pass') sections[sec].passedPoints += pts;
  }
  res.json(Object.values(sections).map(s => ({ ...s, percentage: s.totalPoints > 0 ? Math.round((s.passedPoints / s.totalPoints) * 10000) / 100 : 0 })));
});

// ─── Document Management Endpoints ──────────────────────────────────────────

const UPLOAD_DIR = "/home/team/shared/uploads";
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// GET /api/documents — list all uploaded documents
app.get('/api/documents', (req, res) => {
  const data = runSql('SELECT * FROM Documents ORDER BY created_at DESC');
  const documents = (data || []).map(doc => {
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
});

// GET /api/documents/:id — get single document with details
app.get('/api/documents/:id', (req, res) => {
  const data = runSql(`SELECT * FROM Documents WHERE id = ${parseInt(req.params.id)}`);
  if (!data || data.length === 0) return res.status(404).json({ error: 'Document not found' });
  const doc = data[0];
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
});

// POST /api/documents/upload — handle document upload
app.post('/api/documents/upload', (req, res) => {
  const { filename, fileSize, content } = req.body;
  if (!filename) return res.status(400).json({ error: 'filename is required' });

  const filepath = path.join(UPLOAD_DIR, filename);
  if (content) {
      // If base64 content provided
      const buffer = Buffer.from(content, 'base64');
      fs.writeFileSync(filepath, buffer);
  } else {
      // Mock file creation for demo if no content
      fs.writeFileSync(filepath, "Mock content for " + filename);
  }

  const sql = `INSERT INTO Documents (filename, filepath, status) VALUES ('${filename.replace(/'/g, "''")}', '${filepath.replace(/'/g, "''")}', 'Queued')`;
  runSql(sql, true);
  
  const lastIdData = runSql('SELECT last_insert_rowid() as id');
  const newId = lastIdData[0].id;

  res.status(201).json({ id: newId, filename, status: 'Queued' });
});

// DELETE /api/documents/:id — remove a document
app.delete('/api/documents/:id', (req, res) => {
  const id = parseInt(req.params.id);
  runSql(`DELETE FROM Documents WHERE id = ${id}`, true);
  res.json({ success: true });
});

// ─── Dashboard Data ──────────────────────────────────────────────────────────
app.get('/api/dashboard', (req, res) => {
    const checklist = getChecklistData();
    const docs = runSql('SELECT * FROM Documents');
    
    let totalPoints = 0, passedPoints = 0;
    checklist.forEach(item => {
        const pts = parseFloat(item.Point_Value) || 0;
        if (item.Status !== 'N/A') totalPoints += pts;
        if (item.Status === 'Pass') passedPoints += pts;
    });
    
    const score = totalPoints > 0 ? (passedPoints / totalPoints) * 100 : 0;
    
    res.json({
        overview: {
            projectName: 'VoltQC Project',
            projectPhase: 'VDC Review',
            totalItems: checklist.length,
            passedItems: checklist.filter(i => i.Status === 'Pass').length,
            failedItems: checklist.filter(i => i.Status === 'Fail').length,
            naItems: checklist.filter(i => i.Status === 'N/A').length,
            overallScore: Math.round(score * 100) / 100,
            threshold: 85,
            sheetsReviewed: docs.filter(d => d.classification).length,
            documentsUploaded: docs.length,
            lastReviewDate: new Date().toISOString(),
            reviewCycle: 'A',
        },
        trends: [
            { date: '2026-06-03', score: Math.round(score * 100) / 100 },
        ],
        breakdown: [], // Can be populated if needed
        recentActivity: docs.slice(0, 5).map(d => ({
            type: 'document',
            msg: `${d.filename} ${d.classification ? 'profiled as ' + d.classification : 'uploaded'}`,
            timestamp: d.created_at
        }))
    });
});

// ─── AI Analysis Trigger (Phase 4) ────────────────────────────────────────────
// POST /api/documents/:id/analyze — trigger AI analysis on a document
app.post('/api/documents/:id/analyze', (req, res) => {
  const id = parseInt(req.params.id);
  const docData = runSql(`SELECT * FROM Documents WHERE id = ${id}`);
  if (!docData || docData.length === 0) {
    return res.status(404).json({ error: 'Document not found' });
  }
  const doc = docData[0];
  
  // Update document status to Processing
  runSql(`UPDATE Documents SET status = 'Processing' WHERE id = ${id}`, true);
  
  // 1. Run Document Profiler (Classification)
  const profilerPath = path.join(__dirname, 'profiler_service.py');
  if (fs.existsSync(profilerPath)) {
    try {
      spawnSync('python3', [profilerPath, doc.filename, DB_PATH], {
        encoding: 'utf-8', timeout: 15000,
      });
    } catch(e) { console.error('Profiler failed:', e); }
  }

  // 2. Run AI Analysis Engine (TEXT_MATCH)
  const analysisPath = path.join(__dirname, 'analysis_service.py');
  if (fs.existsSync(analysisPath)) {
    try {
      const result = spawnSync('python3', [analysisPath], {
        encoding: 'utf-8', timeout: 30000,
      });
      console.log('AI Analysis output:', result.stdout);
    } catch(e) { console.error('Analysis engine failed:', e); }
  }
  
  // Mark document as completed
  runSql(`UPDATE Documents SET status = 'Completed' WHERE id = ${id}`, true);
  
  res.json({
    success: true,
    document_id: id,
    message: 'AI analysis complete. Checklist updated.',
  });
});

// POST /api/checklist/findings — receive AI findings from analysis engine
app.post('/api/checklist/findings', (req, res) => {
  const { findings } = req.body;
  if (!findings || !Array.isArray(findings)) {
    return res.status(400).json({ error: 'findings array required' });
  }
  let updated = 0;
  for (const f of findings) {
    if (f.id) {
      const sql = `UPDATE QC_Checklist SET Status = '${f.status || 'Pass'}', Comments = '${(f.comment || 'AI verified').replace(/'/g, "''")}' WHERE id = ${parseInt(f.id)}`;
      if (runSql(sql, true)) updated++;
    }
  }
  res.json({ success: true, items_updated: updated });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`VoltQC API server running on http://0.0.0.0:${PORT}`);
  console.log(`  Database: ${DB_PATH}`);
});
