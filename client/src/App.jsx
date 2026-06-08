import React, { useState, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Scorecard from './components/Scorecard';
import PdfViewer from './components/PdfViewer';
import Header from './components/Header';
import DocumentUpload from './components/DocumentUpload';
import DocumentList from './components/DocumentList';
import DocumentDetail from './components/DocumentDetail';
import Dashboard from './components/Dashboard';
import ProjectMetadata from './components/ProjectMetadata';

const API_BASE = '/api';

export default function App() {
  // QC state
  const [sections,  setSections]  = useState([]);
  const [score,     setScore]     = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // Document Profiler state
  const [activeTab,   setActiveTab]   = useState('dashboard');
  const [documents,   setDocuments]   = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [activePdfId, setActivePdfId] = useState(null); // doc shown in QC PDF viewer

  // ─── QC Data ────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [cRes, sRes, secRes] = await Promise.all([
        fetch(`${API_BASE}/checklist`),
        fetch(`${API_BASE}/score`),
        fetch(`${API_BASE}/sections`),
      ]);
      if (!cRes.ok || !sRes.ok || !secRes.ok) throw new Error('Failed to fetch data');
      const [c, s, secs] = await Promise.all([cRes.json(), sRes.json(), secRes.json()]);
      setChecklist(c);
      setScore(s);
      setSections(secs);
    } catch (err) {
      console.error('API error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ─── Prime activePdfId from most recent document on startup ─────────────────
  useEffect(() => {
    fetch(`${API_BASE}/documents`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (data.length > 0) setActivePdfId(data[0].id); })
      .catch(() => {});
  }, []); // runs once

  // ─── Documents Data ──────────────────────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    setDocsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/documents`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
        if (data.length > 0 && !activePdfId) setActivePdfId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setDocsLoading(false);
    }
  }, [activePdfId]);

  useEffect(() => {
    if (activeTab === 'documents') {
      fetchDocuments();
      const interval = setInterval(fetchDocuments, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const handleUpload = useCallback((doc) => {
    setDocuments(prev => [doc, ...prev]);
    setSelectedDoc(doc);
    setActivePdfId(doc.id);
  }, []);

  const handleScanComplete = useCallback((docId) => {
    setActivePdfId(docId);
    fetchData();
    fetchDocuments();
  }, [fetchData]);

  const handleDeleteDoc = useCallback(async (id) => {
    try {
      await fetch(`${API_BASE}/documents/${id}`, { method: 'DELETE' });
      setDocuments(prev => prev.filter(d => d.id !== id));
      if (selectedDoc?.id === id) setSelectedDoc(null);
      if (activePdfId === id) setActivePdfId(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }, [selectedDoc, activePdfId]);

  const handleAnalyzeDoc = useCallback(async (doc) => {
    if (!doc?.id) return;
    try {
      const res = await fetch(`${API_BASE}/documents/${doc.id}/analyze`, { method: 'POST' });
      if (res.ok) { fetchDocuments(); fetchData(); }
    } catch (err) {
      console.error('Analysis failed:', err);
    }
  }, []);

  // ─── Checklist Actions ───────────────────────────────────────────────────────
  const handleStatusChange = useCallback(async (id, status) => {
    await fetch(`${API_BASE}/checklist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Status: status }),
    });
    fetchData();
  }, [fetchData]);

  const handleCommentSave = useCallback(async (id, comment) => {
    await fetch(`${API_BASE}/checklist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Comments: comment }),
    });
    fetchData();
  }, [fetchData]);

  const handleReset = useCallback(async () => {
    await fetch(`${API_BASE}/checklist/reset`, { method: 'POST' });
    fetchData();
  }, [fetchData]);

  // ─── Export PDF ──────────────────────────────────────────────────────────────
  const handleExportPdf = useCallback(() => {
    const meta = (() => {
      try { return JSON.parse(localStorage.getItem('voltqc_project_metadata') || '{}'); }
      catch { return {}; }
    })();

    const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = margin;

    // Header band
    doc.setFillColor(11, 11, 12);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setFontSize(16); doc.setTextColor(227, 27, 35); doc.setFont('helvetica', 'bold');
    doc.text('VoltQC', margin, 12);
    doc.setFontSize(8); doc.setTextColor(156, 163, 175); doc.setFont('helvetica', 'normal');
    doc.text('QUALITY CONTROL REPORT', margin, 19);
    doc.setFontSize(7);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - margin, 12, { align: 'right' });
    y = 36;

    // Project metadata
    const metaFields = [
      ['Project Name', meta.projectName], ['Project Number', meta.projectNumber],
      ['Project Address', meta.projectAddress], ['Review Type', meta.reviewType],
      ['Product Type', meta.productType], ['QA Specialist', meta.qaSpecialist],
      ['Date Reviewed', meta.dateReviewed], ['PDI Drawing Date', meta.pdiDrawingDate],
      ['Code Year', meta.codeYear], ['VDC Ops Manager', meta.vdcOpsManager],
      ['VDC PM', meta.vdcPM], ['VDC Designer', meta.vdcDesigner],
    ].filter(([, v]) => v);

    if (metaFields.length > 0) {
      doc.setFontSize(9); doc.setTextColor(227, 27, 35); doc.setFont('helvetica', 'bold');
      doc.text('PROJECT INFORMATION', margin, y); y += 5;
      autoTable(doc, {
        startY: y, margin: { left: margin, right: margin }, head: [], body: metaFields,
        styles: { fontSize: 8, cellPadding: 2, textColor: [229, 231, 235], fillColor: [19, 19, 22] },
        columnStyles: { 0: { fontStyle: 'bold', textColor: [156, 163, 175], cellWidth: 40 } },
        theme: 'plain',
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    // Overall score
    if (score) {
      const passed = score.percentage >= score.threshold;
      doc.setFontSize(9); doc.setTextColor(227, 27, 35); doc.setFont('helvetica', 'bold');
      doc.text('OVERALL SCORE', margin, y); y += 5;
      autoTable(doc, {
        startY: y, margin: { left: margin, right: margin },
        head: [['Score', 'Threshold', 'Status', 'Items Passed', 'Items Failed', 'N/A']],
        body: [[`${score.percentage.toFixed(1)}%`, `${score.threshold}%`,
          passed ? 'PASS' : 'FAIL', score.passedItems, score.failedItems, score.naItems]],
        headStyles: { fillColor: [42, 42, 50], textColor: [156, 163, 175], fontSize: 7, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9, fillColor: [19, 19, 22], textColor: [229, 231, 235] },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: passed ? [34, 197, 94] : [227, 27, 35] },
          2: { textColor: passed ? [34, 197, 94] : [227, 27, 35], fontStyle: 'bold' },
        },
        theme: 'plain',
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    // Section scores
    if (sections.length > 0) {
      doc.setFontSize(9); doc.setTextColor(227, 27, 35); doc.setFont('helvetica', 'bold');
      doc.text('SECTION SCORES', margin, y); y += 5;
      autoTable(doc, {
        startY: y, margin: { left: margin, right: margin },
        head: [['Section', 'Score', 'Points Earned', 'Points Possible', 'Status']],
        body: sections.map(s => [s.name, `${s.percentage.toFixed(1)}%`,
          s.passedPoints.toFixed(1), s.totalPoints.toFixed(1), s.percentage >= 85 ? 'PASS' : 'FAIL']),
        headStyles: { fillColor: [42, 42, 50], textColor: [156, 163, 175], fontSize: 7, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, fillColor: [19, 19, 22], textColor: [229, 231, 235] },
        didParseCell: (data) => {
          if (data.section !== 'body') return;
          if (data.column.index === 4)
            data.cell.styles.textColor = data.cell.raw === 'PASS' ? [34, 197, 94] : [227, 27, 35];
          if (data.column.index === 1)
            data.cell.styles.textColor = parseFloat(data.cell.raw) >= 85 ? [34, 197, 94] : [227, 27, 35];
        },
        theme: 'plain',
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    // Checklist items per section
    const bySec = {};
    for (const item of checklist) {
      const sec = item.Section || 'Uncategorized';
      if (!bySec[sec]) bySec[sec] = [];
      bySec[sec].push(item);
    }
    const statusColor = s =>
      s === 'YES' ? [34, 197, 94] : s === 'NO' ? [227, 27, 35] : s === 'N/A' ? [245, 158, 11] : [107, 114, 128];

    for (const [secName, items] of Object.entries(bySec)) {
      if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = margin; }
      doc.setFontSize(9); doc.setTextColor(227, 27, 35); doc.setFont('helvetica', 'bold');
      doc.text(secName.toUpperCase(), margin, y); y += 5;
      autoTable(doc, {
        startY: y, margin: { left: margin, right: margin },
        head: [['#', 'Question', 'Type', 'Pts', 'Response', 'Comments']],
        body: items.map((item, i) => [i + 1, item.Question, item.Inspection_Type_Tag || '',
          item.Point_Value || '', item.Status || 'Pending', item.Comments || '']),
        headStyles: { fillColor: [42, 42, 50], textColor: [156, 163, 175], fontSize: 7, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7, fillColor: [19, 19, 22], textColor: [229, 231, 235], minCellHeight: 6 },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 'auto' },
          2: { cellWidth: 24 }, 3: { cellWidth: 10, halign: 'center' },
          4: { cellWidth: 18, halign: 'center', fontStyle: 'bold' }, 5: { cellWidth: 40 },
        },
        didParseCell: (data) => {
          if (data.column.index === 4 && data.section === 'body')
            data.cell.styles.textColor = statusColor(data.cell.raw);
        },
        alternateRowStyles: { fillColor: [26, 26, 32] },
        theme: 'plain',
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    // Page numbers
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7); doc.setTextColor(107, 114, 128);
      doc.text(`Page ${i} of ${totalPages}  ·  VoltQC Quality Control Report`,
        pageW / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
    }

    const label = meta.projectName ? meta.projectName.replace(/[^a-zA-Z0-9]/g, '_') : 'VoltQC';
    doc.save(`${label}_QC_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [checklist, sections, score]);

  // ─── Loading / Error screens ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-volt-bg">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#2A2A32" strokeWidth="2" />
            <path d="M12 2a10 10 0 019.95 9" stroke="#E31B23" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p className="text-volt-text-muted font-mono text-sm">Initializing QC Engine…</p>
        </div>
      </div>
    );
  }

  if (error && activeTab === 'qc') {
    return (
      <div className="h-screen flex items-center justify-center bg-volt-bg">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-volt-text mb-2">Connection Error</h2>
          <p className="text-volt-text-muted text-sm mb-6">{error}</p>
          <button onClick={() => { setLoading(true); setError(null); fetchData(); }}
            className="px-6 py-2.5 bg-volt-red text-white rounded-lg font-medium text-sm hover:bg-volt-red-hover">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ─── Dashboard ───────────────────────────────────────────────────────────────
  if (activeTab === 'dashboard') {
    return (
      <div className="h-screen flex flex-col bg-volt-bg">
        <Header score={score} activeTab={activeTab} onTabChange={setActiveTab} />
        <Dashboard />
      </div>
    );
  }

  // ─── Document Profiler ───────────────────────────────────────────────────────
  if (activeTab === 'documents') {
    return (
      <div className="h-screen flex flex-col bg-volt-bg">
        <Header score={score} activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 flex overflow-hidden">
          <div className="w-[420px] min-w-[420px] flex flex-col border-r border-volt-border">
            <DocumentUpload onUpload={handleUpload} onScanComplete={handleScanComplete} />
            <div className="px-4 pb-2 flex items-center justify-between border-b border-volt-border">
              <span className="text-[10px] font-mono font-semibold text-volt-text-muted uppercase tracking-wider">
                Uploaded Documents
              </span>
              <span className="text-[10px] font-mono text-volt-text-muted">
                {documents.length} file{documents.length !== 1 ? 's' : ''}
              </span>
            </div>
            <DocumentList
              documents={documents}
              selectedId={selectedDoc?.id}
              onSelect={setSelectedDoc}
              onDelete={handleDeleteDoc}
            />
          </div>
          <div className="flex-1 flex flex-col">
            <DocumentDetail
              document={selectedDoc}
              onBack={() => setSelectedDoc(null)}
              onAnalyze={() => handleAnalyzeDoc(selectedDoc)}
            />
          </div>
        </div>
      </div>
    );
  }

  // ─── QC Checklist ────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-volt-bg">
      <Header score={score} activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 flex overflow-hidden">
        {/* Left: metadata + full scrollable checklist */}
        <div className="w-[480px] min-w-[480px] flex flex-col border-r border-volt-border">
          <ProjectMetadata />
          <Scorecard
            sections={sections}
            checklist={checklist}
            selectedItem={selectedItem}
            onItemClick={setSelectedItem}
            onStatusChange={handleStatusChange}
            onCommentSave={handleCommentSave}
            onReset={handleReset}
            onExport={handleExportPdf}
          />
        </div>
        {/* Right: real PDF viewer */}
        <div className="flex-1 flex flex-col">
          <PdfViewer
            pdfUrl={activePdfId ? `${API_BASE}/documents/${activePdfId}/file` : null}
            selectedItem={selectedItem}
          />
        </div>
      </div>
    </div>
  );
}
