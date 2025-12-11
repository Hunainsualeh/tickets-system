'use client';

import React, { useState } from 'react';

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
  
  const height = 350;
  const width = 800;
  const padding = { top: 40, right: 40, bottom: 50, left: 60 };
  
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const maxValue = Math.max(...data, ...(data2 || []), 1) * 1.25;
  
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
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-8 hover:shadow-lg transition-shadow duration-300">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              {title && <h3 className="font-bold text-slate-900 text-lg">{title}</h3>}
              {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
            </div>
            {action && <div className="w-full sm:w-auto sm:ml-4">{action}</div>}
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap justify-end gap-4 mb-6">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg">
          <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></div>
          <span className="text-xs text-slate-700 font-semibold">{legend1}</span>
        </div>
        {data2 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs text-slate-600 font-medium">{legend2}</span>
          </div>
        )}
      </div>
      
      <div className="relative w-full aspect-2/1 max-h-[400px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="gradient1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.02" />
            </linearGradient>
            {data2 && (
              <linearGradient id="gradient2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.02" />
              </linearGradient>
            )}
            <filter id="lineShadow">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Background Grid */}
          <rect x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} fill="#FAFAFA" rx="8" />

          {/* Grid Lines */}
          {Array.from({ length: 5 }).map((_, i) => {
            const y = padding.top + (i * chartHeight) / 4;
            const value = Math.round(maxValue - (i * maxValue) / 4);
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#CBD5E1"
                  strokeWidth="1"
                  strokeDasharray="6 4"
                  opacity="0.6"
                />
                <text
                  x={padding.left - 15}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-slate-500 font-medium"
                  style={{ fontSize: '11px' }}
                >
                  {i === 4 ? 0 : value}
                </text>
              </g>
            );
          })}

          {/* Areas */}
          {data2 && <path d={areaD2} fill="url(#gradient2)" />}
          <path d={areaD1} fill="url(#gradient1)" />

          {/* Lines with enhanced styling */}
          {data2 && <path d={pathD2} fill="none" stroke="#8B5CF6" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#lineShadow)" />}
          <path d={pathD1} fill="none" stroke="#6366F1" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#lineShadow)" />

          {/* Points and Tooltips */}
          {points1.map((point, i) => (
            <g key={i}>
              {/* Data points with enhanced styling */}
              <circle
                cx={point[0]}
                cy={point[1]}
                r={hoverIndex === i ? 6 : 4}
                fill="white"
                stroke="#6366F1"
                strokeWidth={hoverIndex === i ? 3 : 2.5}
                className="transition-all duration-200"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(99, 102, 241, 0.3))' }}
              />
              {data2 && points2[i] && (
                <circle
                  cx={points2[i][0]}
                  cy={points2[i][1]}
                  r={hoverIndex === i ? 6 : 4}
                  fill="white"
                  stroke="#8B5CF6"
                  strokeWidth={hoverIndex === i ? 3 : 2.5}
                  className="transition-all duration-200"
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(139, 92, 246, 0.3))' }}
                />
              )}

              {/* Hover Trigger Area */}
              <rect
                x={point[0] - (chartWidth / labels.length) / 2}
                y={padding.top}
                width={chartWidth / labels.length}
                height={chartHeight}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
                className="cursor-pointer"
              />
              
              {/* Active State Elements */}
              {hoverIndex === i && (
                <>
                  <line
                    x1={point[0]}
                    y1={padding.top}
                    x2={point[0]}
                    y2={height - padding.bottom}
                    stroke="#94a3b8"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <circle
                    cx={point[0]}
                    cy={point[1]}
                    r={6}
                    fill="#3b82f6"
                    stroke="white"
                    strokeWidth="2"
                  />
                  {data2 && points2[i] && (
                    <circle
                      cx={points2[i][0]}
                      cy={points2[i][1]}
                      r={6}
                      fill="#ef4444"
                      stroke="white"
                      strokeWidth="2"
                    />
                  )}
                </>
              )}
            </g>
          ))}

          {/* X Axis Labels */}
          {labels.map((label, i) => (
            <text
              key={i}
              x={getX(i)}
              y={height - 10}
              textAnchor="middle"
              className="text-xs fill-slate-400 font-medium"
              style={{ fontSize: '12px' }}
            >
              {label}
            </text>
          ))}
        </svg>
        
        {/* Tooltip Popup */}
        {hoverIndex !== null && (
          <div 
            className="absolute bg-slate-900 text-white text-xs rounded-lg py-2 px-3 pointer-events-none transform -translate-x-1/2 -translate-y-full shadow-xl z-10"
            style={{ 
              left: `${(points1[hoverIndex][0] / width) * 100}%`, 
              top: `${(points1[hoverIndex][1] / height) * 100}%`,
              marginTop: '-15px'
            }}
          >
            <div className="font-bold mb-1">{labels[hoverIndex]}</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>{legend1}: {data[hoverIndex]}</span>
            </div>
            {data2 && (
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span>{legend2}: {data2[hoverIndex]}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
