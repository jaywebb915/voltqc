import React from 'react';

export default function Header({ score, activeTab, onTabChange }) {
  const passed = score?.passed;
  const pct = score?.percentage ?? 0;

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-volt-surface border-b border-volt-border shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-volt-red flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
            <path d="M13.5 2L4 21h16L13.5 2zm0 4.5L18.5 19H8.5l5-12.5zM12 15a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm0-5a1 1 0 00-1 1v2a1 1 0 002 0v-2a1 1 0 00-1-1z" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-volt-text leading-tight">VoltQC</h1>
          <p className="text-[10px] text-volt-text-muted font-mono leading-tight">Electrical Blueprint QC</p>
        </div>
      </div>

      {/* Tab Navigation */}
      {onTabChange && (
        <div className="flex items-center gap-1 bg-volt-bg rounded-lg p-0.5 border border-volt-border">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
              activeTab === 'dashboard'
                ? 'bg-volt-red text-white shadow-sm'
                : 'text-volt-text-muted hover:text-volt-text'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Dashboard
            </span>
          </button>
          <button
            onClick={() => onTabChange('qc')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
              activeTab === 'qc'
                ? 'bg-volt-red text-white shadow-sm'
                : 'text-volt-text-muted hover:text-volt-text'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              QC Checklist
            </span>
          </button>
          <button
            onClick={() => onTabChange('documents')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
              activeTab === 'documents'
                ? 'bg-volt-red text-white shadow-sm'
                : 'text-volt-text-muted hover:text-volt-text'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Document Profiler
            </span>
          </button>
        </div>
      )}

      <div className="flex items-center gap-6">
        {/* Status badge */}
        {score && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            passed ? 'bg-volt-green-bg text-volt-green' : 'bg-volt-red-bg text-volt-red'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${passed ? 'bg-volt-green' : 'bg-volt-red'} ${passed ? '' : 'animate-pulse-glow'}`} />
            {passed ? 'THRESHOLD MET' : 'THRESHOLD FAILED'}
          </div>
        )}
        <span className="text-[10px] text-volt-text-muted font-mono">v1.0.0-beta</span>
      </div>
    </header>
  );
}