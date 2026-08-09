import { screen } from '@testing-library/react';

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { renderWithProviders } from 'src/test/test-utils';

import { BacktestConfigForm } from '../backtest-config-form';
import { ComparisonStrategyCard } from '../comparison-strategy-card';
import { DEFAULT_FORM, DEFAULT_SCREENING_CONFIG } from '../constants';

import type { ComparisonStrategyFormItem } from '../types';

// ----------------------------------------------------------------------

function expectLabelReference(control: HTMLElement) {
  const labelId = control.getAttribute('aria-labelledby');
  expect(labelId).toBeTruthy();
  labelId?.split(' ').forEach((id) => expect(document.getElementById(id)).not.toBeNull());
}

describe('回测表单可访问名称', () => {
  it('工作台 2 个 Select、3 个 Switch、2 个 Slider 均绑定 label 与 id/name', () => {
    const { container } = renderWithProviders(
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <BacktestConfigForm form={DEFAULT_FORM} onChange={vi.fn()} />
      </LocalizationProvider>
    );

    [
      ['基准指数', 'backtest-benchmark', 'benchmarkTsCode'],
      ['股票池范围', 'backtest-universe', 'universe'],
    ].forEach(([label, id, name]) => {
      const select = screen.getByRole('combobox', { name: label });
      expect(select).toHaveAttribute('id', id);
      expectLabelReference(select);
      expect(container.querySelector(`input[name="${name}"]`)).not.toBeNull();
    });

    [
      ['真实交易约束', 'backtest-trade-constraints', 'enableTradeConstraints'],
      ['T+1 限制', 'backtest-t1-restriction', 'enableT1Restriction'],
      ['允许部分成交', 'backtest-partial-fill', 'partialFillEnabled'],
    ].forEach(([label, id, name]) => {
      expect(screen.getByRole('checkbox', { name: label })).toHaveAttribute('id', id);
      expect(container.querySelector(`input[name="${name}"]`)).not.toBeNull();
    });

    [
      ['滑点（bps）', 'backtest-slippage', 'slippageBps'],
      ['单票最大权重', 'backtest-max-weight', 'maxWeightPerStock'],
    ].forEach(([label, id, name]) => {
      const slider = screen.getByRole('slider', { name: new RegExp(label) });
      expect(slider).toHaveAttribute('id', id);
      expect(slider).toHaveAttribute('name', name);
    });
  });

  it('多策略卡片使用 index 生成唯一 Select id，并绑定各自 label', () => {
    const strategy: ComparisonStrategyFormItem = {
      label: '策略',
      strategyType: 'SCREENING_ROTATION',
      strategyConfig: DEFAULT_SCREENING_CONFIG as unknown as Record<string, unknown>,
      rebalanceFrequency: 'MONTHLY',
    };

    renderWithProviders(
      <>
        <ComparisonStrategyCard
          index={0}
          item={strategy}
          onChange={vi.fn()}
          onRemove={vi.fn()}
          canRemove
        />
        <ComparisonStrategyCard
          index={1}
          item={strategy}
          onChange={vi.fn()}
          onRemove={vi.fn()}
          canRemove
        />
      </>
    );

    const selects = screen.getAllByRole('combobox');
    const ids = selects.map((select) => select.id);

    expect(selects).toHaveLength(6);
    expect(new Set(ids).size).toBe(ids.length);
    selects.forEach((select) => {
      expect(select.id).toMatch(/^comparison-strategy-[01]-/);
      expectLabelReference(select);
    });
  });
});
