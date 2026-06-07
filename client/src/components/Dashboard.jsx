import React, { useState, useEffect, useCallback } from 'react';
import ScoreRing from './ScoreRing';

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="bg-volt-surface border border-volt-border rounded-xl p-4 hover:border-volt-red/30 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-mono text-volt-text-muted uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-bold font-mono mt-1 ${color || 'text-volt-text'}`}>{value}</p>
          {sub && <p className="text-[10px] font-mono text-volt-text-dim mt-0.5">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color?.includes('green') ? 'bg-volt-green-bg' : color?.includes('red') ? 'bg-volt-red-bg' : 'bg-volt-surface2'}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function TrendChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.score));
  const min = Math.min(...data.map(d => d.score));
  const range = max - min || 1;
  const w = 600, h = 160, pad = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;
  const xStep = chartW / (data.length - 1);

  const pts = data.map((d, i) => ({
    x: pad.left + i * xStep,
    y: pad.top + chartH - ((d.score - min) / range) * chartH,
    ...d,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x},${pad.top + chartH} L${pts[0].x},${pad.top + chartH} Z`;

  return (
    <div className="bg-volt-surface border border-volt-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-volt-text">Score Trend</h3>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-volt-green">
            <span className="w-2 h-0.5 rounded bg-volt-green" /> +{((data[data.length - 1].score - data[0].score)).toFixed(1)}pts
          </span>
          <span className="text-volt-text-muted">6 reviews</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 180 }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#E31B23" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#E31B23" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
          const y = pad.top + chartH - frac * chartH;
          return (
            <g key={i}>
              <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="#1A1A20" strokeWidth="0.5" />
              <text x={pad.left - 5} y={y + 3} textAnchor="end" fill="#6B7280" fontSize="8" fontFamily="monospace">
                {(min + frac * range).toFixed(0)}
              </text>
            </g>
          );
        })}
        {/* Threshold line */}
        <line x1={pad.left} y1={pad.top + chartH - ((85 - min) / range) * chartH} x2={w - pad.right} y2={pad.top + chartH - ((85 - min) / range) * chartH} stroke="#22C55E" strokeWidth="0.8" strokeDasharray="4,3" opacity="0.5" />
        <text x={w - pad.right + 2} y={pad.top + chartH - ((85 - min) / range) * chartH + 3} fill="#22C55E" fontSize="7" fontFamily="monospace" opacity="0.6">85%</text>
        {/* Area */}
        <path d={areaPath} fill="url(#areaGrad)" />
        {/* Line */}
        <path d={linePath} fill="none" stroke="#E31B23" strokeWidth="1.5" strokeLinecap="round" />
        {/* Dots */}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#0B0B0C" stroke={p.score >= 85 ? '#22C55E' : '#E31B23'} strokeWidth="1.5" />
        ))}
      </svg>
    </div>
  );
}

function SectionBreakdown({ data }) {
  if (!data) return null;
  return (
    <div className="bg-volt-surface border border-volt-border rounded-xl p-4">
      <h3 className="text-xs font-semibold text-volt-text mb-3">Section Breakdown</h3>
      <div className="space-y-2">
        {data.map(s => (
          <div key={s.section}>
            <div className="flex items-center justify-between text-[10px] font-mono mb-1">
              <span className="text-volt-text truncate mr-2">{s.section}</span>
              <span className="text-volt-text-muted shrink-0">{s.pass}/{s.total} · {s.pct}%</span>
            </div>
            <div className="h-1.5 bg-volt-border rounded-full overflow-hidden flex">
              <div className="bg-volt-green h-full transition-all duration-500" style={{ width: `${(s.pass / s.total) * 100}%` }} />
              <div className="bg-volt-red h-full transition-all duration-500" style={{ width: `${(s.fail / s.total) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InspectionTypeBreakdown({ data }) {
  if (!data) return null;
  return (
    <div className="bg-volt-surface border border-volt-border rounded-xl p-4">
      <h3 className="text-xs font-semibold text-volt-text mb-3">Inspection Type Distribution</h3>
      <div className="grid grid-cols-3 gap-3">
        {data.map(t => (
          <div key={t.type} className="text-center p-3 rounded-lg bg-volt-bg border border-volt-border">
            <p className="text-[9px] font-mono text-volt-text-muted uppercase mb-1">{t.type.replace('_', ' ')}</p>
            <p className="text-lg font-bold font-mono text-volt-text">{t.total}</p>
            <div className="flex justify-center gap-2 mt-1 text-[9px] font-mono">
              <span className="text-volt-green">{t.pass}P</span>
              <span className="text-volt-red">{t.fail}F</span>
              <span className="text-volt-amber">{t.na}N</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentActivity({ data }) {
  if (!data) return null;
  const icons = {
    review: <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    document: <svg className="w-3.5 h-3.5 text-volt-green" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
    flag: <svg className="w-3.5 h-3.5 text-volt-red" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  };

  return (
    <div className="bg-volt-surface border border-volt-border rounded-xl p-4">
      <h3 className="text-xs font-semibold text-volt-text mb-3">Recent Activity</h3>
      <div className="space-y-2 max-h-[280px] overflow-y-auto">
        {data.map((a, i) => (
          <div key={i} className="flex items-start gap-2.5 py-1.5 border-b border-volt-border/50 last:border-0">
            <div className="mt-0.5 shrink-0">{icons[a.type] || icons.review}</div>
            <div className="min-w-0">
              <p className="text-[11px] text-volt-text leading-snug">{a.msg}</p>
              <p className="text-[9px] font-mono text-volt-text-muted mt-0.5">
                {new Date(a.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error('Dashboard fetch failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-volt-bg">
        <div className="text-center">
          <svg className="w-10 h-10 mx-auto mb-3 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#2A2A32" strokeWidth="2" />
            <path d="M12 2a10 10 0 019.95 9" stroke="#E31B23" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p className="text-sm text-volt-text-dim font-mono">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center bg-volt-bg">
        <p className="text-volt-text-muted font-mono text-sm">Dashboard data unavailable</p>
      </div>
    );
  }

  const { overview, trends, breakdown, inspectionTypes, recentActivity } = data;

  return (
    <div className="flex-1 overflow-y-auto bg-volt-bg">
      {/* Page header */}
      <div className="px-6 py-4 border-b border-volt-border bg-volt-surface/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-volt-text">Quality Control Dashboard</h2>
            <p className="text-xs font-mono text-volt-text-muted mt-0.5">
              {overview.projectName} · {overview.projectPhase} · Rev {overview.reviewCycle}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] font-mono text-volt-text-muted">Last Reviewed</p>
              <p className="text-xs font-mono text-volt-text">
                {new Date(overview.lastReviewDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className={`px-3 py-1.5 rounded-full border ${
  overview.overallScore >= overview.threshold
    ? 'border-volt-green bg-volt-green-bg' 
    : 'border-volt-red bg-volt-red-bg'
}`}>
  <span className={`text-sm font-bold font-mono ${
    overview.overallScore >= overview.threshold ? 'text-volt-green' : 'text-volt-red'
  }`}>
    {overview.overallScore.toFixed(1)}
  </span>
  <span className="text-[9px] font-mono text-volt-text-muted ml-1">SCORE</span>
</div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="px-6 pt-4 pb-2 grid grid-cols-5 gap-3">
        <StatCard
          icon={<svg className="w-5 h-5 text-volt-green" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
          label="Items Passed"
          value={overview.passedItems}
          sub={`${overview.totalItems} total items`}
          color="text-volt-green"
        />
        <StatCard
          icon={<svg className="w-5 h-5 text-volt-red" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
          label="Items Failed"
          value={overview.failedItems}
          sub={`${overview.naItems} marked N/A`}
          color="text-volt-red"
        />
        <StatCard
          icon={<svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          label="Sheets Reviewed"
          value={overview.sheetsReviewed}
          color="text-blue-400"
        />
        <StatCard
          icon={<svg className="w-5 h-5 text-volt-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
          label="Docs Profiled"
          value={overview.documentsUploaded}
          color="text-volt-amber"
        />
        <StatCard
          icon={<svg className={`w-5 h-5 ${overview.overallScore >= overview.threshold ? 'text-volt-green' : 'text-volt-red'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          label="Overall Score"
          value={`${overview.overallScore}%`}
          sub={`Threshold: ${overview.threshold}%`}
          color={overview.overallScore >= overview.threshold ? 'text-volt-green' : 'text-volt-red'}
        />
      </div>

      {/* Charts Row */}
      <div className="px-6 py-2 grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <TrendChart data={trends} />
        </div>
        <div>
          <SectionBreakdown data={breakdown} />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="px-6 pb-6 grid grid-cols-3 gap-3">
        <div>
          <InspectionTypeBreakdown data={inspectionTypes} />
        </div>
        <div className="col-span-2">
          <RecentActivity data={recentActivity} />
        </div>
      </div>
    </div>
  );
}