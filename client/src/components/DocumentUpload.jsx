import React, { useState, useRef, useCallback } from 'react';

export default function DocumentUpload({ onUpload }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleFiles(files);
  }, []);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) handleFiles(files);
  };

  const handleFiles = async (files) => {
    setUploading(true);
    for (const file of files) {
      try {
        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, fileSize: file.size }),
        });
        if (res.ok) {
          const doc = await res.json();
          if (onUpload) onUpload(doc);
        }
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
    setUploading(false);
  };

  return (
    <div className="p-4">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          dragging
            ? 'border-volt-red bg-volt-red-bg'
            : 'border-volt-border hover:border-volt-red/50 bg-volt-surface/50 hover:bg-volt-surface'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <svg className="w-10 h-10 animate-spin text-volt-red" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#2A2A32" strokeWidth="2" />
              <path d="M12 2a10 10 0 019.95 9" stroke="#E31B23" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="text-sm text-volt-text-dim font-mono">Processing upload...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {/* Upload icon */}
            <div className="w-14 h-14 rounded-full bg-volt-surface2 flex items-center justify-center border border-volt-border">
              <svg className="w-7 h-7 text-volt-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-volt-text">
                <span className="text-volt-red">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-volt-text-muted font-mono mt-1">
                PDF blueprints — E-sheets, riser diagrams, details
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-volt-text-muted">
              <span className="px-2 py-0.5 rounded bg-volt-surface border border-volt-border">Max 50MB</span>
              <span className="px-2 py-0.5 rounded bg-volt-surface border border-volt-border">PDF only</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}