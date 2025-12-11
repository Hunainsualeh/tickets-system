'use client';

import React, { useState } from 'react';

interface BarChartProps {
  data: number[];
  labels: string[];
  title?: string;
  subtitle?: string;
  color?: string;
}

export function BarChart({ 
  data, 
  labels, 
  title, 
  subtitle,
  color = '#6366F1'
}: BarChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  
  const height = 240;
  const width = 500;
  const padding = { top: 30, right: 20, bottom: 40, left: 50 };
  
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const maxValue = Math.max(...data, 1) * 1.15; // Add 15% headroom
  
  const slotWidth = chartWidth / data.length;
  const maxBarWidth = 50;
  const barWidth = Math.min(slotWidth * 0.6, maxBarWidth);

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-6 hover:shadow-lg transition-shadow duration-300">
      <div className="mb-6">
        {title && <h3 className="font-bold text-slate-900 text-lg">{title}</h3>}
        {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
      </div>

      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* Background */}
          <rect x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} fill="#F8FAFC" rx="8" />
          
          {/* Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = height - padding.bottom - (tick * chartHeight);
            return (
              <g key={tick}>
                <line 
                  x1={padding.left} 
                  y1={y} 
                  x2={width - padding.right} 
                  y2={y} 
                  stroke="#CBD5E1" 
                  strokeWidth="1"
                  strokeDasharray="5 5" 
                  opacity="0.5"
                />
                <text 
                  x={padding.left - 12} 
                  y={y + 4} 
                  textAnchor="end" 
                  className="text-[11px] fill-slate-500 font-medium"
                >
                  {Math.round(tick * maxValue)}
                </text>
              </g>
            );
          })}

          {/* Gradient Definitions */}
          <defs>
            <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: color, stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.6 }} />
            </linearGradient>
            <filter id="barShadow">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2" />
            </filter>
          </defs>

          {/* Bars */}
          {data.map((value, index) => {
            const x = padding.left + (index * slotWidth) + (slotWidth - barWidth) / 2;
            const barHeight = (value / maxValue) * chartHeight;
            const y = height - padding.bottom - barHeight;
            
            return (
              <g 
                key={index}
                onMouseEnter={() => setHoverIndex(index)}
                onMouseLeave={() => setHoverIndex(null)}
              >
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill="url(#barGradient)"
                  rx="6"
                  filter="url(#barShadow)"
                  className="transition-all duration-300 cursor-pointer"
                  style={{
                    opacity: hoverIndex === index ? 1 : 0.85,
                    transform: hoverIndex === index ? `scaleY(1.02)` : 'scaleY(1)',
                    transformOrigin: `${x + barWidth/2}px ${height - padding.bottom}px`
                  }}
                />
                {/* Value label on hover or always show */}
                {(hoverIndex === index || value > 0) && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 10}
                    textAnchor="middle"
                    className={`text-xs font-bold transition-all duration-300 ${hoverIndex === index ? 'fill-slate-900' : 'fill-slate-500'}`}
                  >
                    {value}
                  </text>
                )}
              </g>
            );
          })}

          {/* X Axis Labels */}
          {labels.map((label, index) => {
            const x = padding.left + (index * slotWidth) + (slotWidth / 2);
            return (
              <text
                key={index}
                x={x}
                y={height - 10}
                textAnchor="middle"
                className="text-[10px] font-medium fill-slate-500"
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
