import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { createLightMonochromeTheme, createOriginalTheme, THEME_MODE } from '../theme/themes';

const ThemeModeContext = createContext(null);

const STORAGE_KEY = 'themeMode';

const getInitialThemeMode = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === THEME_MODE.ORIGINAL) return THEME_MODE.ORIGINAL;
  return THEME_MODE.LIGHT_MONO;
};

export const ThemeModeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState(getInitialThemeMode);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, themeMode);
    document.body.classList.remove('theme-original', 'theme-light-mono');
    document.body.classList.add(themeMode === THEME_MODE.LIGHT_MONO ? 'theme-light-mono' : 'theme-original');
  }, [themeMode]);

  const toggleThemeMode = useCallback(() => {
    setThemeMode((prev) => (prev === THEME_MODE.LIGHT_MONO ? THEME_MODE.ORIGINAL : THEME_MODE.LIGHT_MONO));
  }, []);

  const theme = useMemo(() => {
    if (themeMode === THEME_MODE.LIGHT_MONO) return createLightMonochromeTheme();
    return createOriginalTheme();
  }, [themeMode]);

  const value = useMemo(
    () => ({
      themeMode,
      setThemeMode,
      toggleThemeMode,
    }),
    [themeMode, toggleThemeMode]
  );

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
};

export const useThemeMode = () => {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error('useThemeMode must be used within ThemeModeProvider');
  }
  return ctx;
};

