import { screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { render } from '@testing-library/react';

import { theme } from 'src/test/test-utils';

import { Scrollbar } from '../scrollbar';

// ----------------------------------------------------------------------

function renderScrollbar(props: React.ComponentProps<typeof Scrollbar>) {
  return render(<ThemeProvider theme={theme}><Scrollbar {...props} /></ThemeProvider>);
}

// ----------------------------------------------------------------------

describe('Scrollbar — rendering', () => {
  it('renders children content', () => {
    renderScrollbar({ children: <p>scrollable content</p> });
    expect(screen.getByText('scrollable content')).toBeInTheDocument();
  });

  it('applies scrollbar root class', () => {
    const { container } = renderScrollbar({ children: <p>content</p> });
    const el = container.querySelector('[class*="scrollbar__root"]');
    expect(el).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = renderScrollbar({ children: <p>content</p>, className: 'my-scroll' });
    const el = container.querySelector('.my-scroll');
    expect(el).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    renderScrollbar({
      children: (
        <>
          <p>item 1</p>
          <p>item 2</p>
          <p>item 3</p>
        </>
      ),
    });
    expect(screen.getByText('item 1')).toBeInTheDocument();
    expect(screen.getByText('item 2')).toBeInTheDocument();
    expect(screen.getByText('item 3')).toBeInTheDocument();
  });
});

// ----------------------------------------------------------------------

describe('Scrollbar — sx prop', () => {
  it('renders with sx prop without crashing', () => {
    const { container } = renderScrollbar({
      children: <p>styled content</p>,
      sx: { maxHeight: 300 },
    });
    expect(container.firstChild).toBeInTheDocument();
  });
});
