import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Worker resolved at module-init time so Vite can copy it to dist/assets
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href;

const STATUS_COLORS = {
  YES:     { text: 'text-volt-green', bg: 'bg-volt-green-bg',  border: 'border-volt-green/40'  },
  NO:      { text: 'text-volt-red',   bg: 'bg-volt-red-bg',    border: 'border-volt-red/40'    },
  'N/A':   { text: 'text-volt-amber', bg: 'bg-volt-amber-bg',  border: 'border-volt-amber/40'  },
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

// Relative URLs fail inside the pdfjs blob: worker context — make absolute.
function toAbsolute(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default function PdfViewer({ pdfUrl, selectedItem }) {
  const canvasRef      = useRef(null);
  const containerRef   = useRef(null);   // scroll container — used for fit-to-width
  const pdfRef         = useRef(null);
  const renderTaskRef  = useRef(null);

  const [scale,        setScale]        = useState(1.0);
  const [userRotation, setUserRotation] = useState(0);   // extra rotation (0/90/180/270)
  const [pageNum,      setPageNum]      = useState(1);
  const [numPages,     setNumPages]     = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [filename,     setFilename]     = useState('');

  // ── Fit-to-width helper ─────────────────────────────────────────────────────
  const fitToWidth = useCallback((page, rotation) => {
    const containerW = containerRef.current?.clientWidth ?? 800;
    // Use scale=1 viewport to get the natural page width at the given rotation
    const vp = page.getViewport({ scale: 1, rotation: rotation % 360 });
    // -32 for 2×16px padding inside the scroll area
    const fit = Math.max(0.3, Math.min((containerW - 32) / vp.width, 5.0));
    setScale(+fit.toFixed(3));
  }, []);

  // ── Load PDF ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const absUrl = toAbsolute(pdfUrl);
    if (!absUrl) {
      pdfRef.current = null;
      setNumPages(0);
      setFilename('');
      setUserRotation(0);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setPageNum(1);
    setUserRotation(0);

    try {
      const parts = new URL(absUrl).pathname.split('/');
      if (parts[parts.length - 1] === 'file') parts.pop();
      setFilename(decodeURIComponent(parts[parts.length - 1] || 'Blueprint PDF'));
    } catch { setFilename('Blueprint PDF'); }

    const loadTask = pdfjsLib.getDocument({ url: absUrl, withCredentials: false });
    loadTask.promise
      .then(async pdf => {
        if (cancelled) { pdf.destroy(); return; }
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);

        // Auto-fit page 1 to pane width on first load
        const page     = await pdf.getPage(1);
        const rotation = page.rotate; // embedded rotation
        fitToWidth(page, rotation);

        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('PDF load error:', err);
        setError(`Could not load PDF — ${err.message}`);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      loadTask.destroy?.();
    };
  }, [pdfUrl, fitToWidth]);

  // ── Render page ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pdfRef.current || !canvasRef.current || numPages === 0) return;

    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel(); } catch { /* ignored */ }
      renderTaskRef.current = null;
    }

    let stale = false;

    pdfRef.current.getPage(pageNum)
      .then(page => {
        if (stale || !canvasRef.current) return;

        // Combined rotation: page-embedded + user rotation offset
        const totalRotation = (page.rotate + userRotation) % 360;
        const viewport      = page.getViewport({ scale, rotation: totalRotation });
        const canvas        = canvasRef.current;
        const ctx           = canvas.getContext('2d');

        // Apply device pixel ratio for crisp rendering on HiDPI screens
        const dpr = window.devicePixelRatio || 1;
        canvas.width  = Math.floor(viewport.width  * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width  = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const task = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        return task.promise;
      })
      .catch(err => {
        if (stale) return;
        if (err?.name === 'RenderingCancelledException') return;
        console.error('Render error:', err);
      });

    return () => { stale = true; };
  }, [pageNum, scale, userRotation, numPages]);

  // ── Controls ────────────────────────────────────────────────────────────────
  const zoomIn    = useCallback(() => setScale(s => +(Math.min(s + 0.25, 5.0)).toFixed(3)), []);
  const zoomOut   = useCallback(() => setScale(s => +(Math.max(s - 0.25, 0.3)).toFixed(3)), []);

  // Fit-to-width: re-measure container and recalculate
  const zoomFit = useCallback(() => {
    if (!pdfRef.current || numPages === 0) return;
    pdfRef.current.getPage(pageNum).then(page => {
      fitToWidth(page, (page.rotate + userRotation) % 360);
    });
  }, [pageNum, numPages, userRotation, fitToWidth]);

  const rotateCW  = useCallback(() => setUserRotation(r => (r + 90)  % 360), []);

  const prevPage  = useCallback(() => setPageNum(p => Math.max(1, p - 1)), []);
  const nextPage  = useCallback(() => setPageNum(p => Math.min(numPages, p + 1)), [numPages]);

  const pct     = Math.round(scale * 100);
  const itemCfg = selectedItem ? (STATUS_COLORS[selectedItem.Status] || STATUS_COLORS.Pending) : null;

  return (
    <div className="flex flex-col h-full bg-volt-bg">

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 bg-volt-surface border-b border-volt-border shrink-0">
        {/* Left: filename */}
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-3.5 h-3.5 shrink-0 text-volt-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-[11px] font-mono text-volt-text-muted truncate max-w-[280px]" title={filename}>
            {filename || 'No document'}
          </span>
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Page navigation — only shown when PDF has multiple pages */}
          {numPages > 1 && (
            <>
              <button onClick={prevPage} disabled={pageNum <= 1}
                className="p-1.5 rounded hover:bg-volt-surface2 text-volt-text-muted disabled:opacity-30 transition-colors"
                title="Previous page">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-[10px] font-mono text-volt-text-muted px-1 tabular-nums select-none">
                {pageNum}/{numPages}
              </span>
              <button onClick={nextPage} disabled={pageNum >= numPages}
                className="p-1.5 rounded hover:bg-volt-surface2 text-volt-text-muted disabled:opacity-30 transition-colors"
                title="Next page">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <span className="w-px h-4 bg-volt-border mx-1" />
            </>
          )}

          {/* Rotate CW */}
          <button onClick={rotateCW}
            className="p-1.5 rounded hover:bg-volt-surface2 text-volt-text-muted hover:text-volt-text transition-colors"
            title="Rotate 90° clockwise">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <span className="w-px h-4 bg-volt-border mx-1" />

          {/* Zoom out */}
          <button onClick={zoomOut}
            className="p-1.5 rounded hover:bg-volt-surface2 text-volt-text-muted hover:text-volt-text transition-colors"
            title="Zoom out">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
          </button>

          {/* Zoom % — click to fit-to-width */}
          <button onClick={zoomFit}
            className="px-2 py-0.5 text-[10px] font-mono text-volt-text-muted hover:text-volt-text hover:bg-volt-surface2 rounded min-w-[46px] text-center transition-colors"
            title="Click to fit width">
            {pct}%
          </button>

          {/* Zoom in */}
          <button onClick={zoomIn}
            className="p-1.5 rounded hover:bg-volt-surface2 text-volt-text-muted hover:text-volt-text transition-colors"
            title="Zoom in">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Selected checklist item strip ────────────────────────────────── */}
      {selectedItem && (
        <div className={`px-4 py-2 border-b border-volt-border flex items-center gap-3 shrink-0 ${itemCfg?.bg}`}>
          <span className={`shrink-0 px-2 py-0.5 rounded border text-[10px] font-mono font-bold ${itemCfg?.text} ${itemCfg?.border}`}>
            {selectedItem.Status || 'PENDING'}
          </span>
          <span className="flex-1 min-w-0 text-xs text-volt-text truncate">{selectedItem.Question}</span>
          {selectedItem.Comments && (
            <span className="text-[10px] text-volt-text-muted font-mono truncate max-w-[200px]">{selectedItem.Comments}</span>
          )}
        </div>
      )}

      {/* ── Canvas / scroll area ──────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-[#111] flex items-start justify-center p-4"
      >
        {!pdfUrl ? (
          <EmptyState />
        ) : loading ? (
          <div className="flex flex-col items-center justify-center w-full h-full gap-3">
            <svg className="w-8 h-8 animate-spin text-volt-red" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#2A2A32" strokeWidth="2" />
              <path d="M12 2a10 10 0 019.95 9" stroke="#E31B23" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="text-xs font-mono text-volt-text-muted">Loading PDF…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center w-full h-full gap-3 text-center px-8">
            <svg className="w-8 h-8 text-volt-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
            </svg>
            <p className="text-xs font-mono text-volt-red">{error}</p>
          </div>
        ) : (
          <canvas ref={canvasRef} className="shadow-2xl rounded block" />
        )}
      </div>

      {/* ── Status bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-volt-surface border-t border-volt-border text-[10px] font-mono text-volt-text-muted shrink-0">
        <div className="flex items-center gap-4">
          {numPages > 0
            ? <span>Page {pageNum} of {numPages}</span>
            : <span>{pdfUrl ? 'Loading…' : 'No document loaded'}</span>
          }
          <span>{pct}% zoom</span>
          {userRotation !== 0 && <span>+{userRotation}° rotated</span>}
        </div>
        {selectedItem && itemCfg && (
          <span className={`${itemCfg.text} flex items-center gap-1`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              selectedItem.Status === 'YES' ? 'bg-volt-green' :
              selectedItem.Status === 'NO'  ? 'bg-volt-red animate-pulse' :
              'bg-volt-amber'
            }`} />
            {selectedItem.sheet_number || selectedItem.Inspection_Type_Tag || 'CHECKLIST ITEM'}
          </span>
        )}
      </div>
    </div>
  );
}
