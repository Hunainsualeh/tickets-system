import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react';

interface DashboardStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    label: string;
    direction: 'up' | 'down' | 'neutral';
  };
  description?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo';
  onClick?: () => void;
  actionLabel?: string;
}

const colorStyles = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-100',
    trend: 'text-blue-600',
    iconBg: 'bg-blue-100',
  },
  green: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-100',
    trend: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-100',
    trend: 'text-purple-600',
    iconBg: 'bg-purple-100',
  },
  orange: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-100',
    trend: 'text-amber-600',
    iconBg: 'bg-amber-100',
  },
  red: {
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-rose-100',
    trend: 'text-rose-600',
    iconBg: 'bg-rose-100',
  },
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-indigo-100',
    trend: 'text-indigo-600',
    iconBg: 'bg-indigo-100',
  },
};

export const DashboardStatCard: React.FC<DashboardStatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  description,
  color = 'blue',
  onClick,
  actionLabel,
}) => {
  const styles = colorStyles[color];

  return (
    <div 
      onClick={onClick}
      className={`
        relative overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm 
        hover:shadow-md hover:border-${styles.border.split('-')[1]}-300 transition-all duration-300 
        group cursor-pointer
      `}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-xl ${styles.iconBg} ${styles.text} transition-transform group-hover:scale-110 duration-300`}>
            <Icon className="w-6 h-6" />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
              trend.direction === 'up' ? 'bg-green-50 text-green-700' : 
              trend.direction === 'down' ? 'bg-red-50 text-red-700' : 
              'bg-slate-50 text-slate-700'
            }`}>
              {trend.direction === 'up' && <ArrowUpRight className="w-3 h-3" />}
              {trend.direction === 'down' && <ArrowDownRight className="w-3 h-3" />}
              {trend.value}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wide">{title}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">{value}</span>
            {description && <span className="text-sm text-slate-400 font-medium">{description}</span>}
          </div>
        </div>

        {actionLabel && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center text-sm font-medium text-slate-600 group-hover:text-blue-600 transition-colors">
            {actionLabel}
            <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
          </div>
        )}
      </div>
      
      {/* Decorative background gradient */}
      <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full ${styles.bg} opacity-50 blur-2xl group-hover:opacity-100 transition-opacity duration-500`} />
    </div>
  );
};
