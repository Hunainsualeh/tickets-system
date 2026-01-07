'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Dataset {
  label: string;
  data: number[];
  color: string;
}

interface StackedComboChartProps {
  title: string;
  subtitle?: string;
  labels: string[];
  bars: Dataset[];
  line?: {
    label: string;
    data: number[]; // Ensure this matches labels length
    color: string;
  };
}

export function StackedComboChart({
  title,
  subtitle,
  labels,
  bars,
  line
}: StackedComboChartProps) {
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

  const height = 400;
  const padding = { top: 40, right: 30, bottom: 60, left: 50 };
  
  const chartWidth = (width || 500) - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate totals to determine Y-Axis Scale
  const totals = labels.map((_, i) => bars.reduce((sum, ds) => sum + (ds.data[i] || 0), 0));
  const maxBarTotal = Math.max(...totals, 1);
  const maxLineValue = line ? Math.max(...line.data, 1) : 0;
  const maxValue = Math.max(maxBarTotal, maxLineValue) * 1.15; // 15% headroom

  const slotWidth = chartWidth / labels.length;
  const maxBarWidth = 60;
  const barWidth = Math.min(slotWidth * 0.6, maxBarWidth);

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-6" ref={containerRef}>
      <div className="mb-6 flex justify-between items-start">
        <div>
          {title && <h3 className="font-bold text-slate-900 text-lg">{title}</h3>}
          {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
        </div>
        <div className="flex gap-4">
           {/* Legend */}
           <div className="flex gap-3 flex-wrap justify-end">
             {bars.map((ds, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ds.color }}></span>
                  {ds.label}
                </div>
             ))}
             {line && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                   <div className="flex items-center" style={{ width: 14 }}>
                      <div className="h-0.5 w-full" style={{ backgroundColor: line.color }}></div>
                      <div className="w-2 h-2 rounded-full -ml-2 border-2 border-white" style={{ backgroundColor: line.color }}></div>
                   </div>
                   {line.label}
                </div>
             )}
           </div>
        </div>
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

          {/* Render Bars */}
          {labels.map((label, i) => {
            const x = padding.left + (i * slotWidth) + (slotWidth - barWidth) / 2;
            let currentY = height - padding.bottom;
            
            return (
              <g 
                key={i}
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
              >
                {/* Background column trigger area */}
                <rect 
                  x={padding.left + (i * slotWidth)} 
                  y={padding.top} 
                  width={slotWidth} 
                  height={chartHeight} 
                  fill="transparent" 
                />

                {bars.map((ds, dsIndex) => {
                    const value = ds.data[i] || 0;
                    if (value === 0) return null;
                    const barH = (value / maxValue) * chartHeight;
                    const y = currentY - barH;
                    
                    // Update currentY for next stack
                    currentY -= barH;

                    const isTop = dsIndex === bars.length - 1 || bars.slice(dsIndex + 1).every(d => (d.data[i]||0) === 0);
                    const isBottom = dsIndex === 0;

                    return (
                        <rect
                            key={dsIndex}
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barH}
                            fill={ds.color}
                            // Rounded corners only on top if it's the top bar, bottom if bottom
                            rx={4}
                            ry={4}
                            className="transition-opacity duration-200"
                            style={{ 
                                opacity: hoverIndex !== null && hoverIndex !== i ? 0.6 : 1
                            }}
                        />
                    );
                })}

                {/* X Axis Label */}
                <text
                  x={x + barWidth / 2}
                  y={height - 25}
                  textAnchor="middle"
                  className={`text-[11px] font-medium transition-colors duration-300 ${hoverIndex === i ? 'fill-slate-900 font-bold' : 'fill-slate-500'}`}
                >
                  {label}
                </text>
                {/* Total Label on Hover */}
                 <text
                  x={x + barWidth / 2}
                  y={currentY - 10}
                  textAnchor="middle"
                  className={`text-[11px] font-bold fill-slate-700 transition-opacity duration-300 ${hoverIndex === i ? 'opacity-100' : 'opacity-0'}`}
                >
                  {Math.round(totals[i] * 10) / 10}
                </text>
              </g>
            );
          })}

          {/* Line Overlay */}
          {line && (
            <>
                <polyline
                  points={line.data.map((val, i) => {
                      const x = padding.left + (i * slotWidth) + (slotWidth / 2);
                      const y = height - padding.bottom - ((val / maxValue) * chartHeight);
                      return `${x},${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke={line.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity={0.8}
                />
                {line.data.map((val, i) => {
                    const x = padding.left + (i * slotWidth) + (slotWidth / 2);
                    const y = height - padding.bottom - ((val / maxValue) * chartHeight);
                    return (
                        <g key={i}>
                             <circle cx={x} cy={y} r="4" fill="white" stroke={line.color} strokeWidth="2" />
                             {hoverIndex === i && (
                                 <text x={x} y={y - 10} textAnchor="middle" className="text-[10px] fill-slate-900 font-bold">
                                     {val}
                                 </text>
                             )}
                        </g>
                    );
                })}
            </>
          )} 

        </svg>

        {/* Tooltip */}
        {hoverIndex !== null && (
           <div 
             className="absolute bg-slate-900 text-white text-xs rounded-lg p-3 shadow-xl pointer-events-none z-10"
             style={{
                left: `${padding.left + (hoverIndex * slotWidth) + (slotWidth/2)}px`,
                top: `${padding.top + 20}px`, // Fixed top position or dynamic
                transform: 'translateX(-50%)' 
             }}
           >
              <div className="font-bold mb-2 pb-1 border-b border-slate-700">{labels[hoverIndex]}</div>
              <div className="flex flex-col gap-1">
                 {bars.slice().reverse().map((ds, i) => {
                     // We reversed to show top stack first
                     const val = ds.data[hoverIndex] || 0;
                     if (val === 0) return null;
                     return (
                         <div key={i} className="flex justify-between gap-4">
                             <span className="flex items-center gap-1.5">
                                 <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ds.color }}></span>
                                 <span className="text-slate-300">{ds.label}</span>
                             </span>
                             <span className="font-mono text-white">{val}h</span>
                         </div>
                     )
                 })}
                 {line && (
                    <div className="flex justify-between gap-4 mt-1 pt-1 border-t border-slate-700">
                         <span className="flex items-center gap-1.5">
                             <span className="w-2 h-0.5" style={{ backgroundColor: line.color }}></span>
                             <span className="text-slate-300">{line.label}</span>
                         </span>
                         <span className="font-mono text-white">{line.data[hoverIndex]}h</span>
                     </div>
                 )}
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
