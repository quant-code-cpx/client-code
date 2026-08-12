import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { GenerateFormStrategy } from '../generate/generate-form-strategy';

vi.mock('src/api/backtest', () => ({
  listRuns: vi.fn(() => new Promise(() => {})),
}));
vi.mock('src/api/strategy', () => ({
  listStrategies: vi.fn(() => new Promise(() => {})),
}));
vi.mock('src/api/portfolio', () => ({
  listPortfolios: vi.fn(() => new Promise(() => {})),
}));

describe('GenerateFormStrategy 后端能力边界', () => {
  it('不展示后端不支持的章节，未选择组合时禁用交易日志', () => {
    renderWithProviders(
      <GenerateFormStrategy
        value={{ backtestRunId: '' }}
        onChange={vi.fn()}
        onValidChange={vi.fn()}
      />
    );

    expect(screen.queryByText('因子暴露')).not.toBeInTheDocument();
    expect(screen.queryByText('参数敏感性')).not.toBeInTheDocument();
    expect(screen.queryByText('滚动稳定性')).not.toBeInTheDocument();
    expect(screen.getByRole('switch', { name: '交易日志（需先选择组合）' })).toBeDisabled();
  });
});
