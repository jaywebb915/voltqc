import React, { useState, useRef, useCallback } from 'react';

// phase: 'idle' | 'uploading' | 'scanning' | 'done' | 'error'
export default function DocumentUpload({ onUpload, onScanComplete }) {
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [scanSummary, setScanSummary] = useState(null); // persists after done
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (phase !== 'idle') return;
    setDragging(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    if (files.length > 0) handleFiles(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) handleFiles(files);
    e.target.value = '';
  };

  const readFileAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFiles = async (files) => {
    setScanSummary(null);

    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) {
        setPhase('error');
        setStatusMsg(`${file.name} exceeds 50MB limit`);
        return;
      }

      // ── Phase 1: Upload ──────────────────────────────────────────────────
      setPhase('uploading');
      setStatusMsg(`Uploading ${file.name}…`);

      let doc;
      try {
        const content = await readFileAsBase64(file);
        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, fileSize: file.size, content }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        doc = await res.json();
        if (onUpload) onUpload(doc);
      } catch (err) {
        setPhase('error');
        setStatusMsg(`Upload failed: ${err.message}`);
        return;
      }

      // ── Phase 2: Gemini Scan ─────────────────────────────────────────────
      setPhase('scanning');
      setStatusMsg(`Gemini is scanning ${file.name}…`);

      try {
        const scanRes = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name }),
        });
        const result = await scanRes.json();
        if (!scanRes.ok) throw new Error(result.error || `HTTP ${scanRes.status}`);

        const updated = result.items_updated || 0;
        setScanSummary({ filename: file.name, updated, docId: doc.id });
        setPhase('done');
        setStatusMsg(`Scan complete — ${updated} checklist item${updated !== 1 ? 's' : ''} updated`);
        if (onScanComplete) onScanComplete(doc.id);
      } catch (err) {
        setPhase('error');
        setStatusMsg(`Scan failed: ${err.message}`);
      }
    }
  };

  const busy = phase === 'uploading' || phase === 'scanning';

  return (
    <div className="p-4 flex flex-col gap-2">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !busy && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
          busy
            ? 'cursor-default border-volt-border bg-volt-surface/50'
            : 'cursor-pointer hover:border-volt-red/50 hover:bg-volt-surface'
        } ${dragging ? 'border-volt-red bg-volt-red-bg' : 'border-volt-border bg-volt-surface/50'}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {busy ? (
          /* ── Active State: spinner + live status ── */
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="relative">
              <svg className="w-10 h-10 animate-spin text-volt-red" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#2A2A32" strokeWidth="2" />
                <path d="M12 2a10 10 0 019.95 9" stroke="#E31B23" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {phase === 'scanning' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-volt-red animate-pulse" />
                </div>
              )}
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-sm font-semibold text-volt-text">
                {phase === 'uploading' ? 'Uploading…' : 'Scanning with Gemini AI…'}
              </p>
              <p className="text-[11px] font-mono text-volt-text-muted">{statusMsg}</p>
            </div>
          </div>
        ) : (
          /* ── Idle State: upload prompt ── */
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-volt-surface2 flex items-center justify-center border border-volt-border">
              <svg className="w-6 h-6 text-volt-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-volt-text">
                <span className="text-volt-red">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-volt-text-muted font-mono mt-0.5">
                PDF blueprints — E-sheets, riser diagrams, schedules
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="px-2 py-0.5 rounded bg-volt-surface border border-volt-border text-volt-text-muted">Max 50MB</span>
              <span className="px-2 py-0.5 rounded bg-volt-surface border border-volt-border text-volt-text-muted">PDF only</span>
              <span className="px-2 py-0.5 rounded bg-volt-green-bg border border-volt-green/30 text-volt-green">⚡ Auto-scan</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Status Banner (always visible after action) ── */}
      {(phase === 'done' || phase === 'error') && (
        <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-[11px] font-mono ${
          phase === 'error'
            ? 'bg-volt-red-bg border-volt-red/30 text-volt-red'
            : 'bg-volt-green-bg border-volt-green/30 text-volt-green'
        }`}>
          {phase === 'done' ? (
            <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
            </svg>
          )}
          <div className="flex-1">
            <span>{statusMsg}</span>
            {scanSummary && phase === 'done' && (
              <p className="text-[10px] text-volt-green/70 mt-0.5">
                Check the QC Checklist tab to review responses
              </p>
            )}
          </div>
          <button
            onClick={() => { setPhase('idle'); setStatusMsg(''); setScanSummary(null); }}
            className="opacity-50 hover:opacity-100 transition-opacity ml-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
