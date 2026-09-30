import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = false,
}) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดกลางคืน'}
      title={isDark ? 'คลิกเพื่อสลับเป็นโหมดสว่าง (Light Mode)' : 'คลิกเพื่อสลับเป็นโหมดกลางคืน (Night / Dark Mode)'}
      className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 group ${
        isDark
          ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 shadow-xs'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-2xs'
      } ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-600 group-hover:-rotate-12 transition-transform" />
      )}
      {showLabel && (
        <span className="text-xs font-semibold">
          {isDark ? 'โหมดสว่าง' : 'โหมดกลางคืน'}
        </span>
      )}
    </button>
  );
};
