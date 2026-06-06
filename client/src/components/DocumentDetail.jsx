import React from 'react';

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 px-4 even:bg-volt-surface/50">
      <span className="text-xs text-volt-text-muted font-mono">{label}</span>
      <span className="text-xs text-volt-text font-medium">{value || '—'}</span>
    </div>
  );
}

export default function DocumentDetail({ document: doc, onBack, onAnalyze }) {
  if (!doc) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-volt-text-muted">
          <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-mono">Select a document to view details</p>
        </div>
      </div>
    );
  }

  const { sheet_type, floor_number, building_area, analysis_details } = doc;
  const isCompleted = doc.status === 'Completed';

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-volt-surface border-b border-volt-border shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded hover:bg-volt-surface2 text-volt-text-dim hover:text-volt-text transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h3 className="text-sm font-semibold text-volt-text truncate max-w-[280px]">{doc.filename}</h3>
            <p className="text-[10px] font-mono text-volt-text-muted">Document Profiler Report</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {doc.status === 'Processing' && (
            <span className="flex items-center gap-1.5 text-blue-400 text-[10px] font-mono">
              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Analyzing...
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Status Banner */}
        <div className={`px-4 py-2.5 border-b border-volt-border flex items-center gap-2 ${
          doc.status === 'Completed' ? 'bg-volt-green-bg/30' :
          doc.status === 'Processing' ? 'bg-blue-900/10' :
          'bg-volt-amber-bg/30'
        }`}>
          {doc.status === 'Completed' && (
            <svg className="w-4 h-4 text-volt-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          <span className={`text-xs font-semibold font-mono ${
            doc.status === 'Completed' ? 'text-volt-green' :
            doc.status === 'Processing' ? 'text-blue-400' :
            'text-volt-amber'
          }`}>
            {doc.status === 'Completed' ? 'Analysis Complete' :
             doc.status === 'Processing' ? 'Document Profiler Running' :
             'Awaiting Processing'}
          </span>
          <span className="text-[10px] font-mono text-volt-text-muted ml-auto">
            ID: {String(doc.id).padStart(4, '0')}
          </span>
        </div>

        {/* File Info Section */}
        <div className="border-b border-volt-border">
          <div className="px-4 py-2 bg-volt-surface/80">
            <span className="text-[10px] font-mono font-semibold text-volt-text-dim uppercase tracking-wider">File Info</span>
          </div>
          <DetailRow label="Filename" value={doc.filename} />
          <DetailRow label="Size" value={doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : '—'} />
          <DetailRow label="Uploaded" value={doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString() : '—'} />
          <DetailRow label="Status" value={doc.status} />
        </div>

        {/* Profiled Metadata Section */}
        <div className="border-b border-volt-border">
          <div className="px-4 py-2 bg-volt-surface/80">
            <span className="text-[10px] font-mono font-semibold text-volt-text-dim uppercase tracking-wider">
              Profiled Metadata
              {!isCompleted && <span className="text-volt-amber ml-1">(pending)</span>}
            </span>
          </div>
          <DetailRow label="Sheet Type" value={sheet_type} />
          <DetailRow label="Floor Number" value={floor_number} />
          <DetailRow label="Building Area" value={building_area} />
        </div>

        {/* Analysis Details Section (only when completed) */}
        {isCompleted && analysis_details && (
          <div className="border-b border-volt-border">
            <div className="px-4 py-2 bg-volt-surface/80">
              <span className="text-[10px] font-mono font-semibold text-volt-text-dim uppercase tracking-wider">Analysis Results</span>
            </div>
            <DetailRow label="Sheets Detected" value={analysis_details.sheets_detected} />
            <DetailRow label="Scale" value={analysis_details.scale} />
            <DetailRow label="Revision" value={analysis_details.revision} />
            <DetailRow label="Detected Issues" value={analysis_details.detected_issues} />
            {analysis_details.panel_count && (
              <DetailRow label="Panel Count" value={analysis_details.panel_count} />
            )}
            {analysis_details.fixture_count && (
              <DetailRow label="Fixture Count" value={analysis_details.fixture_count} />
            )}
            {analysis_details.project && (
              <DetailRow label="Project" value={analysis_details.project} />
            )}
            {analysis_details.engineer_seal !== undefined && (
              <DetailRow label="Engineer Seal" value={analysis_details.engineer_seal ? 'Present' : 'Not detected'} />
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="p-4">
          {isCompleted && (
            <button 
              onClick={onAnalyze}
              className="w-full py-2 px-4 bg-volt-red text-white text-xs font-semibold rounded-lg hover:bg-volt-red-hover transition-colors"
            >
              Run QC Analysis on Document
            </button>
          )}
        </div>
      </div>
    </div>
  );
}