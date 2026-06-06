import React, { useState, useEffect, useCallback } from 'react';
import Scorecard from './components/Scorecard';
import PdfViewer from './components/PdfViewer';
import Header from './components/Header';
import DocumentUpload from './components/DocumentUpload';
import DocumentList from './components/DocumentList';
import DocumentDetail from './components/DocumentDetail';
import Dashboard from './components/Dashboard';

const API_BASE = '/api';

export default function App() {
  // QC View state
  const [sections, setSections] = useState([]);
  const [score, setScore] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [error, setError] = useState(null);

  // Document Profiler state
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'qc' | 'documents'
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docsLoading, setDocsLoading] = useState(false);

  // ─── QC Data (Phase 1) ─────────────────────────────────────────────────────
  const fetchData = useCallback(async (isInitial = false) => {
    try {
      const [checklistRes, scoreRes, sectionsRes] = await Promise.all([
        fetch(`${API_BASE}/checklist`),
        fetch(`${API_BASE}/score`),
        fetch(`${API_BASE}/sections`),
      ]);
      if (!checklistRes.ok || !scoreRes.ok || !sectionsRes.ok) {
        throw new Error('Failed to fetch data');
      }
      const [c, s, secs] = await Promise.all([
        checklistRes.json(),
        scoreRes.json(),
        sectionsRes.json(),
      ]);
      setChecklist(c);
      setScore(s);
      setSections(secs);
      if (secs.length > 0) {
        setActiveSection(prev => prev || secs[0].name);
      }
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
  }, []);

  // ─── Documents Data (Phase 2) ──────────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    setDocsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/documents`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setDocsLoading(false);
    }
  }, []);

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
  }, []);

  const handleDeleteDoc = useCallback(async (id) => {
    try {
      await fetch(`${API_BASE}/documents/${id}`, { method: 'DELETE' });
      setDocuments(prev => prev.filter(d => d.id !== id));
      if (selectedDoc?.id === id) setSelectedDoc(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }, [selectedDoc]);

  // ─── AI Analysis Trigger (Phase 4) ────────────────────────────────────────
  const handleAnalyzeDoc = useCallback(async (doc) => {
    if (!doc || !doc.id) return;
    try {
      const res = await fetch(`${API_BASE}/documents/${doc.id}/analyze`, { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        console.log('Analysis complete:', result);
        // Refresh data
        fetchDocuments();
        fetchData();
      }
    } catch (err) {
      console.error('Analysis trigger failed:', err);
    }
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleItemClick = (item) => setSelectedItem(item);
  const handleSectionChange = (sectionName) => setActiveSection(sectionName);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-volt-bg">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#2A2A32" strokeWidth="2" />
            <path d="M12 2a10 10 0 019.95 9" stroke="#E31B23" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p className="text-volt-text-dim font-mono text-sm">Initializing QC Engine...</p>
        </div>
      </div>
    );
  }

  if (error && activeTab === 'qc') {
    return (
      <div className="h-screen flex items-center justify-center bg-volt-bg">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-volt-red-bg flex items-center justify-center">
            <svg className="w-8 h-8 text-volt-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-volt-text mb-2">Connection Error</h2>
          <p className="text-volt-text-dim text-sm mb-6">Unable to reach the QC backend. Ensure the API server is running.</p>
          <button
            onClick={() => { setLoading(true); setError(null); fetchData(); }}
            className="px-6 py-2.5 bg-volt-red text-white rounded-lg font-medium text-sm hover:bg-volt-red-hover transition-all duration-200"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const currentSection = sections.find(s => s.name === activeSection) || sections[0];

  // ─── Dashboard View (Phase 3) ──────────────────────────────────────────────
  if (activeTab === 'dashboard') {
    return (
      <div className="h-screen flex flex-col bg-volt-bg">
        <Header score={score} activeTab={activeTab} onTabChange={setActiveTab} />
        <Dashboard />
      </div>
    );
  }

  // ─── Document Profiler View ─────────────────────────────────────────────────
  if (activeTab === 'documents') {
    return (
      <div className="h-screen flex flex-col bg-volt-bg">
        <Header score={score} activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Upload zone + Document list */}
          <div className="w-[420px] min-w-[420px] flex flex-col border-r border-volt-border">
            <DocumentUpload onUpload={handleUpload} />
            <div className="px-4 pb-2 flex items-center justify-between border-b border-volt-border">
              <span className="text-[10px] font-mono font-semibold text-volt-text-dim uppercase tracking-wider">
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
          {/* Right: Document detail */}
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

  // ─── QC View (Phase 1) ──────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-volt-bg">
      <Header score={score} activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 flex overflow-hidden">
        <div className="w-[480px] min-w-[480px] flex flex-col border-r border-volt-border">
          <Scorecard
            sections={sections}
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            checklist={checklist.filter(i => (i.Section || 'Uncategorized') === activeSection)}
            selectedItem={selectedItem}
            onItemClick={handleItemClick}
            currentSection={currentSection}
          />
        </div>
        <div className="flex-1 flex flex-col">
          <PdfViewer selectedItem={selectedItem} />
        </div>
      </div>
    </div>
  );
}