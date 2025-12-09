import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  labelClassName?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  className = '',
  labelClassName = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className={`block text-sm font-semibold text-slate-800 mb-2 ${labelClassName}`}>
          {label}
        </label>
      )}
      <textarea
        className={`w-full px-4 py-3 bg-slate-50 border-2 border-slate-300 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 resize-none ${
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-100 bg-red-50' : ''
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
