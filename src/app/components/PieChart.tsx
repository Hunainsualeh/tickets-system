'use client';

import React, { useState } from 'react';

interface PieChartProps {
  data: number[];
  labels: string[];
  colors?: string[];
  title?: string;
  subtitle?: string;
  valueFormatter?: (value: number) => string;
  className?: string;
}

export function PieChart({ 
  data, 
  labels, 
  colors = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#64748B'],
  title,
  subtitle,
  valueFormatter = (val) => val.toLocaleString(),
  className = ''
}: PieChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  
  const total = data.reduce((acc, val) => acc + val, 0);
  
  if (total === 0) {
    return (
      <div className={`w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col items-center justify-center min-h-[300px] ${className}`}>
        <div className="w-32 h-32 rounded-full border-4 border-slate-100 mb-4"></div>
        <p className="text-slate-400 font-medium">No data available</p>
      </div>
    );
  }

  let cumulativePercent = 0;

  const getCoordinatesForPercent = (percent: number) => {
    // Start from -PI/2 (12 o'clock)
    const angle = 2 * Math.PI * percent - Math.PI / 2;
    const x = Math.cos(angle);
    const y = Math.sin(angle);
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

    // Calculate label position
    const midPercent = startPercent + percent / 2;
    const midAngle = 2 * Math.PI * midPercent - Math.PI / 2;
    const cos = Math.cos(midAngle);
    const sin = Math.sin(midAngle);
    
    // Points for the connector line
    const rInner = 0.85; // Start inside the slice
    const rOuter = 1.2; // Elbow point
    
    const x1 = cos * rInner;
    const y1 = sin * rInner;
    
    const x2 = cos * rOuter;
    const y2 = sin * rOuter;
    
    // Horizontal extension
    const x3 = x2 + (cos >= 0 ? 0.2 : -0.2);
    const y3 = y2;

    const textAnchor: 'start' | 'end' = cos >= 0 ? 'start' : 'end';

    return { 
      pathData, 
      color: colors[index % colors.length], 
      value, 
      label: labels[index], 
      percent,
      labelCoords: { x1, y1, x2, y2, x3, y3, textAnchor }
    };
  });

  return (
    <div className={`w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-6 hover:shadow-lg transition-shadow duration-300 ${className}`}>
      <div className="mb-4">
        {title && <h3 className="font-bold text-slate-900 text-lg">{title}</h3>}
        {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
      </div>

      <div className="flex flex-col items-center justify-center">
        <div className="relative w-full aspect-[16/9] sm:aspect-[2/1] max-w-4xl">
          <svg viewBox="-2.5 -1.5 5 3" className="w-full h-full">
            {slices.map((slice, index) => (
              <g key={index}>
                <defs>
                  <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: slice.color, stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: slice.color, stopOpacity: 0.8 }} />
                  </linearGradient>
                </defs>
                <path
                  d={slice.pathData}
                  fill={`url(#gradient-${index})`}
                  stroke="white"
                  strokeWidth="0.02"
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoverIndex(index)}
                  onMouseLeave={() => setHoverIndex(null)}
                  style={{
                    transform: hoverIndex === index ? 'scale(1.02)' : 'scale(1)',
                    transformOrigin: 'center',
                    filter: hoverIndex === index ? 'brightness(1.05)' : 'brightness(1)',
                    opacity: hoverIndex !== null && hoverIndex !== index ? 0.4 : 1
                  }}
                />
              </g>
            ))}
            
            {/* Inner circle for Donut Chart */}
            <circle cx="0" cy="0" r="0.6" fill="white" />

            {/* Labels and Lines */}
            {slices.map((slice, index) => {
               // Only show labels for slices > 3% to avoid clutter
               if (slice.percent < 0.03) return null;

               const isHovered = hoverIndex === index;
               const { x1, y1, x2, y2, x3, y3, textAnchor } = slice.labelCoords;
               
               return (
                <g key={`label-${index}`} className="pointer-events-none" style={{ opacity: hoverIndex !== null && !isHovered ? 0.2 : 1, transition: 'opacity 0.3s' }}>
                  <polyline
                    points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth="0.005"
                  />
                  <circle cx={x1} cy={y1} r="0.02" fill={slice.color} />
                  
                  <text
                    x={x3 + (textAnchor === 'start' ? 0.05 : -0.05)}
                    y={y3 - 0.05}
                    textAnchor={textAnchor}
                    className="font-bold fill-slate-700"
                    style={{ fontSize: '0.12px' }}
                  >
                    {valueFormatter(slice.value)} ({Math.round(slice.percent * 100)}%)
                  </text>
                  <text
                    x={x3 + (textAnchor === 'start' ? 0.05 : -0.05)}
                    y={y3 + 0.08}
                    textAnchor={textAnchor}
                    className="font-medium fill-slate-500"
                    style={{ fontSize: '0.1px' }}
                  >
                    {slice.label}
                  </text>
                </g>
               );
            })}

            {/* Center Text */}
            <text x="0" y="-0.05" textAnchor="middle" className="font-bold fill-slate-900" style={{ fontSize: '0.25px' }}>
                {valueFormatter(total)}
            </text>
            <text x="0" y="0.15" textAnchor="middle" className="font-medium fill-slate-400 uppercase tracking-widest" style={{ fontSize: '0.1px' }}>
                Total
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
