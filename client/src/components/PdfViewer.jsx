import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Mock blueprint SVG that looks like an electrical floor plan.
 * Supports schematic traces (conduit paths) and spatial vision highlights.
 * Props: highlights (bounding boxes), traces (schematic paths), spatialHighlights (zone overlays)
 */
function BlueprintSVG({ highlights, traces, spatialHighlights }) {
  // Colors for different trace types
  const traceColors = {
    conduit: '#E31B23',
    feeder: '#22C55E',
    wireway: '#3B82F6',
    cable_tray: '#F59E0B',
  };

  return (
    <svg viewBox="0 0 1000 700" className="w-full h-full" style={{ minWidth: 600 }}>
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1A1A20" strokeWidth="0.3" />
        </pattern>
        <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#2A2A32" strokeWidth="0.5" />
        </pattern>
        <filter id="glow-red">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-blue">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width="1000" height="700" fill="#0B0B0C" />
      <rect width="1000" height="700" fill="url(#grid)" />

      {/* Border sheet */}
      <rect x="20" y="20" width="960" height="660" fill="none" stroke="#2A2A32" strokeWidth="1" />
      <rect x="25" y="25" width="950" height="650" fill="none" stroke="#2A2A32" strokeWidth="0.5" />

      {/* Title block */}
      <rect x="700" y="600" width="270" height="60" fill="#131316" stroke="#2A2A32" strokeWidth="0.5" />
      <text x="705" y="615" fill="#6B7280" fontSize="5" fontFamily="monospace">PROJECT: TOWER 4 - FLOOR 12</text>
      <text x="705" y="625" fill="#6B7280" fontSize="4" fontFamily="monospace">SHEET: E-12.1   REV: C</text>
      <text x="705" y="635" fill="#6B7280" fontSize="4" fontFamily="monospace">SCALE: 1/8" = 1'-0"</text>
      <text x="705" y="645" fill="#6B7280" fontSize="4" fontFamily="monospace">POWER & LIGHTING PLAN</text>

      {/* Building outline - main structure */}
      <rect x="100" y="80" width="800" height="420" fill="none" stroke="#3A3A42" strokeWidth="0.8" />

      {/* Interior walls */}
      <line x1="350" y1="80" x2="350" y2="280" stroke="#3A3A42" strokeWidth="0.6" />
      <line x1="350" y1="280" x2="350" y2="500" stroke="#3A3A42" strokeWidth="0.6" />
      <line x1="650" y1="80" x2="650" y2="280" stroke="#3A3A42" strokeWidth="0.6" />
      <line x1="650" y1="280" x2="650" y2="500" stroke="#3A3A42" strokeWidth="0.6" />
      <line x1="100" y1="280" x2="900" y2="280" stroke="#3A3A42" strokeWidth="0.6" />
      <line x1="500" y1="280" x2="500" y2="500" stroke="#3A3A42" strokeWidth="0.6" />

      {/* Rooms labels */}
      <text x="180" y="200" fill="#4B5563" fontSize="6" fontFamily="monospace" textAnchor="middle">OFFICE</text>
      <text x="180" y="210" fill="#4B5563" fontSize="4" fontFamily="monospace" textAnchor="middle">A-101</text>
      <text x="500" y="200" fill="#4B5563" fontSize="6" fontFamily="monospace" textAnchor="middle">OPEN PLAN</text>
      <text x="500" y="210" fill="#4B5563" fontSize="4" fontFamily="monospace" textAnchor="middle">A-102</text>
      <text x="780" y="200" fill="#4B5563" fontSize="6" fontFamily="monospace" textAnchor="middle">CONF. ROOM</text>
      <text x="780" y="210" fill="#4B5563" fontSize="4" fontFamily="monospace" textAnchor="middle">A-103</text>
      <text x="180" y="400" fill="#4B5563" fontSize="6" fontFamily="monospace" textAnchor="middle">STORAGE</text>
      <text x="200" y="410" fill="#4B5563" fontSize="4" fontFamily="monospace" textAnchor="middle">A-104</text>
      <text x="580" y="400" fill="#4B5563" fontSize="6" fontFamily="monospace" textAnchor="middle">ELEV. LOBBY</text>
      <text x="775" y="400" fill="#4B5563" fontSize="6" fontFamily="monospace" textAnchor="middle">STAIR A</text>

      {/* Electrical symbols */}
      {/* Lighting fixtures */}
      <g>
        <circle cx="200" cy="180" r="6" fill="none" stroke="#22C55E" strokeWidth="0.8" />
        <line x1="194" y1="180" x2="206" y2="180" stroke="#22C55E" strokeWidth="0.5" />
        <line x1="200" y1="174" x2="200" y2="186" stroke="#22C55E" strokeWidth="0.5" />
      </g>
      <g>
        <circle cx="500" cy="160" r="6" fill="none" stroke="#22C55E" strokeWidth="0.8" />
        <line x1="494" y1="160" x2="506" y2="160" stroke="#22C55E" strokeWidth="0.5" />
        <line x1="500" y1="154" x2="500" y2="166" stroke="#22C55E" strokeWidth="0.5" />
      </g>
      <g>
        <circle cx="500" cy="220" r="6" fill="none" stroke="#22C55E" strokeWidth="0.8" />
        <line x1="494" y1="220" x2="506" y2="220" stroke="#22C55E" strokeWidth="0.5" />
        <line x1="500" y1="214" x2="500" y2="226" stroke="#22C55E" strokeWidth="0.5" />
      </g>
      <g>
        <circle cx="780" cy="180" r="6" fill="none" stroke="#22C55E" strokeWidth="0.8" />
        <line x1="774" y1="180" x2="786" y2="180" stroke="#22C55E" strokeWidth="0.5" />
        <line x1="780" y1="174" x2="780" y2="186" stroke="#22C55E" strokeWidth="0.5" />
      </g>

      {/* Emergency lighting */}
      <g>
        <rect x="155" y="155" width="10" height="10" rx="1" fill="none" stroke="#F59E0B" strokeWidth="0.8" />
        <text x="158" y="162" fill="#F59E0B" fontSize="4" fontFamily="monospace">E</text>
      </g>
      <g>
        <rect x="780" y="280" width="10" height="10" rx="1" fill="none" stroke="#F59E0B" strokeWidth="0.8" />
        <text x="783" y="287" fill="#F59E0B" fontSize="4" fontFamily="monospace">E</text>
      </g>

      {/* Smoke detectors */}
      <g>
        <circle cx="250" cy="280" r="5" fill="none" stroke="#3B82F6" strokeWidth="0.8" />
        <text x="247" y="283" fill="#3B82F6" fontSize="3" fontFamily="monospace">SD</text>
      </g>
      <g>
        <circle cx="500" cy="280" r="5" fill="none" stroke="#3B82F6" strokeWidth="0.8" />
        <text x="497" y="283" fill="#3B82F6" fontSize="3" fontFamily="monospace">SD</text>
      </g>
      <g>
        <circle cx="780" cy="280" r="5" fill="none" stroke="#3B82F6" strokeWidth="0.8" />
        <text x="777" y="283" fill="#3B82F6" fontSize="3" fontFamily="monospace">SD</text>
      </g>

      {/* Panel boards */}
      <g>
        <rect x="330" y="290" width="18" height="24" rx="2" fill="#131316" stroke="#E31B23" strokeWidth="0.8" />
        <text x="334" y="305" fill="#E31B23" fontSize="3.5" fontFamily="monospace" fontWeight="bold">L1</text>
      </g>
      <g>
        <rect x="630" y="290" width="18" height="24" rx="2" fill="#131316" stroke="#F59E0B" strokeWidth="0.8" />
        <text x="634" y="305" fill="#F59E0B" fontSize="3.5" fontFamily="monospace" fontWeight="bold">L2</text>
      </g>

      {/* Conduit runs */}
      <path d="M 339 314 L 339 380 L 500 380" fill="none" stroke="#4B5563" strokeWidth="0.8" strokeDasharray="3,3" />
      <path d="M 200 186 L 200 280" fill="none" stroke="#4B5563" strokeWidth="0.5" />
      <path d="M 500 166 L 500 280" fill="none" stroke="#4B5563" strokeWidth="0.5" />
      <path d="M 780 186 L 780 280" fill="none" stroke="#4B5563" strokeWidth="0.5" />

      {/* Fire alarm devices */}
      <g>
        <circle cx="350" cy="460" r="6" fill="none" stroke="#E31B23" strokeWidth="0.8" />
        <text x="344" y="463" fill="#E31B23" fontSize="5" fontFamily="monospace">🔔</text>
      </g>
      <g>
        <circle cx="650" cy="460" r="6" fill="none" stroke="#E31B23" strokeWidth="0.8" />
        <text x="644" y="463" fill="#E31B23" fontSize="5" fontFamily="monospace">🔔</text>
      </g>

      {/* Conduit sizing annotation */}
      <g>
        <line x1="339" y1="350" x2="370" y2="350" stroke="#22C55E" strokeWidth="0.3" />
        <text x="372" y="353" fill="#22C55E" fontSize="3.5" fontFamily="monospace">3/4" EMT</text>
      </g>

      {/* Highlight overlay for flagged items */}
      {highlights.map((h, i) => (
        <rect
          key={i}
          x={h.x}
          y={h.y}
          width={h.width}
          height={h.height}
          fill="none"
          stroke="#E31B23"
          strokeWidth={h.selected ? 2 : 1}
          strokeDasharray={h.selected ? "none" : "4,3"}
          filter={h.selected ? "url(#glow-red)" : "none"}
          rx="2"
        />
      ))}

      {/* Schematic Traces (Phase 5) */}
      {traces && traces.map((t, i) => (
        <g key={`trace-${i}`}>
          <path
            d={t.path.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={traceColors[t.type] || '#E31B23'}
            strokeWidth={t.type === 'conduit' ? 1.5 : 2}
            strokeDasharray={t.type === 'wireway' ? '6,3' : t.type === 'cable_tray' ? '3,3' : 'none'}
            filter="url(#glow-red)"
            opacity="0.7"
          />
          {t.label && (
            <text x={t.path[Math.floor(t.path.length/2)].x + 3}
                  y={t.path[Math.floor(t.path.length/2)].y - 3}
                  fill={traceColors[t.type] || '#E31B23'}
                  fontSize="4" fontFamily="monospace">
              {t.label}
            </text>
          )}
        </g>
      ))}

      {/* Spatial Vision Highlights (Phase 5) */}
      {spatialHighlights && spatialHighlights.map((s, i) => (
        <g key={`spatial-${i}`}>
          {/* Colored zone overlay */}
          <rect
            x={s.x} y={s.y}
            width={s.width} height={s.height}
            fill={s.type === 'clearance' ? 'rgba(227,27,35,0.08)' : 'rgba(34,197,94,0.08)'}
            stroke={s.type === 'clearance' ? '#E31B23' : '#22C55E'}
            strokeWidth={1}
            strokeDasharray="4,3"
            rx="2"
          />
          {/* Hatch pattern for clearance zones */}
          {s.type === 'clearance' && (
            <line x1={s.x} y1={s.y} x2={s.x + s.width} y2={s.y + s.height} stroke="#E31B23" strokeWidth="0.3" opacity="0.3" />
          )}
          {s.label && (
            <text x={s.x + 2} y={s.y + 8}
                  fill={s.type === 'clearance' ? '#E31B23' : '#22C55E'}
                  fontSize="3.5" fontFamily="monospace" fontWeight="bold">
              {s.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

// Mock highlight positions keyed by checklist item ID
const HIGHLIGHT_MAP = {
  3: { x: 328, y: 288, width: 22, height: 28, label: 'Panel L1' },          // Panel L1 mismatch
};

// Mock schematic traces keyed by inspection type
const MOCK_TRACES_BY_TYPE = {
  SCHEMATIC_TRACE: [
    { type: 'conduit', label: '3/4" EMT', path: [{x:339,y:314},{x:339,y:380},{x:420,y:380},{x:500,y:380}] },
    { type: 'feeder', label: 'Feeder A', path: [{x:339,y:290},{x:339,y:260},{x:500,y:260},{x:500,y:380}] },
    { type: 'wireway', label: 'Wireway', path: [{x:630,y:290},{x:630,y:400},{x:700,y:400},{x:700,y:500}] },
  ],
  SPATIAL_VISION: [],
};

// Mock spatial vision highlights keyed by section
const MOCK_SPATIAL = [
  { type: 'clearance', label: 'NEC 110.26', x: 95, y: 75, width: 260, height: 210, section: 'ELECTRICAL ROOM' },
  { type: 'equipment', label: 'Panel L1', x: 325, y: 286, width: 25, height: 30, section: 'ELECTRICAL ROOM' },
  { type: 'equipment', label: 'Sleeve Zone', x: 100, y: 488, width: 230, height: 20, section: 'SLEEVING' },
  { type: 'clearance', label: 'Generator Clr', x: 100, y: 500, width: 400, height: 100, section: 'EMERGENCY' },
];

export default function PdfViewer({ selectedItem }) {
  const [zoom, setZoom] = useState(100);
  const [highlights, setHighlights] = useState([]);
  const [traces, setTraces] = useState([]);
  const [spatialHighlights, setSpatialHighlights] = useState([]);
  const [tooltip, setTooltip] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (selectedItem) {
      const isFailOrFlagged = selectedItem.Status === 'Fail' || (selectedItem.Comments && selectedItem.Comments.toLowerCase().includes('flag'));
      const tag = selectedItem.Inspection_Type_Tag;

      // Set bounding box highlight for Fail/Flagged items
      if (isFailOrFlagged) {
        const baseHighlight = HIGHLIGHT_MAP[selectedItem.id];
        if (baseHighlight) {
          setHighlights([{ ...baseHighlight, selected: true }]);
          setTooltip({
            x: baseHighlight.x + baseHighlight.width + 5,
            y: baseHighlight.y,
            text: selectedItem.Question,
            detail: selectedItem.Comments,
          });
        } else {
          const mockH = {
            x: 100 + Math.random() * 700, y: 80 + Math.random() * 400,
            width: 40 + Math.random() * 60, height: 20 + Math.random() * 30, selected: true,
          };
          setHighlights([mockH]);
          setTooltip({
            x: mockH.x + mockH.width + 5, y: mockH.y,
            text: selectedItem.Question,
            detail: selectedItem.Comments || 'Flagged item — requires review',
          });
        }
      } else {
        setHighlights([]);
        setTooltip(null);
      }

      // Set schematic traces for SCHEMATIC_TRACE items
      if (tag === 'SCHEMATIC_TRACE') {
        setTraces(MOCK_TRACES_BY_TYPE.SCHEMATIC_TRACE);
      } else {
        setTraces([]);
      }

      // Set spatial vision highlights for SPATIAL_VISION items
      if (tag === 'SPATIAL_VISION' || selectedItem.Section === 'ELECTRICAL ROOM' || selectedItem.Section === 'EMERGENCY' || selectedItem.Section === 'SLEEVING') {
        const filtered = MOCK_SPATIAL.filter(s => s.section === selectedItem.Section);
        setSpatialHighlights(filtered.length > 0 ? filtered : MOCK_SPATIAL.slice(0, 2));
      } else {
        setSpatialHighlights([]);
      }
    } else {
      setHighlights([]);
      setTraces([]);
      setSpatialHighlights([]);
      setTooltip(null);
    }
  }, [selectedItem]);

  const handleZoomIn = useCallback(() => setZoom(z => Math.min(z + 10, 200)), []);
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(z - 10, 25)), []);
  const handleZoomReset = useCallback(() => setZoom(100), []);

  return (
    <div className="flex flex-col h-full bg-volt-bg">
      {/* PDF Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-volt-surface border-b border-volt-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-volt-text-dim">E-12.1</span>
          <span className="text-volt-text-muted text-[10px]">|</span>
          <span className="text-[10px] font-mono text-volt-text-muted">Power & Lighting Plan</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded hover:bg-volt-surface2 text-volt-text-dim hover:text-volt-text transition-colors"
            title="Zoom out"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={handleZoomReset}
            className="px-2 py-0.5 text-[10px] font-mono text-volt-text-dim hover:text-volt-text transition-colors rounded"
          >
            {zoom}%
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded hover:bg-volt-surface2 text-volt-text-dim hover:text-volt-text transition-colors"
            title="Zoom in"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <span className="w-px h-4 bg-volt-border mx-1" />
          {/* Trace Legend */}
          {traces.length > 0 && (
            <div className="flex items-center gap-2 text-[9px] font-mono text-volt-text-dim">
              <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-volt-red" /> Conduit</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-volt-green" /> Feeder</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-blue-400" /> Wireway</span>
            </div>
          )}
          {spatialHighlights.length > 0 && (
            <div className="flex items-center gap-2 text-[9px] font-mono text-volt-text-dim ml-2 pl-2 border-l border-volt-border">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-volt-red/20 border border-volt-red" /> Clearance</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-volt-green/20 border border-volt-green" /> Equipment</span>
            </div>
          )}
          <button className="p-1.5 rounded hover:bg-volt-surface2 text-volt-text-dim hover:text-volt-text transition-colors" title="Fit to page">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Blueprint Viewer */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-volt-bg relative">
        <div
          className="origin-top-left transition-transform duration-200"
          style={{
            transform: `scale(${zoom / 100})`,
            width: zoom < 100 ? `${(100 / zoom) * 100}%` : '100%',
            height: zoom < 100 ? `${(100 / zoom) * 100}%` : '100%',
          }}
        >
          <BlueprintSVG highlights={highlights} traces={traces} spatialHighlights={spatialHighlights} />
        </div>

        {/* Annotation tooltip for flagged items */}
        {tooltip && (
          <div
            className="absolute z-10 animate-slide-up"
            style={{
              left: `${(tooltip.x / 1000) * 100}%`,
              top: `${(tooltip.y / 700) * 100}%`,
              transform: 'translate(8px, 0)',
            }}
          >
            <div className="bg-volt-surface2 border border-volt-red/40 rounded-lg shadow-2xl p-3 max-w-xs">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-volt-red animate-pulse-glow" />
                <span className="text-[10px] font-mono font-bold text-volt-red uppercase">Flagged Item</span>
              </div>
              <p className="text-sm text-volt-text leading-snug mb-1">{tooltip.text}</p>
              {tooltip.detail && (
                <p className="text-[11px] text-volt-text-dim">{tooltip.detail}</p>
              )}
              <p className="text-[10px] text-volt-text-muted font-mono mt-1.5">
                Bounding box shown in red on blueprint
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-volt-surface border-t border-volt-border text-[10px] font-mono text-volt-text-muted shrink-0">
        <div className="flex items-center gap-4">
          <span>1 of 1 sheet</span>
          <span>1000 × 700 @ 1/8" scale</span>
        </div>
        <div className="flex items-center gap-3">
          {selectedItem && selectedItem.Status === 'Fail' && (
            <span className="flex items-center gap-1 text-volt-red">
              <span className="w-1.5 h-1.5 rounded-full bg-volt-red animate-pulse-glow" />
              Flag: {selectedItem.Question}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}