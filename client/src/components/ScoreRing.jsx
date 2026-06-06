import React from 'react';

export default function ScoreRing({ percentage = 0, size = 120, strokeWidth = 6 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;
  const passed = percentage >= 85;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1A1A20"
          strokeWidth={strokeWidth}
        />
        {/* Foreground ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={passed ? '#22C55E' : '#E31B23'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="score-ring"
          filter={passed ? 'none' : 'url(#redGlow)'}
        />
        <defs>
          <filter id="redGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold font-mono ${
          passed ? 'text-volt-green' : 'text-volt-red'
        }`}>
          {percentage.toFixed(1)}
        </span>
        <span className="text-[8px] text-volt-text-muted font-mono tracking-wider uppercase">Score</span>
      </div>
    </div>
  );
}