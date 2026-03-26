import { varAlpha, createPaletteChannel } from 'minimal-shared/utils';

import type { ThemeOptions } from './types';
import type { CustomShadows } from './core/custom-shadows';
import type { PaletteColorNoChannels } from './core/palette';

// ----------------------------------------------------------------------

type ThemePresetValue =
  | 'classic-blue'
  | 'quantum-night'
  | 'arctic-glass'
  | 'neo-securities'
  | 'signal-green'
  | 'aurora-gradient'
  | 'paper-research';

type ThemeSwatch = [string, string, string, string];

type ThemePaletteSet = Record<
  'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error',
  PaletteColorNoChannels
>;

type ThemeGreyScale = Record<
  '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900',
  string
>;

type ThemeSurfaceSet = {
  paper: string;
  default: string;
  neutral: string;
};

type ThemeTextSet = {
  primary: string;
  secondary: string;
  disabled: string;
};

type ThemePresetInput = {
  value: ThemePresetValue;
  label: string;
  description: string;
  swatches: ThemeSwatch;
  palette: ThemePaletteSet;
  grey: ThemeGreyScale;
  surface: ThemeSurfaceSet;
  text: ThemeTextSet;
  shape?: number;
  shadowColor?: string;
};

export type ThemePresetKey = ThemePresetValue;

export type ThemePreset = {
  value: ThemePresetValue;
  label: string;
  description: string;
  swatches: ThemeSwatch;
  themeOverrides: ThemeOptions;
};

export const defaultThemePreset: ThemePresetKey = 'classic-blue';

const common = createPaletteChannel({ black: '#000000', white: '#FFFFFF' });

function createCustomShadows(colorChannel: string): CustomShadows {
  return {
    z1: `0 1px 2px 0 ${varAlpha(colorChannel, 0.16)}`,
    z4: `0 4px 8px 0 ${varAlpha(colorChannel, 0.16)}`,
    z8: `0 8px 16px 0 ${varAlpha(colorChannel, 0.16)}`,
    z12: `0 12px 24px -4px ${varAlpha(colorChannel, 0.16)}`,
    z16: `0 16px 32px -4px ${varAlpha(colorChannel, 0.16)}`,
    z20: `0 20px 40px -4px ${varAlpha(colorChannel, 0.16)}`,
    z24: `0 24px 48px 0 ${varAlpha(colorChannel, 0.16)}`,
    dialog: `-40px 40px 80px -8px ${varAlpha(common.blackChannel, 0.24)}`,
    card: `0 0 2px 0 ${varAlpha(colorChannel, 0.2)}, 0 12px 24px -4px ${varAlpha(colorChannel, 0.12)}`,
    dropdown: `0 0 2px 0 ${varAlpha(colorChannel, 0.24)}, -20px 20px 40px -4px ${varAlpha(colorChannel, 0.24)}`,
  };
}

function createThemePreset({
  value,
  label,
  description,
  swatches,
  palette,
  grey,
  surface,
  text,
  shape = 8,
  shadowColor,
}: ThemePresetInput): ThemePreset {
  const greyPalette = createPaletteChannel(grey);
  const shadowBase = createPaletteChannel({ main: shadowColor ?? grey['500'] });
  const primaryPalette = createPaletteChannel(palette.primary);

  // Accent colours shared by both light and dark modes
  const accentPalette = {
    primary: createPaletteChannel(palette.primary),
    secondary: createPaletteChannel(palette.secondary),
    info: createPaletteChannel(palette.info),
    success: createPaletteChannel(palette.success),
    warning: createPaletteChannel(palette.warning),
    error: createPaletteChannel(palette.error),
    common,
    grey: greyPalette,
    divider: varAlpha(greyPalette['500Channel'], 0.2),
  };

  const sharedAction = {
    hover: varAlpha(greyPalette['500Channel'], 0.08),
    selected: varAlpha(greyPalette['500Channel'], 0.16),
    focus: varAlpha(greyPalette['500Channel'], 0.24),
    disabled: varAlpha(greyPalette['500Channel'], 0.8),
    disabledBackground: varAlpha(greyPalette['500Channel'], 0.24),
    hoverOpacity: 0.08 as const,
    disabledOpacity: 0.48 as const,
  };

  return {
    value,
    label,
    description,
    swatches,
    themeOverrides: {
      shape: { borderRadius: shape },
      colorSchemes: {
        light: {
          palette: {
            ...accentPalette,
            text: createPaletteChannel(text),
            background: createPaletteChannel(surface),
            action: { ...sharedAction, active: text.secondary },
          },
          customShadows: createCustomShadows(shadowBase.mainChannel),
        },
        dark: {
          palette: {
            ...accentPalette,
            text: createPaletteChannel({
              primary: '#FFFFFF',
              secondary: grey['400'],
              disabled: grey['600'],
            }),
            background: createPaletteChannel({
              paper: grey['800'],
              default: grey['900'],
              neutral: grey['700'],
            }),
            action: { ...sharedAction, active: grey['400'] },
          },
        },
      },
      components: {
        MuiCard: {
          styleOverrides: {
            root: {
              border: `1px solid ${varAlpha(primaryPalette.mainChannel, 0.12)}`,
            },
          },
        },
      },
    },
  };
}

