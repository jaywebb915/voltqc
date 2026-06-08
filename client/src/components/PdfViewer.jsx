import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker — Vite resolves import.meta.url correctly
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href;

const STATUS_COLORS = {
  YES:     { text: 'text-volt-green',  bg: 'bg-volt-green-bg',  border: 'border-volt-green/40'  },
  NO:      { text: 'text-volt-red',    bg: 'bg-volt-red-bg',    border: 'border-volt-red/40'    },
  'N/A':   { text: 'text-volt-amber',  bg: 'bg-volt-amber-bg',  border: 'border-volt-amber/40'  },
  Pending: { text: 'text-volt-text-muted', bg: 'bg-volt-surface2', border: 'border-volt-border' },
};

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
      <div className="w-16 h-16 rounded-full bg-volt-surface2 border border-volt-border flex items-center justify-center">
        <svg className="w-8 h-8 text-volt-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-volt-text mb-1">No blueprint loaded</p>
        <p className="text-xs text-volt-text-muted font-mono leading-relaxed">
          Upload a PDF in the Document Profiler tab —<br />it will appear here for inline review
        </p>
      </div>
    </div>
  );
}

export default function PdfViewer({ pdfUrl, selectedItem }) {
  const canvasRef   = useRef(null);
  const containerRef = useRef(null);
  const pdfRef      = useRef(null);   // loaded PDF document

  const [scale,       setScale]       = useState(1.5);
  const [pageNum,     setPageNum]     = useState(1);
  const [numPages,    setNumPages]    = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [renderTask,  setRenderTask]  = useState(null);

  // ── Load PDF whenever URL changes ──────────────────────────────────────────
  useEffect(() => {
    if (!pdfUrl) { pdfRef.current = null; setNumPages(0); return; }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setPageNum(1);

    pdfjsLib.getDocument(pdfUrl).promise.then(pdf => {
      if (cancelled) return;
      pdfRef.current = pdf;
      setNumPages(pdf.numPages);
      setLoading(false);
    }).catch(err => {
      if (cancelled) return;
      console.error('PDF load error:', err);
      setError('Could not load PDF: ' + err.message);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [pdfUrl]);

  // ── Render page whenever pageNum or scale changes ──────────────────────────
  useEffect(() => {
    if (!pdfRef.current || !canvasRef.current) return;

    // Cancel any in-progress render
    if (renderTask) {
      renderTask.cancel();
    }

    let cancelled = false;
    pdfRef.current.getPage(pageNum).then(page => {
      if (cancelled) return;
      const viewport = page.getViewport({ scale });
      const canvas   = canvasRef.current;
      if (!canvas) return;
      canvas.width  = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      const task = page.render({ canvasContext: ctx, viewport });
      setRenderTask(task);
      return task.promise;
    }).catch(err => {
      if (!cancelled && err.name !== 'RenderingCancelledException') {
        console.error('Render error:', err);
      }
    });

    return () => { cancelled = true; };
  }, [pageNum, scale, numPages]); // numPages dep triggers re-render after load

  const zoomIn  = useCallback(() => setScale(s => Math.min(+(s + 0.25).toFixed(2), 3.0)), []);
  const zoomOut = useCallback(() => setScale(s => Math.max(+(s - 0.25).toFixed(2), 0.5)), []);
  const zoomReset = useCallback(() => setScale(1.5), []);
  const prevPage  = useCallback(() => setPageNum(p => Math.max(1, p - 1)), []);
  const nextPage  = useCallback(() => setPageNum(p => Math.min(numPages, p + 1)), [numPages]);

  const pct = Math.round(scale * 100);

  // ── Derive item annotation bar data ────────────────────────────────────────
  const itemCfg = selectedItem
    ? (STATUS_COLORS[selectedItem.Status] || STATUS_COLORS.Pending)
    : null;

  return (
    <div className="flex flex-col h-full bg-volt-bg">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-volt-surface border-b border-volt-border shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-volt-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-xs font-mono text-volt-text-muted">
            {pdfUrl ? 'Blueprint PDF' : 'No document'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Page nav */}
          {numPages > 1 && (
            <>
              <button onClick={prevPage} disabled={pageNum <= 1}
                className="p-1.5 rounded hover:bg-volt-surface2 text-volt-text-muted disabled:opacity-30 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-[10px] font-mono text-volt-text-muted px-1">
                {pageNum} / {numPages}
              </span>
              <button onClick={nextPage} disabled={pageNum >= numPages}
                className="p-1.5 rounded hover:bg-volt-surface2 text-volt-text-muted disabled:opacity-30 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <span className="w-px h-4 bg-volt-border mx-1" />
            </>
          )}

          {/* Zoom controls */}
          <button onClick={zoomOut} className="p-1.5 rounded hover:bg-volt-surface2 text-volt-text-muted hover:text-volt-text transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button onClick={zoomReset}
            className="px-2 py-0.5 text-[10px] font-mono text-volt-text-muted hover:text-volt-text transition-colors rounded min-w-[44px] text-center">
            {pct}%
          </button>
          <button onClick={zoomIn} className="p-1.5 rounded hover:bg-volt-surface2 text-volt-text-muted hover:text-volt-text transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Selected item annotation strip ── */}
      {selectedItem && (
        <div className={`px-4 py-2 border-b border-volt-border flex items-start gap-3 shrink-0 ${itemCfg?.bg}`}>
          <div className={`shrink-0 px-2 py-0.5 rounded border text-[10px] font-mono font-bold mt-0.5 ${itemCfg?.text} ${itemCfg?.border}`}>
            {selectedItem.Status || 'PENDING'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-volt-text leading-snug truncate">{selectedItem.Question}</p>
            {selectedItem.Comments && (
              <p className="text-[10px] text-volt-text-muted font-mono mt-0.5 line-clamp-1">{selectedItem.Comments}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Canvas area ── */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-[#1a1a1a] flex items-start justify-center p-4">
        {!pdfUrl ? (
          <EmptyState />
        ) : loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <svg className="w-8 h-8 animate-spin text-volt-red" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#2A2A32" strokeWidth="2" />
              <path d="M12 2a10 10 0 019.95 9" stroke="#E31B23" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="text-xs font-mono text-volt-text-muted">Loading PDF…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
            <svg className="w-8 h-8 text-volt-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
            </svg>
            <p className="text-xs font-mono text-volt-red">{error}</p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="shadow-2xl rounded"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        )}
      </div>

      {/* ── Status bar ── */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-volt-surface border-t border-volt-border text-[10px] font-mono text-volt-text-muted shrink-0">
        <div className="flex items-center gap-4">
          {numPages > 0
            ? <span>Page {pageNum} of {numPages}</span>
            : <span>No document loaded</span>
          }
          <span>{pct}% zoom</span>
        </div>
        {selectedItem && (
          <span className={`${itemCfg?.text} flex items-center gap-1`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              selectedItem.Status === 'YES' ? 'bg-volt-green' :
              selectedItem.Status === 'NO'  ? 'bg-volt-red animate-pulse' :
              'bg-volt-amber'
            }`} />
            {selectedItem.Inspection_Type_Tag || 'CHECKLIST ITEM'}
          </span>
        )}
      </div>
    </div>
  );
}
