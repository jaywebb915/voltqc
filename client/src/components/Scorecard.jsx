import React, { useState } from 'react';

const STATUS_CONFIG = {
  YES:     { dot: 'bg-volt-green',       text: 'text-volt-green',      label: 'YES'     },
  NO:      { dot: 'bg-volt-red',         text: 'text-volt-red',        label: 'NO'      },
  'N/A':   { dot: 'bg-volt-amber',       text: 'text-volt-amber',      label: 'N/A'     },
  Pending: { dot: 'bg-volt-text-muted',  text: 'text-volt-text-muted', label: 'PENDING' },
};

// ── Sticky section header ─────────────────────────────────────────────────────
function SectionHeader({ name, itemCount, totalPoints, percentage }) {
  const pass = percentage >= 85;
  return (
    <div className="sticky top-0 z-10 px-4 py-2.5 bg-volt-surface border-b border-t border-volt-border flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-[11px] font-semibold text-volt-text uppercase tracking-wider truncate">
          {name}
        </span>
        <span className="text-[10px] font-mono text-volt-text-muted whitespace-nowrap">
          {itemCount} items · {totalPoints} pts
        </span>
      </div>
      <div className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono font-bold ${
        pass
          ? 'border-volt-green bg-volt-green-bg text-volt-green'
          : 'border-volt-red   bg-volt-red-bg   text-volt-red'
      }`}>
        {percentage.toFixed(1)}%
      </div>
    </div>
  );
}

// ── Individual checklist item ─────────────────────────────────────────────────
function ChecklistItem({ item, isSelected, onClick, onStatusChange, onCommentSave }) {
  const cfg = STATUS_CONFIG[item.Status] || STATUS_CONFIG['Pending'];
  const [showActions, setShowActions] = useState(false);
  const [localComment, setLocalComment] = useState(item.Comments || '');

  const handleClick = () => {
    onClick(item);
    setShowActions(prev => !prev || !isSelected);
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

  React.useEffect(() => {
    setLocalComment(item.Comments || '');
  }, [item.Comments]);

  return (
    <div className={`w-full text-left transition-all duration-150 border-l-2 ${
      isSelected ? 'bg-volt-surface2 border-volt-red' : 'hover:bg-volt-surface2/50 border-transparent'
    }`}>
      <div className="px-4 py-3 cursor-pointer" onClick={handleClick}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
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
          <div className="flex items-center gap-2 flex-wrap">
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

// ── Main Scorecard ────────────────────────────────────────────────────────────
export default function Scorecard({
  sections,
  checklist,
  selectedItem,
  onItemClick,
  onStatusChange,
  onCommentSave,
  onReset,
  onExport,
  exporting,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [resetting,   setResetting]   = useState(false);

  const searchLower = searchQuery.trim().toLowerCase();

  // Build display groups: each section gets a filtered item list
  const displaySections = sections
    .map(sec => ({
      ...sec,
      displayItems: searchLower
        ? sec.items.filter(i => i.Question.toLowerCase().includes(searchLower))
        : sec.items,
    }))
    .filter(sec => sec.displayItems.length > 0);

  const totalDisplayed = displaySections.reduce((n, s) => n + s.displayItems.length, 0);

  const handleReset = async () => {
    if (!window.confirm('Reset all checklist responses to Pending? This cannot be undone.')) return;
    setResetting(true);
    await onReset?.();
    setResetting(false);
  };

  return (
    <div className="flex flex-col h-full">

      {/* ── Action toolbar ──────────────────────────────────────────────────── */}
      <div className="px-4 py-2 bg-volt-surface border-b border-volt-border flex items-center justify-end gap-2 shrink-0">
        <button
          onClick={handleReset}
          disabled={resetting}
          className="px-2.5 py-1 border border-volt-border text-volt-text-muted rounded text-[10px] font-mono hover:border-volt-red hover:text-volt-red transition-colors disabled:opacity-40"
        >
          {resetting ? 'RESETTING…' : 'RESET'}
        </button>

        <button
          onClick={onExport}
          disabled={exporting}
          title="Export combined QC report + annotated blueprint PDF"
          className="px-2.5 py-1 bg-volt-red text-white rounded text-[10px] font-mono hover:bg-volt-red-hover transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? (
            <>
              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                <path d="M12 2a10 10 0 019.95 9" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
              EXPORTING…
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              EXPORT PDF
            </>
          )}
        </button>
      </div>

      {/* ── Search ────────────────────────────────────────────────────────────── */}
      <div className="px-4 py-2 border-b border-volt-border shrink-0">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-volt-text-muted"
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search all checklist items…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-volt-bg border border-volt-border rounded-md text-volt-text placeholder-volt-text-muted focus:outline-none focus:border-volt-red"
          />
        </div>
      </div>

      {/* ── Scrollable sections list ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {displaySections.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-volt-text-muted font-mono">
              {searchQuery ? 'No matching items' : 'No checklist items'}
            </p>
          </div>
        ) : (
          displaySections.map(sec => (
            <div key={sec.name}>
              <SectionHeader
                name={sec.name}
                itemCount={sec.displayItems.length}
                totalPoints={sec.totalPoints}
                percentage={sec.percentage}
              />
              {sec.displayItems.map(item => (
                <ChecklistItem
                  key={item.id}
                  item={item}
                  isSelected={selectedItem?.id === item.id}
                  onClick={onItemClick}
                  onStatusChange={onStatusChange}
                  onCommentSave={onCommentSave}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* ── Bottom stats ────────────────────────────────────────────────────── */}
      <div className="px-4 py-2.5 bg-volt-surface border-t border-volt-border flex items-center text-[10px] font-mono shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-volt-text-muted">{totalDisplayed} items</span>
          <span className="text-volt-green  font-semibold">{checklist.filter(i => i.Status === 'YES').length} YES</span>
          <span className="text-volt-red    font-semibold">{checklist.filter(i => i.Status === 'NO').length} NO</span>
          <span className="text-volt-amber">{checklist.filter(i => i.Status === 'N/A').length} N/A</span>
          <span className="text-volt-text-muted">{checklist.filter(i => !i.Status || i.Status === 'Pending').length} pending</span>
        </div>
      </div>
    </div>
  );
}
