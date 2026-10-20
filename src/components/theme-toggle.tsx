'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return <button type="button" role="switch" aria-checked={theme === 'dark'} className={`theme-toggle${theme === 'dark' ? ' is-on' : ''}`} onClick={toggle} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
    <span className="theme-toggle-track"><span className="theme-toggle-knob">{theme === 'light' ? <Moon size={12}/> : <Sun size={12}/>}</span></span><span className="theme-toggle-label">{theme === 'light' ? 'Dark' : 'Light'}</span>
  </button>;
}
