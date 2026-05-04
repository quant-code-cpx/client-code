import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { SignalReturnText } from '../signal-return-text';

// ----------------------------------------------------------------------

describe('SignalReturnText', () => {
  it('正收益显示加号和百分比', () => {
    renderWithProviders(<SignalReturnText value={3.8} />);

    expect(screen.getByText('+3.8%')).toBeInTheDocument();
  });

  it('负收益显示绿色口径对应的负百分比文案', () => {
    renderWithProviders(<SignalReturnText value={-1.2} />);

    expect(screen.getByText('-1.2%')).toBeInTheDocument();
  });

  it('缺失收益显示占位符', () => {
    renderWithProviders(<SignalReturnText value={null} />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
