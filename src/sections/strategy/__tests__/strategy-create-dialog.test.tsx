import type { BacktestRunForm } from 'src/sections/backtest/types';

import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

vi.mock('src/sections/backtest/backtest-strategy-config-panel', () => ({
  BacktestStrategyConfigPanel: ({
    selectedTemplateId,
    form,
    onChange,
  }: {
    selectedTemplateId: string;
    form: BacktestRunForm;
    onChange: (patch: Partial<BacktestRunForm>) => void;
  }) => (
    <div>
      {`config:${selectedTemplateId}:${JSON.stringify(form.strategyConfig)}`}
      <button
        type="button"
        onClick={() =>
          onChange({
            strategyConfig: { tsCode: '600000.SH', shortWindow: 7, longWindow: 30 },
          })
        }
      >
        设置确定配置
      </button>
    </div>
  ),
}));

import { StrategyCreateDialog } from '../strategy-create-dialog';

describe('StrategyCreateDialog', () => {
  it('选择类型后载入默认配置，提交 trim 后名称、描述和确定配置', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const { user } = renderWithProviders(
      <StrategyCreateDialog open onClose={vi.fn()} onConfirm={onConfirm} submitting={false} />
    );

    expect(screen.queryByRole('checkbox', { name: '公开策略' })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/策略名称/), '  均线 Alpha  ');
    await user.type(screen.getByLabelText('策略描述（可选）'), '  双均线验证  ');
    await user.click(screen.getByRole('button', { name: /均线择时/ }));

    expect(screen.getByText(/config:MA_CROSS_SINGLE/)).toHaveTextContent(
      '"shortWindow":5'
    );
    await user.click(screen.getByRole('button', { name: '设置确定配置' }));
    await user.click(screen.getByRole('button', { name: '创建' }));

    expect(onConfirm).toHaveBeenCalledWith({
      name: '均线 Alpha',
      description: '双均线验证',
      strategyType: 'MA_CROSS_SINGLE',
      strategyConfig: { tsCode: '600000.SH', shortWindow: 7, longWindow: 30 },
      tags: undefined,
    });
  });

  it('因子选股轮动使用冻结默认 JSON，不渲染普通配置面板', async () => {
    const { user } = renderWithProviders(
      <StrategyCreateDialog
        open
        onClose={vi.fn()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        submitting={false}
      />
    );

    await user.type(screen.getByLabelText(/策略名称/), '因子轮动');
    await user.click(screen.getByRole('button', { name: /因子选股轮动/ }));

    expect(screen.getByText('策略配置（因子选股轮动）')).toBeInTheDocument();
    expect(screen.getByText(/配置面板正在开发中/)).toBeInTheDocument();
    expect(screen.getByText(/"weightMethod": "equal_weight"/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '设置确定配置' })).not.toBeInTheDocument();
  });

  it('提交中锁定取消与创建，关闭后再打开重置草稿', async () => {
    const onClose = vi.fn();
    const view = renderWithProviders(
      <StrategyCreateDialog open onClose={onClose} onConfirm={vi.fn()} submitting={false} />
    );
    await view.user.type(screen.getByLabelText(/策略名称/), '临时草稿');
    await view.user.click(screen.getByRole('button', { name: /均线择时/ }));

    view.rerender(
      <StrategyCreateDialog open onClose={onClose} onConfirm={vi.fn()} submitting />
    );
    expect(screen.getByRole('button', { name: '取消' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '创建' })).toBeDisabled();

    view.rerender(
      <StrategyCreateDialog open={false} onClose={onClose} onConfirm={vi.fn()} submitting={false} />
    );
    view.rerender(
      <StrategyCreateDialog open onClose={onClose} onConfirm={vi.fn()} submitting={false} />
    );
    expect(screen.getByLabelText(/策略名称/)).toHaveValue('');
    expect(screen.getByRole('button', { name: '创建' })).toBeDisabled();
  });
});
