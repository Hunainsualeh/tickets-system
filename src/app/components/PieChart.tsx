'use client';

import React, { useState } from 'react';

interface PieChartProps {
  data: number[];
  labels: string[];
  colors?: string[];
  title?: string;
  subtitle?: string;
}

export function PieChart({ 
  data, 
  labels, 
  colors = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#64748B'],
  title,
  subtitle
}: PieChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  
  const total = data.reduce((acc, val) => acc + val, 0);
  
  // If no data, show empty state
  if (total === 0) {
    return (
      <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-32 h-32 rounded-full border-4 border-slate-100 mb-4"></div>
        <p className="text-slate-400 font-medium">No data available</p>
      </div>
    );
  }

  let cumulativePercent = 0;

  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  const slices = data.map((value, index) => {
    const percent = value / total;
    const startPercent = cumulativePercent;
    cumulativePercent += percent;
    const endPercent = cumulativePercent;

    const [startX, startY] = getCoordinatesForPercent(startPercent);
    const [endX, endY] = getCoordinatesForPercent(endPercent);

    const largeArcFlag = percent > 0.5 ? 1 : 0;

    const pathData = [
      `M 0 0`,
      `L ${startX} ${startY}`,
      `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
      `L 0 0`,
    ].join(' ');

    return { pathData, color: colors[index % colors.length], value, label: labels[index], percent };
  });

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-6 hover:shadow-lg transition-shadow duration-300">
      <div className="mb-6">
        {title && <h3 className="font-bold text-slate-900 text-lg">{title}</h3>}
        {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
      </div>

      <div className="flex flex-col items-center justify-center gap-8">
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 shrink-0">
          <svg viewBox="-1.1 -1.1 2.2 2.2" className="w-full h-full -rotate-90" style={{ filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))' }}>
            {slices.map((slice, index) => (
              <g key={index}>
                <defs>
                  <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: slice.color, stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: slice.color, stopOpacity: 0.7 }} />
                  </linearGradient>
                </defs>
                <path
                  d={slice.pathData}
                  fill={`url(#gradient-${index})`}
                  stroke="white"
                  strokeWidth="0.03"
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoverIndex(index)}
                  onMouseLeave={() => setHoverIndex(null)}
                  style={{
                    transform: hoverIndex === index ? 'scale(1.08)' : 'scale(1)',
                    transformOrigin: 'center',
                    filter: hoverIndex === index ? 'brightness(1.1)' : 'brightness(1)',
                  }}
                />
              </g>
            ))}
            {/* Inner circle for Donut Chart look with gradient */}
            <defs>
              <radialGradient id="innerGradient">
                <stop offset="0%" style={{ stopColor: '#ffffff', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#f8fafc', stopOpacity: 1 }} />
              </radialGradient>
            </defs>
            <circle cx="0" cy="0" r="0.65" fill="url(#innerGradient)" style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.05))' }} />
          </svg>
          
          {/* Center Text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <span className="block text-3xl font-bold text-slate-900">{total}</span>
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4 w-full">
          {slices.map((slice, index) => (
            <div 
              key={index} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
                hoverIndex === index ? 'bg-slate-50' : ''
              }`}
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <div 
                className="w-2.5 h-2.5 rounded-full shrink-0" 
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-xs font-medium text-slate-600">
                {slice.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