export const themePresets: ThemePreset[] = [
  {
    value: 'classic-blue',
    label: '经典蓝',
    description: '当前默认的 Minimals 风格，保持现有界面完全不变。',
    swatches: ['#1877F2', '#8E33FF', '#22C55E', '#FFAB00'],
    themeOverrides: {},
  },
  createThemePreset({
    value: 'quantum-night',
    label: '量化夜盘',
    description: '冷静的蓝黑终端气质，适合行情与监控类页面。',
    swatches: ['#3B82F6', '#22D3EE', '#22C55E', '#F59E0B'],
    palette: {
      primary: {
        lighter: '#DAEAFE',
        light: '#82B7FF',
        main: '#3B82F6',
        dark: '#1D4ED8',
        darker: '#102A7A',
        contrastText: '#FFFFFF',
      },
      secondary: {
        lighter: '#D7F9FF',
        light: '#7DEFFF',
        main: '#22D3EE',
        dark: '#0891B2',
        darker: '#0E5B6F',
        contrastText: '#FFFFFF',
      },
      info: {
        lighter: '#DCEBFF',
        light: '#8AB6FF',
        main: '#2563EB',
        dark: '#1D4ED8',
        darker: '#142F86',
        contrastText: '#FFFFFF',
      },
      success: {
        lighter: '#D6FBE3',
        light: '#7BE4A7',
        main: '#22C55E',
        dark: '#15803D',
        darker: '#0E4A29',
        contrastText: '#FFFFFF',
      },
      warning: {
        lighter: '#FFF2D6',
        light: '#FFD27A',
        main: '#F59E0B',
        dark: '#B45309',
        darker: '#78350F',
        contrastText: '#1C252E',
      },
      error: {
        lighter: '#FFE1DE',
        light: '#FF9C8F',
        main: '#EF4444',
        dark: '#B91C1C',
        darker: '#7F1D1D',
        contrastText: '#FFFFFF',
      },
    },
    grey: {
      '50': '#F5F8FC',
      '100': '#EDF2F9',
      '200': '#DCE6F1',
      '300': '#B6C6D8',
      '400': '#8DA2B8',
      '500': '#667B91',
      '600': '#4C6179',
      '700': '#31465E',
      '800': '#16283D',
      '900': '#0B1120',
    },
    surface: {
      paper: '#FFFFFF',
      default: '#EDF3FB',
      neutral: '#DDE8F6',
    },
    text: {
      primary: '#10233D',
      secondary: '#486581',
      disabled: '#7D93AA',
    },
    shape: 10,
    shadowColor: '#4C6179',
  }),
  createThemePreset({
    value: 'arctic-glass',
    label: '极地玻璃',
    description: '冰蓝与薰衣草的高光组合，更轻盈也更未来感。',
    swatches: ['#4F8CFF', '#8B5CF6', '#2DD4BF', '#F59E0B'],
    palette: {
      primary: {
        lighter: '#DFEAFF',
        light: '#9EC2FF',
        main: '#4F8CFF',
        dark: '#2D5FD3',
        darker: '#173A8F',
        contrastText: '#FFFFFF',
      },
      secondary: {
        lighter: '#EFE5FF',
        light: '#C5A5FF',
        main: '#8B5CF6',
        dark: '#6D28D9',
        darker: '#43138D',
        contrastText: '#FFFFFF',
      },
      info: {
        lighter: '#D7F7FF',
        light: '#85E8FF',
        main: '#06B6D4',
        dark: '#0E7490',
        darker: '#144A63',
        contrastText: '#FFFFFF',
      },
      success: {
        lighter: '#D8FBF4',
        light: '#7DE7D6',
        main: '#2DD4BF',
        dark: '#0F9B8E',
        darker: '#115E59',
        contrastText: '#FFFFFF',
      },
      warning: {
        lighter: '#FFF3D7',
        light: '#FFD57A',
        main: '#F59E0B',
        dark: '#C26D00',
        darker: '#7A4500',
        contrastText: '#1C252E',
      },
      error: {
        lighter: '#FFE6E2',
        light: '#FF9C95',
        main: '#F43F5E',
        dark: '#BE123C',
        darker: '#881337',
        contrastText: '#FFFFFF',
      },
    },
    grey: {
      '50': '#FCFDFF',
      '100': '#F4F8FC',
      '200': '#EAF0F7',
      '300': '#D3DDE8',
      '400': '#A9B8C8',
      '500': '#7A90A7',
      '600': '#566D84',
      '700': '#3A4E65',
      '800': '#223349',
      '900': '#101B2D',
    },
    surface: {
      paper: '#FFFFFF',
      default: '#F4F8FC',
      neutral: '#E7EFF8',
    },
    text: {
      primary: '#10233F',
      secondary: '#5E738C',
      disabled: '#92A4B7',
    },
    shape: 16,
    shadowColor: '#7A90A7',
  }),
  createThemePreset({
    value: 'neo-securities',
    label: '新投行',
    description: '深海军蓝配香槟金，偏机构级和正式商业化。',
    swatches: ['#163B65', '#D4A017', '#2563EB', '#15803D'],
    palette: {
      primary: {
        lighter: '#D9E6F4',
        light: '#7DA2CF',
        main: '#163B65',
        dark: '#102A49',
        darker: '#0A1A2F',
        contrastText: '#FFFFFF',
      },
      secondary: {
        lighter: '#F8EDC7',
        light: '#E5C66C',
        main: '#D4A017',
        dark: '#A57800',
        darker: '#6B4B00',
        contrastText: '#FFFFFF',
      },
      info: {
        lighter: '#DCE8FF',
        light: '#8AB2FF',
        main: '#2563EB',
        dark: '#1D4ED8',
        darker: '#142F86',
        contrastText: '#FFFFFF',
      },
      success: {
        lighter: '#DBF7E4',
        light: '#88D7A6',
        main: '#15803D',
        dark: '#166534',
        darker: '#104326',
        contrastText: '#FFFFFF',
      },
      warning: {
        lighter: '#FFF1DA',
        light: '#F2C783',
        main: '#C78518',
        dark: '#9A5C00',
        darker: '#613700',
        contrastText: '#FFFFFF',
      },
      error: {
        lighter: '#FFE2E0',
        light: '#F8A39D',
        main: '#B42318',
        dark: '#8A1C14',
        darker: '#5B120D',
        contrastText: '#FFFFFF',
      },
    },
    grey: {
      '50': '#FBFCFE',
      '100': '#F6F8FB',
      '200': '#E9EEF5',
      '300': '#D0D8E4',
      '400': '#A7B3C5',
      '500': '#7A889E',
      '600': '#596882',
      '700': '#3C4B63',
      '800': '#223046',
      '900': '#111B2B',
    },
    surface: {
      paper: '#FFFFFF',
      default: '#F6F8FB',
      neutral: '#E8EDF5',
    },
    text: {
      primary: '#172B42',
      secondary: '#5B6B82',
      disabled: '#91A0B5',
    },
    shape: 10,
    shadowColor: '#596882',
  }),
  createThemePreset({
    value: 'signal-green',
    label: '信号绿',
    description: '黑绿实验室风格，适合异动监控和策略信号场景。',
    swatches: ['#00C853', '#00B8D9', '#FFD54F', '#FF6B6B'],
    palette: {
      primary: {
        lighter: '#B7F8CF',
        light: '#52E489',
        main: '#00C853',
        dark: '#008C3A',
        darker: '#005225',
        contrastText: '#FFFFFF',
      },
      secondary: {
        lighter: '#D5F9FF',
        light: '#7EEAFF',
        main: '#00B8D9',
        dark: '#007F98',
        darker: '#0A4C59',
        contrastText: '#FFFFFF',
      },
      info: {
        lighter: '#D7F7FF',
        light: '#89E6FF',
        main: '#14B8A6',
        dark: '#0F766E',
        darker: '#134E4A',
        contrastText: '#FFFFFF',
      },
      success: {
        lighter: '#CFFBDE',
        light: '#6BE89A',
        main: '#22C55E',
        dark: '#15803D',
        darker: '#14532D',
        contrastText: '#FFFFFF',
      },
      warning: {
        lighter: '#FFF5D2',
        light: '#FFE07D',
        main: '#FFD54F',
        dark: '#D4A60C',
        darker: '#8E6C04',
        contrastText: '#1C252E',
      },
      error: {
        lighter: '#FFE4E4',
        light: '#FFA0A0',
        main: '#FF6B6B',
        dark: '#E04444',
        darker: '#A82B2B',
        contrastText: '#FFFFFF',
      },
    },
    grey: {
      '50': '#F3FAF6',
      '100': '#E5F4EA',
      '200': '#C7E2D2',
      '300': '#A2C9B3',
      '400': '#7BA98F',
      '500': '#588471',
      '600': '#406654',
      '700': '#294738',
      '800': '#182D24',
      '900': '#0A140F',
    },
    surface: {
      paper: '#0F1512',
      default: '#08100B',
      neutral: '#13201A',
    },
    text: {
      primary: '#E8FFF1',
      secondary: '#A9C3B4',
      disabled: '#7B9688',
    },
    shape: 12,
    shadowColor: '#182D24',
  }),
  createThemePreset({
    value: 'aurora-gradient',
    label: '极光渐变',
    description: '更具品牌感的高饱和主题，适合展示与运营页面。',
    swatches: ['#6366F1', '#EC4899', '#06B6D4', '#10B981'],
    palette: {
      primary: {
        lighter: '#E5E6FF',
        light: '#A5A7FF',
        main: '#6366F1',
        dark: '#4338CA',
        darker: '#27256E',
        contrastText: '#FFFFFF',
      },
      secondary: {
        lighter: '#FFE0F0',
        light: '#FF9FC7',
        main: '#EC4899',
        dark: '#BE185D',
        darker: '#831843',
        contrastText: '#FFFFFF',
      },
      info: {
        lighter: '#D8F8FF',
        light: '#8EEBFF',
        main: '#06B6D4',
        dark: '#0E7490',
        darker: '#164E63',
        contrastText: '#FFFFFF',
      },
      success: {
        lighter: '#D8FAEC',
        light: '#83E6BE',
        main: '#10B981',
        dark: '#047857',
        darker: '#064E3B',
        contrastText: '#FFFFFF',
      },
      warning: {
        lighter: '#FFF1D6',
        light: '#FFD084',
        main: '#F59E0B',
        dark: '#B45309',
        darker: '#78350F',
        contrastText: '#1C252E',
      },
      error: {
        lighter: '#FFE1E2',
        light: '#FFA0A6',
        main: '#F43F5E',
        dark: '#BE123C',
        darker: '#881337',
        contrastText: '#FFFFFF',
      },
    },
    grey: {
      '50': '#FEFCFF',
      '100': '#F8F7FF',
      '200': '#EDEBFA',
      '300': '#D6D1E8',
      '400': '#B2AACD',
      '500': '#8B82A9',
      '600': '#69617F',
      '700': '#494361',
      '800': '#2C2740',
      '900': '#171425',
    },
    surface: {
      paper: '#FFFFFF',
      default: '#F8F6FF',
      neutral: '#EEE9FF',
    },
    text: {
      primary: '#211C3A',
      secondary: '#666084',
      disabled: '#9992B3',
    },
    shape: 14,
    shadowColor: '#8B82A9',
  }),
  createThemePreset({
    value: 'paper-research',
    label: '研究纸感',
    description: '偏研报与阅读体验，适合分析、资讯与结论页面。',
    swatches: ['#1E3A5F', '#B7791F', '#7C8CA5', '#2F855A'],
    palette: {
      primary: {
        lighter: '#DCE7F3',
        light: '#8FA8C6',
        main: '#1E3A5F',
        dark: '#17304E',
        darker: '#0C1B2F',
        contrastText: '#FFFFFF',
      },
      secondary: {
        lighter: '#F5E7CF',
        light: '#D5AE6E',
        main: '#B7791F',
        dark: '#8C5A11',
        darker: '#5B3908',
        contrastText: '#FFFFFF',
      },
      info: {
        lighter: '#E1E8F0',
        light: '#9EADBF',
        main: '#7C8CA5',
        dark: '#5B677B',
        darker: '#3A4454',
        contrastText: '#FFFFFF',
      },
      success: {
        lighter: '#DFF5E8',
        light: '#97D4B0',
        main: '#2F855A',
        dark: '#276749',
        darker: '#1C4532',
        contrastText: '#FFFFFF',
      },
      warning: {
        lighter: '#FFF4DB',
        light: '#E9C37B',
        main: '#D69E2E',
        dark: '#A37018',
        darker: '#6C450C',
        contrastText: '#FFFFFF',
      },
      error: {
        lighter: '#FBE5E2',
        light: '#DFA29A',
        main: '#C05640',
        dark: '#9B3C29',
        darker: '#672519',
        contrastText: '#FFFFFF',
      },
    },
    grey: {
      '50': '#FFFDFC',
      '100': '#FAF7F2',
      '200': '#EFE7DB',
      '300': '#DCCFBE',
      '400': '#BDAF9C',
      '500': '#978978',
      '600': '#746757',
      '700': '#564B40',
      '800': '#3A312A',
      '900': '#1F1915',
    },
    surface: {
      paper: '#FFFCF8',
      default: '#FAF7F2',
      neutral: '#F0E8DD',
    },
    text: {
      primary: '#2C241D',
      secondary: '#6B6258',
      disabled: '#A39A8E',
    },
    shape: 8,
    shadowColor: '#978978',
  }),
];

export function isThemePresetKey(value: string): value is ThemePresetKey {
  return themePresets.some((preset) => preset.value === value);
}
