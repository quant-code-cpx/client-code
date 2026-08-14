import type { Strategy } from 'src/api/strategy';
import type { BacktestRunForm } from 'src/sections/backtest/types';

import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

const { mockUpdateStrategy } = vi.hoisted(() => ({ mockUpdateStrategy: vi.fn() }));

vi.mock('src/api/strategy', () => ({ updateStrategy: mockUpdateStrategy }));
vi.mock('src/components/iconify', () => ({ Iconify: () => null }));
vi.mock('src/sections/backtest/backtest-strategy-config-panel', () => ({
  BacktestStrategyConfigPanel: ({
    form,
    onChange,
  }: {
    form: BacktestRunForm;
    onChange: (patch: Partial<BacktestRunForm>) => void;
  }) => (
    <div>
      {`editing:${JSON.stringify(form.strategyConfig)}`}
      <button
        type="button"
        onClick={() => onChange({ strategyConfig: { ...form.strategyConfig, shortWindow: 8 } })}
      >
        短均线改为8
      </button>
    </div>
  ),
}));

import { StrategyConfigCard } from '../strategy-config-card';

function strategy(patch: Partial<Strategy> = {}): Strategy {
  return {
    id: 'strategy-alpha',
    userId: 1,
    name: 'Alpha',
    description: null,
    strategyType: 'MA_CROSS_SINGLE',
    strategyConfig: { tsCode: '600000.SH', shortWindow: 5, longWindow: 20, allowFlat: false },
    backtestDefaults: null,
    tags: [],
    version: 1,
    isPublic: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-08-12T00:00:00.000Z',
    ...patch,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('StrategyConfigCard', () => {
  it('展示均线配置，编辑后仅提交 strategyConfig 与资源 ID', async () => {
    const updated = strategy({ strategyConfig: { tsCode: '600000.SH', shortWindow: 8, longWindow: 20 } });
    mockUpdateStrategy.mockResolvedValue(updated);
    const onUpdate = vi.fn();
    const { user } = renderWithProviders(
      <StrategyConfigCard strategy={strategy()} onUpdate={onUpdate} />
    );

    expect(screen.getByText('600000.SH')).toBeInTheDocument();
    expect(screen.getByText('5 日')).toBeInTheDocument();
    expect(screen.getByText('20 日')).toBeInTheDocument();
    expect(screen.getByText('否')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '编辑' }));
    await user.click(screen.getByRole('button', { name: '短均线改为8' }));
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(mockUpdateStrategy).toHaveBeenCalledWith({
      id: 'strategy-alpha',
      strategyConfig: { tsCode: '600000.SH', shortWindow: 8, longWindow: 20, allowFlat: false },
    });
    expect(onUpdate).toHaveBeenCalledWith(updated);
    await waitFor(() => expect(screen.queryByText(/editing:/)).not.toBeInTheDocument());
  });

  it('保存失败保留编辑草稿和错误，取消后可重新从最新 props 载入', async () => {
    mockUpdateStrategy.mockRejectedValue(new Error('版本冲突，请刷新'));
    const view = renderWithProviders(<StrategyConfigCard strategy={strategy()} onUpdate={vi.fn()} />);

    await view.user.click(screen.getByRole('button', { name: '编辑' }));
    await view.user.click(screen.getByRole('button', { name: '短均线改为8' }));
    await view.user.click(screen.getByRole('button', { name: '保存' }));
    expect(await screen.findByText('版本冲突，请刷新')).toBeInTheDocument();
    expect(screen.getByText(/"shortWindow":8/)).toBeInTheDocument();

    await view.user.click(screen.getByRole('button', { name: '取消' }));
    view.rerender(
      <StrategyConfigCard
        strategy={strategy({ strategyConfig: { tsCode: '000001.SZ', shortWindow: 10, longWindow: 30 } })}
        onUpdate={vi.fn()}
      />
    );
    await view.user.click(screen.getByRole('button', { name: '编辑' }));
    expect(screen.getByText(/"shortWindow":10/)).toBeInTheDocument();
  });

  it('未知策略类型退化为只读 JSON，保留后端扩展字段', () => {
    renderWithProviders(
      <StrategyConfigCard
        strategy={strategy({ strategyType: 'FUTURE_TYPE', strategyConfig: { threshold: null, flag: true } })}
        onUpdate={vi.fn()}
      />
    );
    expect(screen.getByText(/"threshold": null/)).toBeInTheDocument();
    expect(screen.getByText(/"flag": true/)).toBeInTheDocument();
  });
});
