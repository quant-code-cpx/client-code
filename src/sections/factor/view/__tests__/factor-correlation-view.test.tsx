/** @vitest-environment jsdom */

import type { ReactNode } from 'react';
import type { FactorDef, FactorCorrelationResult } from 'src/api/factor';

import { vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import { factorApi } from 'src/api/factor';
import { renderWithProviders } from 'src/test/test-utils';

import { FactorCorrelationView } from '../factor-correlation-view';

import type { CorrelationPair } from '../../factor-correlation-helpers';

const mocks = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock('src/api/factor', () => ({
  factorApi: { library: vi.fn(), correlation: vi.fn() },
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-router');
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock('src/layouts/dashboard', () => ({
  DashboardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../factor-correlation-params', () => ({
  FactorCorrelationParams: ({
    selectedFactors,
    onChangeFactors,
    onChangeTradeDate,
    onChangeUniverse,
    onChangeMethod,
    onChangeThreshold,
    onCalculate,
    paramsDirty,
  }: {
    selectedFactors: string[];
    onChangeFactors: (factors: string[]) => void;
    onChangeTradeDate: (date: string) => void;
    onChangeUniverse: (universe: string) => void;
    onChangeMethod: (method: 'spearman' | 'pearson') => void;
    onChangeThreshold: (threshold: number) => void;
    onCalculate: () => void;
    paramsDirty: boolean;
  }) => (
    <section aria-label="相关性参数">
      <span>已选因子：{selectedFactors.join(',')}</span>
      <span>参数状态：{paramsDirty ? '已变更' : '同步'}</span>
      <button type="button" onClick={() => onChangeFactors(['roe'])}>
        只选一个因子
      </button>
      <button type="button" onClick={() => onChangeFactors(['roe', 'pb'])}>
        选择两个因子
      </button>
      <button type="button" onClick={() => onChangeTradeDate('2026-08-12')}>
        设置交易日
      </button>
      <button type="button" onClick={() => onChangeUniverse('000300.SH')}>
        设置股票池
      </button>
      <button type="button" onClick={() => onChangeMethod('pearson')}>
        使用 Pearson
      </button>
      <button type="button" onClick={() => onChangeThreshold(0.8)}>
        阈值 0.8
      </button>
      <button type="button" onClick={onCalculate}>
        计算相关性
      </button>
    </section>
  ),
}));

vi.mock('../../factor-correlation-summary', () => ({
  FactorCorrelationSummary: ({
    onShowMethod,
    onFocusHighPairs,
  }: {
    onShowMethod: (el: HTMLElement) => void;
    onFocusHighPairs: () => void;
  }) => (
    <section aria-label="相关性摘要">
      <button type="button" onClick={(event) => onShowMethod(event.currentTarget)}>
        查看方法
      </button>
      <button type="button" onClick={onFocusHighPairs}>
        聚焦高相关
      </button>
    </section>
  ),
}));

vi.mock('../../factor-correlation-heatmap', () => ({
  FactorCorrelationHeatmap: ({ onCellClick }: { onCellClick: (row: number, col: number) => void }) => (
    <button type="button" onClick={() => onCellClick(0, 1)}>
      点击热力格
    </button>
  ),
}));

vi.mock('../../factor-correlation-pair-table', () => ({
  FactorCorrelationPairTable: ({
    pairs,
    highOnly,
    onSelect,
    onOrthogonalize,
    onRemoveFactor,
  }: {
    pairs: CorrelationPair[];
    highOnly: boolean;
    onSelect: (pair: CorrelationPair) => void;
    onOrthogonalize: (pair: CorrelationPair) => void;
    onRemoveFactor: (factor: string) => void;
  }) => (
    <section aria-label="因子对">
      <span>因子对：{pairs.length}</span>
      <span>仅高相关：{String(highOnly)}</span>
      <button type="button" onClick={() => pairs[0] && onSelect(pairs[0])}>
        选择因子对
      </button>
      <button type="button" onClick={() => pairs[0] && onOrthogonalize(pairs[0])}>
        正交化
      </button>
      <button type="button" onClick={() => onRemoveFactor('roe')}>
        移除 ROE
      </button>
    </section>
  ),
}));

vi.mock('../../factor-correlation-pair-drawer', () => ({
  FactorCorrelationPairDrawer: ({
    open,
    pair,
    onClose,
    onAdvancedAnalysis,
  }: {
    open: boolean;
    pair: CorrelationPair | null;
    onClose: () => void;
    onAdvancedAnalysis: (pair: CorrelationPair) => void;
  }) =>
    open && pair ? (
      <aside>
        <span>抽屉因子对：{pair.factorA}/{pair.factorB}</span>
        <button type="button" onClick={() => onAdvancedAnalysis(pair)}>
          高级分析
        </button>
        <button type="button" onClick={onClose}>
          关闭抽屉
        </button>
      </aside>
    ) : null,
}));

vi.mock('../../factor-correlation-method-popover', () => ({
  FactorCorrelationMethodPopover: ({
    anchorEl,
    onClose,
  }: {
    anchorEl: HTMLElement | null;
    onClose: () => void;
  }) =>
    anchorEl ? (
      <button type="button" onClick={onClose}>
        关闭计算方法
      </button>
    ) : null,
}));

const factors: FactorDef[] = [
  {
    id: 'roe',
    name: 'roe',
    label: '净资产收益率',
    category: 'QUALITY',
    sourceType: 'FIELD_REF',
    isBuiltin: true,
  },
  {
    id: 'pb',
    name: 'pb',
    label: '市净率',
    category: 'VALUATION',
    sourceType: 'FIELD_REF',
    isBuiltin: true,
  },
];

const result: FactorCorrelationResult = {
  tradeDate: '20260812',
  method: 'pearson',
  factors: ['pb', 'roe'],
  factorLabels: ['市净率', '净资产收益率'],
  matrix: [
    [1, -0.86],
    [-0.86, 1],
  ],
  nMatrix: [
    [300, 278],
    [278, 290],
  ],
  coverage: [0.98, 0.96],
};

describe('FactorCorrelationView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(factorApi.library).mockResolvedValue({
      categories: [
        { category: 'QUALITY', label: '质量', factors: [factors[0]] },
        { category: 'VALUATION', label: '估值', factors: [factors[1]] },
      ],
    });
    vi.mocked(factorApi.correlation).mockResolvedValue(result);
  });

  it('校验最少因子数，并用 YYYYMMDD + 股票池 + 方法调用 API', async () => {
    const { user } = renderWithProviders(<FactorCorrelationView />);
    await waitFor(() => expect(factorApi.library).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: '只选一个因子' }));
    await user.click(screen.getByRole('button', { name: '计算相关性' }));
    expect(screen.getByText('请至少选择 2 个因子')).toBeInTheDocument();
    expect(factorApi.correlation).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '选择两个因子' }));
    await user.click(screen.getByRole('button', { name: '设置交易日' }));
    await user.click(screen.getByRole('button', { name: '设置股票池' }));
    await user.click(screen.getByRole('button', { name: '使用 Pearson' }));
    await user.click(screen.getByRole('button', { name: '阈值 0.8' }));
    await user.click(screen.getByRole('button', { name: '计算相关性' }));

    await screen.findByText('因子对：1');
    expect(factorApi.correlation).toHaveBeenCalledWith({
      factorNames: ['roe', 'pb'],
      tradeDate: '20260812',
      universe: '000300.SH',
      method: 'pearson',
    });
    expect(screen.getByText('参数状态：同步')).toBeInTheDocument();
  });

  it('支持高相关聚焦、因子对下钻、移除和高级分析路由', async () => {
    const { user } = renderWithProviders(<FactorCorrelationView />);
    await user.click(screen.getByRole('button', { name: '选择两个因子' }));
    await user.click(screen.getByRole('button', { name: '计算相关性' }));
    await screen.findByText('因子对：1');

    await user.click(screen.getByRole('button', { name: '聚焦高相关' }));
    expect(screen.getByText('仅高相关：true')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '点击热力格' }));
    expect(screen.getByText('抽屉因子对：pb/roe')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '高级分析' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/factor/advanced-analysis?factors=pb%2Croe');

    await user.click(screen.getByRole('button', { name: '正交化' }));
    expect(mocks.navigate).toHaveBeenCalledWith(
      '/factor/advanced-analysis?mode=orthogonalize&factors=pb%2Croe'
    );

    await user.click(screen.getByRole('button', { name: '移除 ROE' }));
    expect(await screen.findByText('已从已选因子中移除 净资产收益率，请重新计算')).toBeInTheDocument();
    expect(screen.getByText('参数状态：已变更')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '查看方法' }));
    expect(screen.getByRole('button', { name: '关闭计算方法' })).toBeInTheDocument();
  });

  it('呈现因子库降级、计算错误与响应契约错误', async () => {
    vi.mocked(factorApi.library).mockRejectedValue(new Error('标签服务不可用'));
    vi.mocked(factorApi.correlation)
      .mockRejectedValueOnce(new Error('计算超时'))
      .mockResolvedValueOnce({ ...result, matrix: [[1]] });
    const { user } = renderWithProviders(<FactorCorrelationView />);

    expect(
      await screen.findByText('因子标签加载失败（标签服务不可用），相关性仍可按因子英文名计算。')
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '选择两个因子' }));
    await user.click(screen.getByRole('button', { name: '计算相关性' }));
    expect(await screen.findByText('计算超时')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '计算相关性' }));
    expect(await screen.findByText(/矩阵行数 1 与因子数 2 不一致/)).toBeInTheDocument();
    expect(screen.queryByText('因子对：1')).not.toBeInTheDocument();
  });
});
