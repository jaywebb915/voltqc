import { scanBlueprint } from './gemini_scan.js';
import dotenv from 'dotenv';
dotenv.config();

import Database from 'better-sqlite3';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4010;
const DB_PATH = path.join(__dirname, '../voltqc.db');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const db = new Database(DB_PATH);

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
  res.json(Object.values(sections).map(s => ({
    ...s,
    percentage: s.totalPoints > 0 ? Math.round((s.passedPoints / s.totalPoints) * 10000) / 100 : 0
  })));
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
  if (content) {
    const buffer = Buffer.from(content, 'base64');
    fs.writeFileSync(filepath, buffer);
  } else {
    fs.writeFileSync(filepath, 'Mock content for ' + filename);
  }
  const stmt = db.prepare("INSERT INTO Documents (filename, filepath, status) VALUES (?, ?, 'Queued')");
  const result = stmt.run(filename, filepath);
  res.status(201).json({ id: result.lastInsertRowid, filename, status: 'Queued' });
});

app.delete('/api/documents/:id', (req, res) => {
  db.prepare('DELETE FROM Documents WHERE id = ?').run(parseInt(req.params.id));
  res.json({ success: true });
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

app.post('/api/scan', async (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: 'filename required' });
  
  const filePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found. Please upload the blueprint first.' });
  }

  try {
    const checklist = getChecklistData();
    const findings = await scanBlueprint(filePath, checklist);
    
    const stmt = db.prepare('UPDATE QC_Checklist SET Status = ?, Comments = ? WHERE id = ?');
    for (const f of findings) {
      if (f.id && f.status) {
        stmt.run(f.status, f.comment || '', parseInt(f.id));
      }
    }

    res.json({ 
      success: true, 
      items_updated: findings.length,
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