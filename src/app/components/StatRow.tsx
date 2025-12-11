import React from 'react';
import { LucideIcon, Ticket } from 'lucide-react';

interface StatRowProps {
  label: string;
  count: number;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'gray' | 'indigo';
  active?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'ticket';
  asTicket?: boolean;
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

const ticketBg = {
  orange: 'bg-[#FFC107]',
  green: 'bg-[#10B981]',
  blue: 'bg-[#3B82F6]',
  red: 'bg-[#EF4444]',
  purple: 'bg-[#A855F7]',
  gray: 'bg-[#64748B]',
  indigo: 'bg-[#6366F1]',
};

const ticketText = {
  orange: 'text-slate-900',
  green: 'text-white',
  blue: 'text-white',
  red: 'text-white',
  purple: 'text-white',
  gray: 'text-white',
  indigo: 'text-white',
};

const ticketSubText = {
  orange: 'text-slate-800/80',
  green: 'text-white/80',
  blue: 'text-white/80',
  red: 'text-white/80',
  purple: 'text-white/80',
  gray: 'text-white/80',
  indigo: 'text-white/80',
};

const ticketIconBg = {
  orange: 'bg-black/10',
  green: 'bg-white/20',
  blue: 'bg-white/20',
  red: 'bg-white/20',
  purple: 'bg-white/20',
  gray: 'bg-white/20',
  indigo: 'bg-white/20',
};

export const StatRow: React.FC<StatRowProps> = ({ label, count, icon: Icon, color, active, onClick, variant = 'default', asTicket = false }) => {
  if ((variant === 'ticket' && active) || (variant === 'ticket' && asTicket)) {
    const bgColor = ticketBg[color] || ticketBg.orange;
    const textColor = ticketText[color] || ticketText.orange;
    const subTextColor = ticketSubText[color] || ticketSubText.orange;
    const iconBg = ticketIconBg[color] || ticketIconBg.orange;

    return (
      <div
        onClick={onClick}
        className={`relative w-full ${bgColor} rounded-2xl p-5 text-left transition-all duration-300 shadow-lg cursor-pointer 
        ${active ? 'ring-4 ring-blue-500/30 scale-105 z-20' : 'hover:scale-[1.02]'}
        `}
      >
        {/* Ticket Stub Notches */}
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#F8FAFC] rounded-full" />
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#F8FAFC] rounded-full" />
        
        <div className="flex items-start justify-between mb-4">
          <div className={`${iconBg} p-2 rounded-xl backdrop-blur-sm`}>
            <Icon className={`w-6 h-6 ${textColor}`} />
          </div>
          <div className="bg-white/90 px-2 py-1 rounded-md shadow-sm">
            <span className="text-xs font-bold text-slate-900">#</span>
          </div>
        </div>
        
        <h3 className={`${textColor} font-bold text-lg leading-tight mb-2`}>
          {label}
        </h3>
        <p className={`${subTextColor} text-sm mb-4 line-clamp-2 font-medium`}>
          View all {label.toLowerCase()}
        </p>
        
        <div className={`flex items-center gap-2 ${subTextColor} text-xs font-medium border-t border-black/5 pt-3`}>
          <span className={`text-2xl font-bold ${textColor}`}>{count}</span>
        </div>
      </div>
    );
  }

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
