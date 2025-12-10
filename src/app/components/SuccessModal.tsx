import React from 'react';
import { CheckCircle, X } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'info' | 'warning';
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'success',
}) => {
  if (!isOpen) return null;

  const colors = {
    success: {
      bg: 'bg-green-100',
      text: 'text-green-600',
      border: 'border-green-200',
    },
    info: {
      bg: 'bg-blue-100',
      text: 'text-blue-600',
      border: 'border-blue-200',
    },
    warning: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-600',
      border: 'border-yellow-200',
    },
  };

  const colorScheme = colors[type];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm transition-all duration-300 animate-in fade-in"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 transform transition-all duration-300 scale-100 animate-in zoom-in-95 slide-in-from-bottom-4">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="p-8 text-center">
            {/* Icon */}
            <div className={`w-16 h-16 ${colorScheme.bg} rounded-full flex items-center justify-center mx-auto mb-4 ${colorScheme.text} border-4 ${colorScheme.border}`}>
              <CheckCircle className="w-8 h-8" />
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>

            {/* Message */}
            <p className="text-slate-600 leading-relaxed">{message}</p>

            {/* Action Button */}
            <button
              onClick={onClose}
              className="mt-6 w-full px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
