import type { ThemeProviderProps as MuiThemeProviderProps } from '@mui/material/styles';

import { useMemo, useState, useContext, useCallback, createContext } from 'react';

import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider as ThemeVarsProvider } from '@mui/material/styles';

import { createTheme } from './create-theme';
import { themePresets, isThemePresetKey, defaultThemePreset } from './theme-presets';

import type {} from './extend-theme-types';
import type { ThemeOptions } from './types';
import type { ThemePreset, ThemePresetKey } from './theme-presets';

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
