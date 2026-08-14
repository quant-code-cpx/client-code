/** @vitest-environment jsdom */

import type { ReactNode } from 'react';
import type { FactorCondition, FactorScreeningResult } from 'src/api/factor';

import { vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import { factorApi } from 'src/api/factor';
import { renderWithProviders } from 'src/test/test-utils';

import { FactorScreeningView } from '../factor-screening-view';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  patch: vi.fn(),
  savePreset: vi.fn(() => ({ ok: true, presets: [] })),
  removePreset: vi.fn(),
  saveSubscriptionDraft: vi.fn(),
  state: {
    tradeDate: '20260812',
    universe: '000300.SH',
    conditions: [{ factorName: 'roe', operator: 'between', min: 8, max: 20 }] as FactorCondition[],
    sortMode: 'single' as const,
    sortBy: 'roe',
    sortOrder: 'desc' as const,
    tradeConstraints: {
      excludeSt: true,
      excludeSuspended: true,
      excludeBse: false,
      minListDays: 60,
    },
  },
}));

vi.mock('src/api/factor', () => ({
  factorApi: {
    library: vi.fn(),
    screening: vi.fn(),
  },
}));

vi.mock('src/routes/hooks', () => ({ useRouter: () => ({ push: mocks.push }) }));

vi.mock('src/layouts/dashboard', () => ({
  DashboardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('src/components/iconify', () => ({ Iconify: () => null }));

vi.mock('src/sections/screener-subscription/rule-builder/draft-handoff', () => ({
  saveSubscriptionDraft: mocks.saveSubscriptionDraft,
}));

vi.mock('src/sections/stock/stock-watchlist-batch-dialog', () => ({
  StockWatchlistBatchDialog: ({
    open,
    tsCodes,
    onSuccess,
  }: {
    open: boolean;
    tsCodes: string[];
    onSuccess: (added: number, skipped: number) => void;
  }) =>
    open ? (
      <div>
        <span>自选目标：{tsCodes.join(',')}</span>
        <button type="button" onClick={() => onSuccess(1, 1)}>
          确认加入
        </button>
      </div>
    ) : null,
}));

vi.mock('../../screening', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('../../screening');

  type ConfigProps = {
    libraryLoading: boolean;
    libraryError: string;
    error: string;
    onRetryLibrary: () => void;
    onRun: () => void;
    onReset: () => void;
    onConditionsChange: (conditions: FactorCondition[]) => void;
  };
  type ResultsProps = {
    result: FactorScreeningResult | null;
    page: number;
    selected: Set<string>;
    actionLog: Array<{ message: string }>;
    onPageChange: (page: number) => void;
    onToggleRow: (tsCode: string) => void;
    onToggleAll: (checked: boolean) => void;
    onAddToWatchlist: () => void;
    onSaveStrategy: () => void;
    onQuickBacktest: () => void;
    onCreateSubscription: () => void;
  };

  return {
    ...actual,
    useScreeningQueryState: () => ({ state: mocks.state, patch: mocks.patch }),
    useLocalPresets: () => ({
      presets: [],
      save: mocks.savePreset,
      remove: mocks.removePreset,
    }),
    ScreeningConfigurationWorkspace: ({
      libraryLoading,
      libraryError,
      error,
      onRetryLibrary,
      onRun,
      onReset,
      onConditionsChange,
    }: ConfigProps) => (
      <section aria-label="筛选配置">
        <span>{libraryLoading ? '因子库加载中' : '因子库已就绪'}</span>
        {libraryError ? <span>库错误：{libraryError}</span> : null}
        {error ? <span>运行错误：{error}</span> : null}
        <button type="button" onClick={onRetryLibrary}>
          重试因子库
        </button>
        <button type="button" onClick={onRun}>
          运行选股
        </button>
        <button type="button" onClick={onReset}>
          重置条件
        </button>
        <button
          type="button"
          onClick={() =>
            onConditionsChange([{ factorName: 'roe', operator: 'between', min: 8, max: 20 }])
          }
        >
          设置有效条件
        </button>
      </section>
    ),
    ScreeningResultsWorkspace: ({
      result,
      page,
      selected,
      actionLog,
      onPageChange,
      onToggleRow,
      onToggleAll,
      onAddToWatchlist,
      onSaveStrategy,
      onQuickBacktest,
      onCreateSubscription,
    }: ResultsProps) => (
      <section aria-label="筛选结果">
        <span>命中：{result?.total ?? 0}</span>
        <span>页码：{page}</span>
        <span>已选：{Array.from(selected).join(',')}</span>
        <span>日志：{actionLog[0]?.message ?? '-'}</span>
        <button type="button" onClick={() => onPageChange(1)}>
          下一页
        </button>
        <button type="button" onClick={() => onToggleRow('000001.SZ')}>
          选择首行
        </button>
        <button type="button" onClick={() => onToggleAll(true)}>
          全选
        </button>
        <button type="button" onClick={onAddToWatchlist}>
          加入自选
        </button>
        <button type="button" onClick={onSaveStrategy}>
          保存策略
        </button>
        <button type="button" onClick={onQuickBacktest}>
          快速回测
        </button>
        <button type="button" onClick={onCreateSubscription}>
          创建订阅
        </button>
      </section>
    ),
    ScreeningPresetDialog: ({
      open,
      onSave,
    }: {
      open: boolean;
      onSave: (name: string) => void;
    }) =>
      open ? (
        <button type="button" onClick={() => onSave('低估值高质量')}>
          保存当前预设
        </button>
      ) : null,
  };
});

const library = {
  categories: [
    {
      category: 'QUALITY' as const,
      label: '质量',
      factors: [
        {
          id: 'roe',
          name: 'roe',
          label: '净资产收益率',
          category: 'QUALITY' as const,
          sourceType: 'FIELD_REF' as const,
          isBuiltin: true,
        },
      ],
    },
  ],
};

const firstPage: FactorScreeningResult = {
  tradeDate: '20260812',
  universe: '000300.SH',
  total: 2,
  page: 1,
  pageSize: 50,
  items: [
    { tsCode: '000001.SZ', name: '平安银行', industry: null, factors: { roe: 12 } },
    { tsCode: '600000.SH', name: '浦发银行', industry: '银行', factors: { roe: null } },
  ],
};

describe('FactorScreeningView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.conditions = [
      { factorName: 'roe', operator: 'between', min: 8, max: 20 },
    ];
    vi.mocked(factorApi.library).mockResolvedValue(library);
    vi.mocked(factorApi.screening).mockResolvedValue(firstPage);
  });

  it('按金融筛选条件构造完整 API Body，并支持分页、选择、自选和订阅交接', async () => {
    const { user } = renderWithProviders(<FactorScreeningView />);

    expect(screen.getByText('因子库加载中')).toBeInTheDocument();
    await screen.findByText('因子库已就绪');

    await user.click(screen.getByRole('button', { name: '运行选股' }));
    await screen.findByText('命中：2');

    expect(factorApi.screening).toHaveBeenCalledWith({
      conditions: [{ factorName: 'roe', operator: 'between', min: 8, max: 20 }],
      tradeDate: '20260812',
      universe: '000300.SH',
      sortBy: 'roe',
      sortOrder: 'desc',
      page: 1,
      pageSize: 50,
      tradeConstraints: mocks.state.tradeConstraints,
      withSummary: true,
      withConditionPassCounts: true,
      withDiagnostics: true,
    });
    expect(screen.getByText('日志：运行选股成功，命中 2 只')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '选择首行' }));
    expect(screen.getByText('已选：000001.SZ')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '加入自选' }));
    expect(screen.getByText('自选目标：000001.SZ')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认加入' }));
    expect(await screen.findByText('已加入自选股 1 只（跳过 1 只）')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '创建订阅' }));
    expect(mocks.saveSubscriptionDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'factor',
        ruleSpec: expect.objectContaining({
          universe: { type: 'FIXED', tsCodes: ['000001.SZ'] },
          conditions: [{ factorId: 'roe', operator: 'BETWEEN', value: [8, 20] }],
          sortBy: 'roe',
          sortOrder: 'DESC',
        }),
      })
    );
    expect(mocks.push).toHaveBeenCalledWith('/stock/subscription/new?source=factor');

    vi.mocked(factorApi.screening).mockResolvedValue({ ...firstPage, page: 2, items: [] });
    await user.click(screen.getByRole('button', { name: '下一页' }));
    await waitFor(() =>
      expect(factorApi.screening).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }))
    );
    expect(await screen.findByText('页码：1')).toBeInTheDocument();
  });

  it('无有效条件时阻止请求；条件修复后展示服务端错误', async () => {
    mocks.state.conditions = [];
    vi.mocked(factorApi.screening).mockRejectedValue(new Error('横截面数据缺失'));
    const { user } = renderWithProviders(<FactorScreeningView />);

    await screen.findByText('因子库已就绪');
    await user.click(screen.getByRole('button', { name: '运行选股' }));
    expect(factorApi.screening).not.toHaveBeenCalled();
    expect(screen.getByText('运行错误：请至少添加一条已完整填写的有效条件')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '设置有效条件' }));
    await user.click(screen.getByRole('button', { name: '运行选股' }));
    expect(await screen.findByText('运行错误：横截面数据缺失')).toBeInTheDocument();
  });

  it('因子库失败可重试，并覆盖预设和未接通动作反馈', async () => {
    vi.mocked(factorApi.library)
      .mockRejectedValueOnce(new Error('library timeout'))
      .mockResolvedValueOnce(library);
    const { user } = renderWithProviders(<FactorScreeningView />);

    expect(await screen.findByText('库错误：library timeout')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重试因子库' }));
    await screen.findByText('因子库已就绪');
    expect(factorApi.library).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole('button', { name: '预设' }));
    await user.click(screen.getByRole('button', { name: '保存当前预设' }));
    expect(mocks.savePreset).toHaveBeenCalledWith(
      '低估值高质量',
      expect.objectContaining({ conditions: mocks.state.conditions })
    );
    expect(await screen.findByText('已保存预设「低估值高质量」')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '保存策略' }));
    expect(await screen.findByText('保存策略需后端 BE-12 字段对齐，已记入待办')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '快速回测' }));
    expect(await screen.findByText('快速回测请前往因子详情页（阶段二未集成）')).toBeInTheDocument();
  });
});
