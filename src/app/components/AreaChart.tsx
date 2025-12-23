'use client';

import React, { useState, useRef, useEffect } from 'react';

interface AreaChartProps {
  data: number[];
  data2?: number[];
  labels: string[];
  title?: string;
  subtitle?: string;
  legend1?: string;
  legend2?: string;
  action?: React.ReactNode;
}

export function AreaChart({ 
  data, 
  data2, 
  labels, 
  title, 
  subtitle,
  legend1 = 'Dataset 1',
  legend2 = 'Dataset 2',
  action
}: AreaChartProps) {
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

  const height = 350;
  const padding = { top: 20, right: 30, bottom: 40, left: 40 };
  
  // Use a default width for SSR/initial render to avoid layout shift or errors
  const chartWidth = (width || 800) - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const maxValue = Math.max(...data, ...(data2 || []), 1) * 1.1;
  
  const getX = (index: number) => padding.left + (index / (labels.length - 1)) * chartWidth;
  const getY = (value: number) => height - padding.bottom - (value / maxValue) * chartHeight;
  
  const points1 = data.map((val, i) => [getX(i), getY(val)] as [number, number]);
  const points2 = data2 ? data2.map((val, i) => [getX(i), getY(val)] as [number, number]) : [];

  const line = (pointA: [number, number], pointB: [number, number]) => {
    const lengthX = pointB[0] - pointA[0];
    const lengthY = pointB[1] - pointA[1];
    return {
      length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),
      angle: Math.atan2(lengthY, lengthX)
    };
  };

  const controlPoint = (current: [number, number], previous: [number, number], next: [number, number], reverse?: boolean) => {
    const p = previous || current;
    const n = next || current;
    const smoothing = 0.2;
    const o = line(p, n);
    const angle = o.angle + (reverse ? Math.PI : 0);
    const length = o.length * smoothing;
    const x = current[0] + Math.cos(angle) * length;
    const y = current[1] + Math.sin(angle) * length;
    return [x, y];
  };

  const bezierCommand = (point: [number, number], i: number, a: [number, number][]) => {
    const [cpsX, cpsY] = controlPoint(a[i - 1], a[i - 2], point);
    const [cpeX, cpeY] = controlPoint(point, a[i - 1], a[i + 1], true);
    return `C ${cpsX},${cpsY} ${cpeX},${cpeY} ${point[0]},${point[1]}`;
  };

  const svgPath = (points: [number, number][], command: (point: [number, number], i: number, a: [number, number][]) => string) => {
    return points.reduce((acc, point, i, a) => i === 0 ? `M ${point[0]},${point[1]}` : `${acc} ${command(point, i, a)}`, '');
  };

  const pathD1 = svgPath(points1, bezierCommand);
  const pathD2 = points2.length ? svgPath(points2, bezierCommand) : '';
  
  const areaD1 = `${pathD1} L ${points1[points1.length-1][0]},${height-padding.bottom} L ${points1[0][0]},${height-padding.bottom} Z`;
  const areaD2 = points2.length ? `${pathD2} L ${points2[points2.length-1][0]},${height-padding.bottom} L ${points2[0][0]},${height-padding.bottom} Z` : '';

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-6 hover:shadow-lg transition-shadow duration-300" ref={containerRef}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
        <div>
          {title && <h3 className="font-bold text-slate-900 text-lg">{title}</h3>}
          {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
        </div>
        
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span className="text-xs font-medium text-slate-600">{legend1}</span>
           </div>
           {data2 && (
             <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                <span className="text-xs font-medium text-slate-600">{legend2}</span>
             </div>
           )}
           {action}
        </div>
      </div>
      
      <div className="relative w-full overflow-hidden" style={{ height: `${height}px` }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${width || 800} ${height}`} className="overflow-visible">
          <defs>
            <linearGradient id="gradient1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
            </linearGradient>
            {data2 && (
              <linearGradient id="gradient2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A855F7" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
              </linearGradient>
            )}
          </defs>

          {/* Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = height - padding.bottom - (tick * chartHeight);
            return (
              <g key={tick}>
                <line 
                  x1={padding.left} 
                  y1={y} 
                  x2={width ? width - padding.right : 800 - padding.right} 
                  y2={y} 
                  stroke="#E2E8F0" 
                  strokeWidth="1"
                  strokeDasharray="4 4" 
                />
                <text 
                  x={padding.left - 10} 
                  y={y + 4} 
                  textAnchor="end" 
                  className="text-[10px] fill-slate-400 font-medium"
                >
                  {Math.round(tick * maxValue)}
                </text>
              </g>
            );
          })}

          {/* Areas */}
          <path d={areaD1} fill="url(#gradient1)" className="transition-all duration-300" />
          {data2 && <path d={areaD2} fill="url(#gradient2)" className="transition-all duration-300" />}

          {/* Lines */}
          <path d={pathD1} fill="none" stroke="#6366F1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm" />
          {data2 && <path d={pathD2} fill="none" stroke="#A855F7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm" /> }

          {/* X Axis Labels */}
          {labels.map((label, i) => {
             // Show all labels if few, or skip some if many
             if (labels.length > 12 && i % 2 !== 0) return null;
             
             return (
              <text 
                key={i}
                x={getX(i)} 
                y={height - 10} 
                textAnchor="middle" 
                className="text-[10px] fill-slate-400 font-medium"
              >
                {label}
              </text>
             );
          })}

          {/* Hover Effects */}
          {labels.map((_, i) => (
            <g key={i} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
              {/* Invisible hover target */}
              <rect 
                x={getX(i) - (chartWidth / (labels.length - 1)) / 2} 
                y={padding.top} 
                width={chartWidth / (labels.length - 1)} 
                height={chartHeight} 
                fill="transparent" 
                className="cursor-pointer"
              />
              
              {hoverIndex === i && (
                <g>
                  <line 
                    x1={getX(i)} 
                    y1={padding.top} 
                    x2={getX(i)} 
                    y2={height - padding.bottom} 
                    stroke="#94A3B8" 
                    strokeWidth="1" 
                    strokeDasharray="4 4"
                  />
                  
                  {/* Point 1 */}
                  <circle cx={getX(i)} cy={getY(data[i])} r="5" fill="#6366F1" stroke="white" strokeWidth="2" />
                  
                  {/* Point 2 */}
                  {data2 && (
                    <circle cx={getX(i)} cy={getY(data2[i])} r="5" fill="#A855F7" stroke="white" strokeWidth="2" />
                  )}

                  {/* Tooltip */}
                  <g transform={`translate(${getX(i) > (width || 800) / 2 ? getX(i) - 120 : getX(i) + 10}, ${padding.top})`}>
                    <rect width="110" height={data2 ? 60 : 35} rx="6" fill="white" className="drop-shadow-lg" stroke="#E2E8F0" />
                    <text x="10" y="20" className="text-[11px] font-bold fill-slate-700">{labels[i]}</text>
                    <text x="10" y="35" className="text-[10px] fill-slate-500">
                      {legend1}: <tspan className="font-bold fill-indigo-600">{data[i]}</tspan>
                    </text>
                    {data2 && (
                      <text x="10" y="50" className="text-[10px] fill-slate-500">
                        {legend2}: <tspan className="font-bold fill-purple-600">{data2[i]}</tspan>
                      </text>
                    )}
                  </g>
                </g>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
