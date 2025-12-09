import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

interface CustomSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ 
  label, 
  value, 
  onChange, 
  options, 
  disabled,
  placeholder = "Select an option...",
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    setMounted(true);
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const updatePosition = () => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const spaceBelow = window.innerHeight - rect.bottom;
          const spaceAbove = rect.top;
          const dropdownHeight = 250; // max-h-60 is approximately 240px
          
          // Position above if not enough space below
          const shouldPositionAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
          
          setDropdownStyle({
            position: 'fixed',
            top: shouldPositionAbove ? `${rect.top - Math.min(dropdownHeight, spaceAbove) - 8}px` : `${rect.bottom + 8}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            zIndex: 9999
          });
        }
      };

      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            if (!disabled) {
              setIsOpen(!isOpen);
            }
          }}
          className={`w-full flex items-center justify-between px-4 py-3 bg-white border rounded-xl transition-all duration-200 text-left ${
            isOpen 
              ? 'border-blue-500 ring-2 ring-blue-500/10' 
              : 'border-slate-200 hover:border-slate-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span className={`block truncate ${selectedOption ? 'text-slate-900' : 'text-slate-500'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {mounted && isOpen && createPortal(
          <>
            {/* Backdrop to close dropdown when clicking outside */}
            <div 
              style={{ zIndex: 9998 }}
              className="fixed inset-0"
              onClick={() => setIsOpen(false)}
            />
            <div 
              style={dropdownStyle}
              className="bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 pointer-events-auto"
            >
              <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
                {options.length === 0 ? (
                  <div className="px-3 py-2.5 text-sm text-slate-500 text-center">
                    No options available
                  </div>
                ) : (
                  options.map((option) => {
                    const isSelected = option.value === value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onChange(option.value);
                          setIsOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                          isSelected 
                            ? 'bg-slate-100 text-slate-900' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <span className="truncate text-left">{option.label}</span>
                        {isSelected && <Check className="w-4 h-4 text-slate-900 shrink-0 ml-2" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </>,
          document.body
        )}
      </div>
    </div>
  );
};
