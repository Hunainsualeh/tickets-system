import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  labelClassName?: string;
}

export const Select: React.FC<SelectProps> = ({ 
  label, 
  error, 
  options, 
  className = '', 
  labelClassName = '',
  ...props 
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className={`block text-sm font-semibold text-slate-700 mb-1.5 ${labelClassName}`}>
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={`w-full appearance-none px-4 py-2.5 bg-white border rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 disabled:bg-slate-50 disabled:text-slate-500 transition-all duration-200 ${
            error ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500' : 'border-slate-200 hover:border-slate-300'
          } ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {error && <p className="mt-1.5 text-sm text-red-500 font-medium">{error}</p>}
    </div>
  );
};
