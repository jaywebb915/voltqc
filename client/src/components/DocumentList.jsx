import React, { useState } from 'react';

const STATUS_CONFIG = {
  Queued: { bg: 'bg-volt-amber-bg', text: 'text-volt-amber', dot: 'bg-volt-amber', icon: 'clock' },
  Processing: { bg: 'bg-blue-900/20', text: 'text-blue-400', dot: 'bg-blue-400', icon: 'spinner' },
  Completed: { bg: 'bg-volt-green-bg', text: 'text-volt-green', dot: 'bg-volt-green', icon: 'check' },
  Failed: { bg: 'bg-volt-red-bg', text: 'text-volt-red', dot: 'bg-volt-red', icon: 'x' },
};

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Queued;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${status === 'Processing' ? 'animate-pulse' : ''}`} />
      {status}
    </span>
  );
}

export default function DocumentList({ documents, selectedId, onSelect, onDelete }) {
  const [hoveredId, setHoveredId] = useState(null);

  if (documents.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-10 h-10 mx-auto mb-3 text-volt-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-volt-text-muted font-mono">No documents uploaded</p>
          <p className="text-xs text-volt-text-dim mt-1">Upload PDF blueprints above</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="divide-y divide-volt-border">
        {documents.map(doc => (
          <div
            key={doc.id}
            onMouseEnter={() => setHoveredId(doc.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={`group relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-150 ${
              selectedId === doc.id
                ? 'bg-volt-surface2 border-l-2 border-volt-red'
                : 'hover:bg-volt-surface2/50 border-l-2 border-transparent'
            }`}
            onClick={() => onSelect(doc)}
          >
            {/* File icon */}
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              doc.status === 'Completed' ? 'bg-volt-green-bg' : 'bg-volt-surface'
            }`}>
              <svg className={`w-5 h-5 ${doc.status === 'Completed' ? 'text-volt-green' : 'text-volt-text-dim'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-volt-text truncate">{doc.filename}</p>
              <div className="flex items-center gap-3 mt-1">
                <StatusBadge status={doc.status} />
                <span className="text-[10px] font-mono text-volt-text-muted">{formatSize(doc.file_size)}</span>
                <span className="text-[10px] font-mono text-volt-text-muted">{formatDate(doc.uploaded_at)}</span>
              </div>
            </div>

            {/* Delete button */}
            {hoveredId === doc.id && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
                className="p-1.5 rounded hover:bg-volt-red-bg text-volt-text-muted hover:text-volt-red transition-colors"
                title="Remove document"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}