import React, { createContext, useContext, useMemo, useState } from 'react';
import { palette, type ThemeMode } from '../theme/theme';

type ThemeContextValue = {
  mode: ThemeMode;
  colors: (typeof palette)[ThemeMode];
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  const value = useMemo(
    () => ({
      mode,
      colors: palette[mode],
      toggleTheme: () => setMode((current) => (current === 'dark' ? 'light' : 'dark')),
    }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
