import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';

export default function ThemeToggle({ className = 'text-muted-foreground hover:text-foreground', size = 'h-5 w-5' }) {
  const { isDark, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      title={isDark ? 'Tema claro' : 'Tema escuro'}
      className={`transition ${className}`}
    >
      {isDark ? <Sun className={size} /> : <Moon className={size} />}
    </button>
  );
}