'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';

type Theme = 'light' | 'dark';
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'light', toggle: () => undefined });
function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (icon) icon.href = theme === 'dark' ? '/caserivo-icon-dark.png' : '/caserivo-icon-light.png';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  useEffect(() => {
    const saved = window.localStorage.getItem('caserivo-theme');
    const next: Theme = saved === 'dark' ? 'dark' : saved === 'light' ? 'light' : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    setTheme(next);
    applyTheme(next);
  }, []);
  const toggle = useCallback(() => setTheme((current) => {
    const next = current === 'light' ? 'dark' : 'light';
    applyTheme(next);
    window.localStorage.setItem('caserivo-theme', next);
    return next;
  }), []);
  return <ThemeContext.Provider value={{ theme, toggle }}><MotionConfig reducedMotion="user">{children}</MotionConfig></ThemeContext.Provider>;
}

export function useTheme() { return useContext(ThemeContext); }
