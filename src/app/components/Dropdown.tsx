import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

interface DropdownProps {
  trigger?: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
}

export function Dropdown({ trigger, children, align = 'right' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [verticalPosition, setVerticalPosition] = useState<'bottom' | 'top'>('bottom');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && dropdownRef.current && menuRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      
      // If space below is tight (less than menu height + padding) and there is more space above, go up
      if (spaceBelow < menuRect.height + 10 && rect.top > menuRect.height + 10) {
        setVerticalPosition('top');
      } else {
        setVerticalPosition('bottom');
      }
    }
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="cursor-pointer flex items-center justify-center">
        {trigger || (
          <div className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <MoreVertical className="w-4 h-4 text-slate-500" />
          </div>
        )}
      </div>

      {isOpen && (
        <div
          ref={menuRef}
          className={`absolute z-50 w-48 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none transform transition-all duration-200 ease-out origin-top-right ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${verticalPosition === 'top' ? 'bottom-full mb-2' : 'mt-1'}`}
        >
          <div className="py-1" role="menu" aria-orientation="vertical">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ElementType;
  variant?: 'default' | 'danger' | 'warning';
}

export function DropdownItem({ children, icon: Icon, variant = 'default', className = '', onClick, ...props }: DropdownItemProps) {
  return (
    <button
      className={`group flex w-full items-center px-4 py-2.5 text-sm font-medium transition-colors ${
        variant === 'danger' 
          ? 'text-red-600 hover:bg-red-50' 
          : variant === 'warning'
          ? 'text-amber-600 hover:bg-amber-50'
          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
      } ${className}`}
      role="menuitem"
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(e);
      }}
      {...props}
    >
      {Icon && <Icon className={`mr-3 h-4 w-4 ${
        variant === 'danger' 
          ? 'text-red-500 group-hover:text-red-600' 
          : variant === 'warning'
          ? 'text-amber-500 group-hover:text-amber-600'
          : 'text-slate-400 group-hover:text-slate-500'
      }`} />}
      {children}
    </button>
  );
}
