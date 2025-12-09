import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatRowProps {
  label: string;
  count: number;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'gray' | 'indigo';
  active?: boolean;
  onClick?: () => void;
}

const colorStyles = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  orange: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-rose-50 text-rose-700 border-rose-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  gray: 'bg-slate-50 text-slate-700 border-slate-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const activeStyles = {
  blue: 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200',
  green: 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200',
  orange: 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-200',
  red: 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-200',
  purple: 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200',
  gray: 'bg-slate-600 text-white border-slate-600 shadow-md shadow-slate-200',
  indigo: 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200',
};

export const StatRow: React.FC<StatRowProps> = ({ label, count, icon: Icon, color, active, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-200
        ${active ? activeStyles[color] : `${colorStyles[color]} hover:brightness-95`}
      `}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${active ? 'bg-white/20' : 'bg-white'}`}>
          <Icon size={20} />
        </div>
        <span className="font-medium">{label}</span>
      </div>
      <span className="text-2xl font-bold">{count}</span>
    </div>
  );
};
