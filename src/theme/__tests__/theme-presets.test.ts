import type { Theme } from '@mui/material/styles';

import { createTheme } from '../create-theme';
import { themePresets, isThemePresetKey, defaultThemePreset } from '../theme-presets';

type ResolvedScheme = {
  palette: {
    primary: { lighter: string; light: string; main: string; dark: string; darker: string };
    secondary: { main: string };
    info: { main: string };
    success: { main: string };
    warning: { main: string };
    error: { main: string };
    grey: Record<string, string>;
    divider: string;
    background: { paper: string; default: string; neutral: string };
    text: { primary: string; secondary: string; disabled: string };
  };
  customShadows: { card: string };
};

type CardVariant = 'elevation' | 'outlined';

type CardRootStyleProps = {
  theme: Theme;
  ownerState: { variant?: CardVariant };
};

type CardRootStyleResolver = (props: CardRootStyleProps) => Record<string, unknown>;

function getResolvedSchemes(theme: Theme) {
  return Reflect.get(theme, 'colorSchemes') as unknown as Record<'light' | 'dark', ResolvedScheme>;
}

function resolveCardRootStyles(theme: Theme, variant?: CardVariant) {
  const cardRoot = theme.components?.MuiCard?.styleOverrides?.root;

  if (!Array.isArray(cardRoot) || typeof cardRoot[0] !== 'function') {
    throw new Error('Card root styles are not composed');
  }

  const props = { theme, ownerState: { variant } } satisfies CardRootStyleProps;
  const baseStyles = (cardRoot[0] as CardRootStyleResolver)(props);
  const presetLayer = cardRoot[1];
  const presetStyles =
    typeof presetLayer === 'function'
      ? (presetLayer as CardRootStyleResolver)(props)
      : presetLayer;

  if (!presetStyles || typeof presetStyles !== 'object' || Array.isArray(presetStyles)) {
    throw new Error('Card preset styles are missing');
  }

  return { baseStyles, presetStyles: presetStyles as Record<string, unknown> };
}

describe('theme presets', () => {
  it('retains all preset keys, the default preset, and both color schemes', () => {
    expect(defaultThemePreset).toBe('classic-blue');
    expect(themePresets.map(({ value }) => value)).toEqual([
      'classic-blue',
      'minimal-green',
      'quantum-night',
      'arctic-glass',
      'neo-securities',
      'signal-green',
      'aurora-gradient',
      'paper-research',
    ]);

    themePresets.forEach(({ themeOverrides }) => {
      const schemes = getResolvedSchemes(createTheme({ themePresetOverrides: themeOverrides }));

      (['light', 'dark'] as const).forEach((colorScheme) => {
        expect(schemes[colorScheme].customShadows.card).toBeTruthy();
        expect(schemes[colorScheme].palette.divider).toBeTruthy();
        expect(schemes[colorScheme].palette.primary.main).toBeTruthy();
        expect(schemes[colorScheme].palette.secondary.main).toBeTruthy();
        expect(schemes[colorScheme].palette.info.main).toBeTruthy();
        expect(schemes[colorScheme].palette.success.main).toBeTruthy();
        expect(schemes[colorScheme].palette.warning.main).toBeTruthy();
        expect(schemes[colorScheme].palette.error.main).toBeTruthy();
      });
    });
  });

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

  it('uses mode-specific shadows and only restores the Minimal outlined Card border', () => {
    const preset = themePresets.find(({ value }) => value === 'minimal-green');
    if (!preset) throw new Error('Minimal green theme preset is missing');

    const theme = createTheme({ themePresetOverrides: preset.themeOverrides });
    const schemes = getResolvedSchemes(theme);

    expect(schemes.light.customShadows.card).toContain('rgba(145 158 171 / 0.2)');
    expect(schemes.dark.customShadows.card).toContain('rgba(0 0 0 / 0.2)');
    const defaultCard = resolveCardRootStyles(theme);
    const elevationCard = resolveCardRootStyles(theme, 'elevation');
    const outlinedCard = resolveCardRootStyles(theme, 'outlined');

    expect(defaultCard.presetStyles).toEqual({ border: 'none' });
    expect(elevationCard.presetStyles).toEqual({ border: 'none' });
    expect(outlinedCard.presetStyles).toEqual({
      border: `1px solid ${theme.vars.palette.divider}`,
    });
  });

  it('composes every preset border with the base Card variant surface', () => {
    themePresets.forEach((preset) => {
      (['light', 'dark'] as const).forEach((defaultColorScheme) => {
        const theme = createTheme({
          themePresetOverrides: preset.themeOverrides,
          themeOverrides: { defaultColorScheme },
        });
        const defaultCard = resolveCardRootStyles(theme);
        const elevationCard = resolveCardRootStyles(theme, 'elevation');
        const outlinedCard = resolveCardRootStyles(theme, 'outlined');
        const commonBaseStyles = {
          zIndex: 0,
          position: 'relative',
          borderRadius: Number(theme.shape.borderRadius) * 2,
        };

        expect(defaultCard.baseStyles).toMatchObject({
          ...commonBaseStyles,
          boxShadow: theme.vars.customShadows.card,
        });
        expect(elevationCard.baseStyles).toMatchObject({
          ...commonBaseStyles,
          boxShadow: theme.vars.customShadows.card,
        });
        expect(outlinedCard.baseStyles).toMatchObject({
          ...commonBaseStyles,
          boxShadow: 'none',
        });

        if (preset.value === 'minimal-green') {
          expect(defaultCard.presetStyles).toEqual({ border: 'none' });
          expect(elevationCard.presetStyles).toEqual({ border: 'none' });
          expect(outlinedCard.presetStyles).toEqual({
            border: `1px solid ${theme.vars.palette.divider}`,
          });
        } else {
          expect(defaultCard.presetStyles.border).toEqual(expect.stringMatching(/^1px solid /));
          expect(elevationCard.presetStyles).toEqual(defaultCard.presetStyles);
          expect(outlinedCard.presetStyles).toEqual(defaultCard.presetStyles);
        }
      });
    });
  });
});
