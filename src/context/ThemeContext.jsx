import { createContext, useContext, useEffect, useCallback } from 'react';

const ThemeContext = createContext({ refreshTheme: () => {} });

export function applyThemeVars(themeVars) {
  if (!themeVars || typeof themeVars !== 'object') return;
  const root = document.documentElement;
  Object.entries(themeVars).forEach(([key, value]) => {
    if (value) root.style.setProperty(`--${key}`, value);
  });
}

export function clearThemeVars() {
  const KEYS = [
    'background','foreground','card','card-foreground','popover','popover-foreground',
    'primary','primary-foreground','secondary','secondary-foreground',
    'muted','muted-foreground','accent','accent-foreground',
    'border','input','ring',
    'sidebar-background','sidebar-foreground','sidebar-primary','sidebar-primary-foreground',
    'sidebar-accent','sidebar-accent-foreground','sidebar-border','sidebar-ring',
  ];
  const root = document.documentElement;
  KEYS.forEach(k => root.style.removeProperty(`--${k}`));
}

export function ThemeProvider({ children }) {
  const loadAndApply = useCallback(async () => {
    try {
      const res = await fetch('/api/site-settings');
      const data = await res.json();
      if (data.success && data.settings?.themeVars) {
        applyThemeVars(data.settings.themeVars);
      }
    } catch (_) {}
  }, []);

  useEffect(() => { loadAndApply(); }, [loadAndApply]);

  return (
    <ThemeContext.Provider value={{ refreshTheme: loadAndApply }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
