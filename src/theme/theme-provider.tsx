import type { ThemeProviderProps as MuiThemeProviderProps } from '@mui/material/styles';

import { useMemo, useState, useEffect, useContext, useCallback, createContext } from 'react';

import CssBaseline from '@mui/material/CssBaseline';
import { useTheme, ThemeProvider as ThemeVarsProvider } from '@mui/material/styles';

import { createTheme } from './create-theme';
import { themePresets, isThemePresetKey, defaultThemePreset } from './theme-presets';

import type {} from './extend-theme-types';
import type { ThemeOptions } from './types';
import type { ThemePreset, ThemePresetKey } from './theme-presets';

function ThemeColorMeta() {
  const theme = useTheme();

  useEffect(() => {
    function update() {
      const isDark = document.documentElement.getAttribute('data-color-scheme') === 'dark';
      // theme.palette gives light-mode resolved values (actual hex, not CSS vars)
      // theme.colorSchemes.dark.palette gives dark-mode resolved values

      const schemes = (theme as any).colorSchemes;
      const darkBg =
        (schemes?.dark?.palette?.background?.default as string | undefined) ??
        theme.palette.grey[900];
      const lightBg = theme.palette.background.default;
      const color = isDark ? darkBg : lightBg;
      const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (meta && typeof color === 'string') meta.content = color;
    }

    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-color-scheme'],
    });
    return () => observer.disconnect();
  }, [theme]);

  return null;
}

// ----------------------------------------------------------------------

const THEME_PRESET_STORAGE_KEY = 'quant-client-theme-preset';

type ThemePresetContextValue = {
  themePreset: ThemePresetKey;
  themePresets: ThemePreset[];
  currentThemePreset: ThemePreset;
  setThemePreset: (value: ThemePresetKey) => void;
};

const ThemePresetContext = createContext<ThemePresetContextValue | null>(null);

export type ThemeProviderProps = Partial<MuiThemeProviderProps> & {
  themeOverrides?: ThemeOptions;
};

function getInitialThemePreset(): ThemePresetKey {
  if (typeof window === 'undefined') {
    return defaultThemePreset;
  }

  const storedThemePreset = window.localStorage.getItem(THEME_PRESET_STORAGE_KEY);

  return storedThemePreset && isThemePresetKey(storedThemePreset)
    ? storedThemePreset
    : defaultThemePreset;
}

export function ThemeProvider({ themeOverrides, children, ...other }: ThemeProviderProps) {
  const [themePreset, setThemePresetState] = useState<ThemePresetKey>(getInitialThemePreset);

  const currentThemePreset =
    themePresets.find((preset) => preset.value === themePreset) ?? themePresets[0];

  const setThemePreset = useCallback((value: ThemePresetKey) => {
    setThemePresetState(value);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_PRESET_STORAGE_KEY, value);
    }
  }, []);

  const theme = useMemo(
    () =>
      createTheme({
        themePresetOverrides: currentThemePreset.themeOverrides,
        themeOverrides,
      }),
    [currentThemePreset.themeOverrides, themeOverrides]
  );

  const contextValue = useMemo(
    () => ({ currentThemePreset, themePreset, themePresets, setThemePreset }),
    [currentThemePreset, setThemePreset, themePreset]
  );

  return (
    <ThemePresetContext.Provider value={contextValue}>
      <ThemeVarsProvider disableTransitionOnChange theme={theme} {...other}>
        <CssBaseline />
        <ThemeColorMeta />
        {children}
      </ThemeVarsProvider>
    </ThemePresetContext.Provider>
  );
}

export function useThemePreset() {
  const context = useContext(ThemePresetContext);

  if (!context) {
    throw new Error('useThemePreset must be used within ThemeProvider');
  }

  return context;
}
