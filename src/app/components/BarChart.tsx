'use client';

import React, { useState, useRef, useEffect } from 'react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0) return;
      setWidth(entries[0].contentRect.width);
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);
  
  const height = 300;
  const padding = { top: 30, right: 20, bottom: 40, left: 40 };
  
  const chartWidth = (width || 500) - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const maxValue = Math.max(...data, 1) * 1.15; // Add 15% headroom
  
  const slotWidth = chartWidth / data.length;
  const maxBarWidth = 60;
  const barWidth = Math.min(slotWidth * 0.6, maxBarWidth);

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-6 hover:shadow-lg transition-shadow duration-300" ref={containerRef}>
      <div className="mb-6">
        {title && <h3 className="font-bold text-slate-900 text-lg">{title}</h3>}
        {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
      </div>

      <div className="relative w-full overflow-hidden" style={{ height: `${height}px` }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${width || 500} ${height}`} className="overflow-visible">
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
                  x2={width ? width - padding.right : 500 - padding.right} 
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
                  ry="6"
                  className="transition-all duration-300 cursor-pointer"
                  style={{
                    filter: hoverIndex === index ? 'brightness(1.1) drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : 'url(#barShadow)',
                    transform: hoverIndex === index ? `scaleY(1.02)` : 'scaleY(1)',
                    transformOrigin: `${x + barWidth/2}px ${height - padding.bottom}px`
                  }}
                />
                
                {/* Value Label on Top */}
                <text
                  x={x + barWidth / 2}
                  y={y - 8}
                  textAnchor="middle"
                  className={`text-[11px] font-bold fill-slate-700 transition-opacity duration-300 ${hoverIndex === index ? 'opacity-100' : 'opacity-0'}`}
                >
                  {value}
                </text>

                {/* X Axis Label */}
                <text
                  x={x + barWidth / 2}
                  y={height - 15}
                  textAnchor="middle"
                  className={`text-[11px] font-medium transition-colors duration-300 ${hoverIndex === index ? 'fill-slate-900 font-bold' : 'fill-slate-500'}`}
                >
                  {labels[index]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
