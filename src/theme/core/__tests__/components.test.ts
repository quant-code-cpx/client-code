import { components } from '../components';
import { createTheme } from '../../create-theme';

describe('button theme baseline', () => {
  it('keeps Button height baselines at 32/40/48px', () => {
    expect(components).toMatchObject({
      MuiButton: {
        styleOverrides: {
          sizeSmall: { minHeight: 32 },
          sizeMedium: { minHeight: 40 },
          sizeLarge: { minHeight: 48 },
        },
      },
    });
  });

  it('keeps IconButton and ToggleButton compact-control baselines', () => {
    expect(components).toMatchObject({
      MuiIconButton: {
        styleOverrides: {
          sizeSmall: { width: 32, height: 32 },
          sizeMedium: { width: 40, height: 40 },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          sizeSmall: { minHeight: 32, fontSize: '0.75rem', padding: '0 12px' },
        },
      },
      MuiToggleButtonGroup: {
        defaultProps: { color: 'primary' },
      },
    });
  });

  it('keeps a visible focus ring for Header IconButtons through MuiButtonBase', () => {
    const root = components.MuiButtonBase.styleOverrides?.root;
    expect(root).toEqual(expect.any(Function));
    if (typeof root !== 'function') throw new Error('MuiButtonBase root override is missing');

    const theme = createTheme();
    const styles = root({ theme } as Parameters<typeof root>[0]);

    expect(styles).toMatchObject({
      '&.Mui-focusVisible, &:focus-visible': {
        outline: `2px solid ${theme.vars.palette.primary.main}`,
        outlineOffset: 2,
      },
    });
  });
});
