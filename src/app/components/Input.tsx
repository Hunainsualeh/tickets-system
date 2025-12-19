import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  labelClassName?: string;
  rightElement?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  labelClassName = '',
  rightElement,
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className={`block text-sm font-semibold text-slate-800 mb-2 ${labelClassName}`}>
          {label}
        </label>
      )}
      <div className="relative">
        <input
          className={`w-full px-4 py-3 bg-slate-50 border-2 border-slate-300 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 ${
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-100 bg-red-50' : ''
          } ${rightElement ? 'pr-12' : ''} ${className}`}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center text-slate-500">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
