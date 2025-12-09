import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ value, onChange, placeholder = "What are you looking for?", className = "" }: SearchBarProps) {
  return (
    <div className={`relative group ${className}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full pl-11 pr-14 py-2.5 bg-white/60 backdrop-blur-md border border-slate-200/60 rounded-xl text-sm shadow-sm placeholder-slate-400 text-slate-900
        focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all duration-300"
        placeholder={placeholder}
      />
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
      </div>
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
        <kbd className="hidden sm:inline-flex items-center h-6 px-2 border border-slate-200 rounded-md text-[10px] font-medium text-slate-400 bg-white/50">
          <span className="mr-0.5 text-xs">⌘</span>/
        </kbd>
      </div>
    </div>
  );
}
