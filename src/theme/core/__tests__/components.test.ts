import { createElement } from 'react';
import { screen } from '@testing-library/react';

import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

import { renderWithProviders } from 'src/test/test-utils';

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

describe('Card surface theme baseline', () => {
  const theme = createTheme();
  const root = components.MuiCard.styleOverrides?.root;

  if (typeof root !== 'function') throw new Error('MuiCard root override is missing');

  const resolveStyles = (variant?: 'elevation' | 'outlined') =>
    root({
      theme,
      ownerState: variant ? { variant } : {},
    } as Parameters<typeof root>[0]);

  it('keeps default and elevation Cards on the semantic 16px shadowed surface', () => {
    const expectedStyles = {
      zIndex: 0,
      position: 'relative',
      boxShadow: theme.vars.customShadows.card,
      borderRadius: 16,
    };

    expect(resolveStyles()).toMatchObject(expectedStyles);
    expect(resolveStyles('elevation')).toMatchObject(expectedStyles);
  });

  it('keeps outlined Cards on the same shape without a shadow', () => {
    expect(resolveStyles('outlined')).toMatchObject({
      zIndex: 0,
      position: 'relative',
      boxShadow: 'none',
      borderRadius: 16,
    });
  });
});

describe('overlay surface theme baseline', () => {
  const theme = createTheme();

  it('uses the semantic dialog surface while preserving the full-screen shape', () => {
    const paper = components.MuiDialog.styleOverrides?.paper;
    expect(paper).toEqual(expect.any(Function));
    if (typeof paper !== 'function') throw new Error('MuiDialog paper override is missing');

    const regularStyles = paper({
      theme,
      ownerState: { fullScreen: false },
    } as Parameters<typeof paper>[0]);
    const fullScreenStyles = paper({
      theme,
      ownerState: { fullScreen: true },
    } as Parameters<typeof paper>[0]);

    expect(regularStyles).toMatchObject({
      boxShadow: theme.vars.customShadows.dialog,
      borderRadius: Number(theme.shape.borderRadius) * 2,
    });
    expect(fullScreenStyles).toMatchObject({
      boxShadow: theme.vars.customShadows.dialog,
      borderRadius: 0,
    });
  });

  it('uses the semantic dropdown shadow for popover surfaces', () => {
    const paper = components.MuiPopover.styleOverrides?.paper;
    expect(paper).toEqual(expect.any(Function));
    if (typeof paper !== 'function') throw new Error('MuiPopover paper override is missing');

    const styles = paper({ theme } as Parameters<typeof paper>[0]);

    expect(styles).toMatchObject({ boxShadow: theme.vars.customShadows.dropdown });
  });

  it('uses the semantic dropdown shadow for Menu surfaces', () => {
    const paper = components.MuiMenu.styleOverrides?.paper;
    expect(paper).toEqual(expect.any(Function));
    if (typeof paper !== 'function') throw new Error('MuiMenu paper override is missing');

    const styles = paper({ theme } as Parameters<typeof paper>[0]);
    expect(styles).toMatchObject({ boxShadow: theme.vars.customShadows.dropdown });

    renderWithProviders(
      createElement(
        Menu,
        {
          open: true,
          onClose: vi.fn(),
          anchorReference: 'anchorPosition',
          anchorPosition: { top: 0, left: 0 },
          transitionDuration: 0,
        },
        createElement(MenuItem, null, '菜单项')
      )
    );

    const menuPaper = screen.getByRole('menu').closest('.MuiPaper-root');
    expect(menuPaper).not.toBeNull();
    expect(window.getComputedStyle(menuPaper!).boxShadow).toMatch(
      /^var\(--customShadows-dropdown(?:,|\))/
    );
  });
});
