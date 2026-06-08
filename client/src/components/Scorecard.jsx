import React, { useState } from 'react';
import ScoreRing from './ScoreRing';

const STATUS_CONFIG = {
  YES: { bg: 'bg-volt-green-bg', text: 'text-volt-green', dot: 'bg-volt-green', label: 'YES' },
  NO: { bg: 'bg-volt-red-bg', text: 'text-volt-red', dot: 'bg-volt-red', label: 'NO' },
  'N/A': { bg: 'bg-volt-amber-bg', text: 'text-volt-amber', dot: 'bg-volt-amber', label: 'N/A' },
  Pending: { bg: 'bg-volt-surface-bg', text: 'text-volt-text-muted', dot: 'bg-volt-text-muted', label: 'PENDING' },
};

function SectionTab({ name, active, passed, failed, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition-all duration-200 whitespace-nowrap ${
        isSelected
          ? 'text-volt-text bg-volt-surface2 border-b-2 border-volt-red'
          : 'text-volt-text-muted hover:text-volt-text hover:bg-volt-surface2/50 border-b-2 border-transparent'
      }`}
    >
      {name}
      {(passed > 0 || failed > 0) && (
        <div className="flex items-center gap-1.5 ml-1">
          {passed > 0 && (
            <span className="text-[9px] font-mono text-volt-green">{passed}</span>
          )}
          {failed > 0 && (
            <span className="text-[9px] font-mono text-volt-red">{failed}</span>
          )}
        </div>
      )}
    </button>
  );
}

function ChecklistItem({ item, isSelected, onClick, onStatusChange, onCommentSave }) {
  const cfg = STATUS_CONFIG[item.Status] || STATUS_CONFIG['Pending'];
  const [showActions, setShowActions] = useState(false);
  const [localComment, setLocalComment] = useState(item.Comments || '');

  const handleClick = () => {
    onClick(item);
    setShowActions(!showActions || !isSelected);
  };

  const handleStatus = (e, status) => {
    e.stopPropagation();
    onStatusChange(item.id, status);
  };

  const handleCommentBlur = () => {
    if (localComment !== (item.Comments || '')) {
      onCommentSave(item.id, localComment);
    }
  };

  // Sync local comment if item.Comments changes externally
  React.useEffect(() => {
    setLocalComment(item.Comments || '');
  }, [item.Comments]);

  return (
    <div
      className={`w-full text-left animate-slide-up ${
        isSelected ? 'bg-volt-surface2' : 'hover:bg-volt-surface2/50'
      } transition-all duration-150 border-l-2 ${
        isSelected ? 'border-volt-red' : 'border-transparent'
      }`}
    >
      <div className="px-4 py-3 cursor-pointer" onClick={handleClick}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
              <span className={`text-[10px] font-mono font-semibold uppercase ${cfg.text}`}>
                {cfg.label}
              </span>
              {item.Inspection_Type_Tag && (
                <span className="text-[9px] font-mono text-volt-text-muted bg-volt-surface px-1.5 py-0.5 rounded">
                  {item.Inspection_Type_Tag}
                </span>
              )}
              <span className="text-[10px] font-mono text-volt-text-muted">
                {item.Point_Value}pts
              </span>
            </div>
            <p className="text-sm text-volt-text leading-snug">{item.Question}</p>
            {item.Comments && !showActions && (
              <p className="text-[11px] text-volt-text-muted mt-1.5 line-clamp-2">{item.Comments}</p>
            )}
          </div>
        </div>
      </div>
      {isSelected && showActions && (
        <div className="px-4 pb-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-volt-text-muted mr-1">RESPONSE:</span>
            {['YES', 'NO', 'N/A'].map(status => (
              <button
                key={status}
                onClick={e => handleStatus(e, status)}
                className={`px-3 py-1 text-[11px] font-mono rounded border transition-all ${
                  item.Status === status
                    ? status === 'YES'
                      ? 'bg-volt-green-bg border-volt-green text-volt-green'
                      : status === 'NO'
                      ? 'bg-volt-red-bg border-volt-red text-volt-red'
                      : 'bg-volt-amber-bg border-volt-amber text-volt-amber'
                    : 'border-volt-border text-volt-text-muted hover:border-volt-text hover:text-volt-text'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <div onClick={e => e.stopPropagation()}>
            <label className="block text-[9px] font-mono text-volt-text-muted uppercase mb-1">
              Comments
            </label>
            <textarea
              value={localComment}
              onChange={e => setLocalComment(e.target.value)}
              onBlur={handleCommentBlur}
              placeholder="Add a comment or finding..."
              rows={2}
              className="w-full bg-volt-bg border border-volt-border rounded px-2 py-1.5 text-[11px] text-volt-text placeholder-volt-text-muted focus:outline-none focus:border-volt-red resize-none font-mono"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Scorecard({
  sections,
  activeSection,
  onSectionChange,
  checklist,
  selectedItem,
  onItemClick,
  currentSection,
  onStatusChange,
  onCommentSave,
  onReset,
  onExport,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [resetting, setResetting] = useState(false);

  const filteredItems = checklist.filter(item =>
    !searchQuery || item.Question.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sectionFailCounts = {};
  const sectionPassCounts = {};
  for (const sec of sections) {
    sectionFailCounts[sec.name] = sec.items?.filter(i => i.Status === 'NO').length || 0;
    sectionPassCounts[sec.name] = sec.items?.filter(i => i.Status === 'YES').length || 0;
  }

  const handleReset = async () => {
    if (!window.confirm('Reset all checklist responses to Pending? This cannot be undone.')) return;
    setResetting(true);
    await onReset?.();
    setResetting(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Section Tabs */}
      <div className="flex overflow-x-auto border-b border-volt-border bg-volt-surface shrink-0 scrollbar-none">
        {sections.map(sec => (
          <SectionTab
            key={sec.name}
            name={sec.name}
            passed={sectionPassCounts[sec.name]}
            failed={sectionFailCounts[sec.name]}
            isSelected={activeSection === sec.name}
            onClick={() => onSectionChange(sec.name)}
          />
        ))}
      </div>

      {/* Section Summary Bar */}
      {currentSection && (
        <div className="px-4 py-3 bg-volt-surface border-b border-volt-border shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-volt-text">{currentSection.name}</h2>
              <p className="text-[10px] text-volt-text-muted font-mono">
                {currentSection.items?.length || 0} checks · {currentSection.totalPoints} possible pts
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1.5 rounded-full border ${
                currentSection.percentage >= 85
                  ? 'border-volt-green bg-volt-green-bg'
                  : 'border-volt-red bg-volt-red-bg'
              }`}>
                <span className={`text-sm font-bold font-mono ${
                  currentSection.percentage >= 85 ? 'text-volt-green' : 'text-volt-red'
                }`}>
                  {currentSection.percentage.toFixed(1)}
                </span>
                <span className="text-[9px] font-mono text-volt-text-muted ml-1">SCORE</span>
              </div>
            </div>
          </div>
          <div className="mt-2 h-1 bg-volt-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                currentSection.percentage >= 85 ? 'bg-volt-green' : 'bg-volt-red'
              }`}
              style={{ width: `${Math.min(currentSection.percentage, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-4 py-2 border-b border-volt-border shrink-0">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-volt-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search checklist items..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-volt-bg border border-volt-border rounded-md text-volt-text placeholder-volt-text-muted focus:outline-none border-glow-red"
          />
        </div>
      </div>

      {/* Checklist Items */}
      <div className="flex-1 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-volt-text-muted font-mono">
              {searchQuery ? 'No matching items' : 'No items in this section'}
            </p>
          </div>
        ) : (
          filteredItems.map(item => (
            <ChecklistItem
              key={item.id}
              item={item}
              isSelected={selectedItem?.id === item.id}
              onClick={onItemClick}
              onStatusChange={onStatusChange}
              onCommentSave={onCommentSave}
            />
          ))
        )}
      </div>

      {/* Bottom Stats + Action Buttons */}
      <div className="px-4 py-2.5 bg-volt-surface border-t border-volt-border flex items-center justify-between text-[10px] font-mono shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-volt-text-muted">
            {filteredItems.length} items
          </span>
          <span className="text-volt-green font-semibold">{checklist.filter(i => i.Status === 'YES').length} YES</span>
          <span className="text-volt-red font-semibold">{checklist.filter(i => i.Status === 'NO').length} NO</span>
          <span className="text-volt-amber">{checklist.filter(i => i.Status === 'N/A').length} N/A</span>
          <span className="text-volt-text-muted">{checklist.filter(i => !i.Status || i.Status === 'Pending').length} pending</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={resetting}
            className="px-2.5 py-1 border border-volt-border text-volt-text-muted rounded text-[10px] font-mono hover:border-volt-red hover:text-volt-red transition-colors disabled:opacity-40"
          >
            {resetting ? 'RESETTING...' : 'RESET'}
          </button>
          <button
            onClick={onExport}
            className="px-2.5 py-1 bg-volt-red text-white rounded text-[10px] font-mono hover:bg-volt-red-hover transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            EXPORT PDF
          </button>
        </div>
      </div>
    </div>
  );
}
