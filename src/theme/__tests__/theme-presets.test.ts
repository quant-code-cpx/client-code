import type { Theme } from '@mui/material/styles';

import { createTheme } from '../create-theme';
import { themePresets, isThemePresetKey } from '../theme-presets';

type ResolvedScheme = {
  palette: {
    primary: { lighter: string; light: string; main: string; dark: string; darker: string };
    secondary: { main: string };
    info: { main: string };
    success: { main: string };
    warning: { main: string };
    error: { main: string };
    grey: Record<string, string>;
    background: { paper: string; default: string; neutral: string };
    text: { primary: string; secondary: string; disabled: string };
  };
  customShadows: { card?: string };
};

function getResolvedSchemes(theme: Theme) {
  return Reflect.get(theme, 'colorSchemes') as unknown as Record<'light' | 'dark', ResolvedScheme>;
}

describe('theme presets', () => {
  it('registers the Minimal green preset for persisted theme selection', () => {
    const preset = themePresets.find(({ value }) => value === 'minimal-green');

    expect(isThemePresetKey('minimal-green')).toBe(true);
    expect(preset).toMatchObject({
      label: 'Minimal 原生绿',
      swatches: ['#00A76F', '#8E33FF', '#00B8D9', '#FFAB00'],
    });
  });

  it('reproduces the measured Minimal light and dark semantic colors', () => {
    const preset = themePresets.find(({ value }) => value === 'minimal-green');
    if (!preset) throw new Error('Minimal green theme preset is missing');

    const theme = createTheme({ themePresetOverrides: preset.themeOverrides });
    const schemes = getResolvedSchemes(theme);

    expect(schemes.light.palette).toMatchObject({
      primary: {
        lighter: '#C8FAD6',
        light: '#5BE49B',
        main: '#00A76F',
        dark: '#007867',
        darker: '#004B50',
      },
      secondary: { main: '#8E33FF' },
      info: { main: '#00B8D9' },
      success: { main: '#22C55E' },
      warning: { main: '#FFAB00' },
      error: { main: '#FF5630' },
      grey: {
        50: '#FCFDFD',
        500: '#919EAB',
        900: '#141A21',
      },
      background: {
        paper: '#FFFFFF',
        default: '#FFFFFF',
        neutral: '#F4F6F8',
      },
      text: {
        primary: '#1C252E',
        secondary: '#637381',
        disabled: '#919EAB',
      },
    });

    expect(schemes.dark.palette).toMatchObject({
      primary: { main: '#00A76F' },
      background: {
        paper: '#1C252E',
        default: '#141A21',
        neutral: '#28323D',
      },
      text: {
        primary: '#FFFFFF',
        secondary: '#919EAB',
        disabled: '#637381',
      },
    });
  });

  it('uses grey shadows in light mode, black shadows in dark mode, and no card border', () => {
    const preset = themePresets.find(({ value }) => value === 'minimal-green');
    if (!preset) throw new Error('Minimal green theme preset is missing');

    const theme = createTheme({ themePresetOverrides: preset.themeOverrides });
    const schemes = getResolvedSchemes(theme);

    expect(schemes.light.customShadows.card).toContain('rgba(145 158 171 / 0.2)');
    expect(schemes.dark.customShadows.card).toContain('rgba(0 0 0 / 0.2)');
    expect(preset.themeOverrides).toMatchObject({
      components: {
        MuiCard: {
          styleOverrides: {
            root: { border: 'none' },
          },
        },
      },
    });
  });
});
