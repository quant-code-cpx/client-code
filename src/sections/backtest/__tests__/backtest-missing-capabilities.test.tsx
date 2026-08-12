import type { PropsWithChildren } from 'react';
import type { WalkForwardWindow, ComparisonListItem } from 'src/api/backtest';

import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { ComparisonListCard } from '../comparison-list-card';
import { BacktestDraftDrawer } from '../backtest-draft-drawer';
import { WalkForwardWindowDrawer } from '../walk-forward-window-drawer';

vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));

const windowItem: WalkForwardWindow = {
  windowIndex: 0,
  isStartDate: '20250101',
  isEndDate: '20250630',
  oosStartDate: '20250701',
  oosEndDate: '20250731',
  optimizedParams: { lookback: 20 },
  isReturn: 0.12,
  isSharpe: 1.1,
  oosReturn: 0.03,
  oosSharpe: 0.8,
  oosMaxDrawdown: -0.04,
  oosTrades: 8,
};

const comparisonItem: ComparisonListItem = {
  groupId: 'cmp-1',
  name: '动量策略对比',
  status: 'RUNNING',
  strategyCount: 2,
  startDate: '20250101',
  endDate: '20251231',
  benchmarkTsCode: '000300.SH',
  createdAt: '2026-08-10T00:00:00.000Z',
};

describe('backtest unavailable capability degradation', () => {
  it('uses existing window summary without probing unsupported drill-down endpoints', () => {
    renderWithProviders(<WalkForwardWindowDrawer open windowItem={windowItem} onClose={vi.fn()} />);

    expect(
      screen.getByText(
        '窗口级净值、成交明细、持仓快照与调仓日志能力尚未开放；以下仅展示任务详情已返回的窗口汇总。'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('+3.00%')).toBeInTheDocument();
    expect(screen.getAllByText('未开放')).toHaveLength(3);
  });

  it('keeps comparison viewing available while missing mutations stay disabled', async () => {
    const { user } = renderWithProviders(
      <ComparisonListCard item={comparisonItem} onView={vi.fn()} />
    );

    await user.click(screen.getByRole('button', { name: '对比任务操作' }));

    expect(screen.getByRole('menuitem', { name: '复制配置（未开放）' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    expect(screen.getByRole('menuitem', { name: '取消任务（未开放）' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    expect(screen.getByRole('menuitem', { name: '删除任务（未开放）' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('loads only the local auto-saved draft and disables server draft mutations', async () => {
    const onLoadDraft = vi.fn();
    const { user } = renderWithProviders(
      <BacktestDraftDrawer
        open
        onClose={vi.fn()}
        autoSavedDraft={{
          id: 'auto-save',
          name: '上次编辑（自动保存）',
          config: { strategyType: 'FACTOR_RANKING', initialCapital: 1000000 },
          createdAt: '2026-08-10T00:00:00.000Z',
          updatedAt: '2026-08-10T00:00:00.000Z',
          isAutoSave: true,
        }}
        onLoadDraft={onLoadDraft}
      />
    );

    expect(
      screen.getByText('服务端命名草稿能力尚未开放；当前仅保留本机自动草稿。')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存当前为新草稿（未开放）' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '加载到工作台' }));
    expect(onLoadDraft).toHaveBeenCalledWith({ initialCapital: 1000000 }, 'FACTOR_RANKING');
  });
});
