import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  count: number | string;
  icon: LucideIcon;
  variant: 'orange' | 'lime' | 'green' | 'grey' | 'blue' | 'purple';
  avatars?: string[]; // URLs for avatars
  onClick?: () => void;
  isActive?: boolean;
}

const variants = {
  orange: 'bg-[#ff9f43] text-white',
  lime: 'bg-[#a2d149] text-white',
  green: 'bg-[#2ecc71] text-white',
  grey: 'bg-[#95a5a6] text-white',
  blue: 'bg-[#3498db] text-white',
  purple: 'bg-[#9b59b6] text-white',
};

const iconVariants = {
  orange: 'bg-white/20 text-white',
  lime: 'bg-white/20 text-white',
  green: 'bg-white/20 text-white',
  grey: 'bg-white/20 text-white',
  blue: 'bg-white/20 text-white',
  purple: 'bg-white/20 text-white',
};

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  count, 
  icon: Icon, 
  variant, 
  avatars = [], 
  onClick,
  isActive = false
}) => {
  return (
    <div 
      onClick={onClick}
      className={`
        rounded-3xl p-6 relative overflow-hidden ${variants[variant]} shadow-lg 
        transition-all duration-200 hover:scale-[1.02] cursor-pointer
        ${isActive ? 'scale-[1.02] shadow-xl brightness-110' : ''}
      `}
    >
      {/* Background decoration circles */}
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute right-12 top-8 w-12 h-12 rounded-full bg-white/10" />

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-xl ${iconVariants[variant]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm font-medium opacity-90 mb-1">{title}</p>
          <h3 className="text-4xl font-bold">{count}</h3>
        </div>

        <div className="flex items-center">
          <div className="flex -space-x-3">
            {avatars.length > 0 ? (
              avatars.map((avatar, i) => (
                <div 
                  key={i} 
                  className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden"
                >
                  {/* Placeholder for avatar image */}
                  <img src={avatar} alt="" className="w-full h-full object-cover" />
                </div>
              ))
            ) : (
              // Default placeholder avatars if none provided
              <>
                {[1, 2, 3].map((i) => (
                  <div 
                    key={i} 
                    className="w-8 h-8 rounded-full border-2 border-white bg-white/30 flex items-center justify-center text-xs font-medium"
                  >
                    <div className="w-2 h-2 bg-white rounded-full opacity-50" />
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
