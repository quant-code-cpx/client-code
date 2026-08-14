/** @vitest-environment jsdom */

import type { ReactNode } from 'react';
import type * as ReactRouterModule from 'react-router';
import type { WalkForwardRunSummary } from 'src/api/backtest';

import { vi } from 'vitest';
import { useLocation } from 'react-router';
import { act, screen, within, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';
import { listWalkForwardRuns, deleteWalkForwardRun } from 'src/api/backtest';

import { WalkForwardListView } from '../view/walk-forward-list-view';

vi.mock('src/api/backtest', () => ({
  listWalkForwardRuns: vi.fn(),
  deleteWalkForwardRun: vi.fn(),
}));
vi.mock('react-router-dom', async () => {
  const router = await vi.importActual<typeof ReactRouterModule>('react-router');
  return { useSearchParams: router.useSearchParams };
});
vi.mock('src/components/iconify', () => ({ Iconify: () => null }));
vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="当前位置">{location.pathname}{location.search}</output>;
}

const runningRow: WalkForwardRunSummary = {
  wfRunId: 'wf-running-12345678',
  name: '因子 WF',
  baseStrategyType: 'FACTOR_RANKING',
  windowMode: 'ANCHORED',
  status: 'RUNNING',
  fullStartDate: '20260102',
  fullEndDate: '20260630',
  oosSharpeRatio: 1.2345,
  oosAnnualizedReturn: 0.12,
  oosMaxDrawdown: -0.08,
  wfe: 0.72,
  robustnessLevel: 'GREEN',
  progress: 35,
  createdAt: '2026-07-01T08:00:00Z',
  completedAt: null,
};

const completedRow: WalkForwardRunSummary = {
  ...runningRow,
  wfRunId: 'wf-done-87654321',
  name: null,
  baseStrategyType: 'MA_CROSS_SINGLE',
  windowMode: null,
  status: 'COMPLETED',
  oosSharpeRatio: null,
  oosAnnualizedReturn: -0.03,
  oosMaxDrawdown: null,
  wfe: null,
  robustnessLevel: null,
  progress: 100,
  completedAt: '2026-07-02T08:00:00Z',
};

function response(items: WalkForwardRunSummary[] = [runningRow, completedRow]) {
  return {
    page: 2,
    pageSize: 10,
    total: 25,
    items,
    aggregates: {
      total: 25,
      running: 1,
      avgOosSharpe: 1.23,
      lastCompletedAt: '2026-07-02T08:00:00Z',
    },
  };
}

describe('WalkForwardListView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listWalkForwardRuns).mockResolvedValue(response());
    vi.mocked(deleteWalkForwardRun).mockResolvedValue({ wfRunId: runningRow.wfRunId });
  });

  it('从 URL 解析筛选与分页 Body，表格列语义对齐且紧凑日期已格式化', async () => {
    const timerToken = {} as NodeJS.Timeout;
    const setIntervalSpy = vi
      .spyOn(window, 'setInterval')
      .mockImplementation(() => timerToken);
    const { user } = renderWithProviders(
      <>
        <WalkForwardListView />
        <LocationProbe />
      </>,
      {
        initialEntries: [
          '/backtest/walk-forward?q=alpha&statuses=RUNNING,FAILED&strategyTypes=FACTOR_RANKING&page=2&pageSize=10&sortBy=oosSharpeRatio&sortDir=asc',
        ],
      }
    );

    expect(await screen.findByText('因子 WF')).toBeInTheDocument();
    expect(listWalkForwardRuns).toHaveBeenNthCalledWith(1, {
      page: 2,
      pageSize: 10,
      q: 'alpha',
      statuses: ['RUNNING', 'FAILED'],
      strategyTypes: ['FACTOR_RANKING'],
      sortBy: 'oosSharpeRatio',
      sortDir: 'asc',
    });
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 10000);
    expect(screen.getByText('平均 OOS 夏普').nextElementSibling).toHaveTextContent('1.23');
    expect(screen.getByText('最近完成').nextElementSibling).toHaveTextContent('2026-07-02');

    const row = screen.getByRole('link', { name: '查看 Walk-Forward 任务：因子 WF' });
    const cells = within(row).getAllByRole('cell');
    expect(cells[1]).toHaveTextContent('因子排序');
    expect(cells[2]).toHaveTextContent('2026-01-02 ~ 2026-06-30');
    expect(cells[3]).toHaveTextContent('ANCHORED');
    expect(row).not.toHaveTextContent('20260102');
    expect(within(row).getByText('+12.00%')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);

    await user.click(row);
    expect(screen.getByRole('status', { name: '当前位置' })).toHaveTextContent(
      '/backtest/walk-forward/wf-running-12345678'
    );
    setIntervalSpy.mockRestore();
  });

  it('筛选、排序、重置、分页和新建入口都同步 URL 并重新请求', async () => {
    const { user } = renderWithProviders(
      <>
        <WalkForwardListView />
        <LocationProbe />
      </>,
      { initialEntries: ['/backtest/walk-forward?page=1&pageSize=10'] }
    );
    expect(await screen.findByText('因子 WF')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: '搜索任务' }), '  beta  ');
    await waitFor(() =>
      expect(listWalkForwardRuns).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, pageSize: 10, q: 'beta' })
      )
    );
    await user.click(screen.getByRole('button', { name: '降序' }));
    await waitFor(() =>
      expect(listWalkForwardRuns).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortDir: 'asc' })
      )
    );
    await user.click(screen.getByRole('button', { name: /next page/i }));
    await waitFor(() =>
      expect(listWalkForwardRuns).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, pageSize: 10 })
      )
    );
    await user.click(screen.getByRole('button', { name: '重置' }));
    await waitFor(() =>
      expect(screen.getByRole('status', { name: '当前位置' })).toHaveTextContent(
        '?page=1&pageSize=10'
      )
    );
    await user.click(screen.getByRole('button', { name: '新建 WF 任务' }));
    expect(screen.getByRole('status', { name: '当前位置' })).toHaveTextContent(
      '/backtest/walk-forward/create'
    );
  });

  it('删除要求确认，成功刷新；失败与非 Error 均展示可关闭原因', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValue(true);
    const { user } = renderWithProviders(<WalkForwardListView />);
    expect(await screen.findByText('因子 WF')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '更多操作：因子 WF' }));
    await user.click(screen.getByRole('menuitem', { name: '删除任务' }));
    expect(deleteWalkForwardRun).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '更多操作：因子 WF' }));
    await user.click(screen.getByRole('menuitem', { name: '删除任务' }));
    await waitFor(() => expect(deleteWalkForwardRun).toHaveBeenCalledWith(runningRow.wfRunId));
    await waitFor(() => expect(listWalkForwardRuns).toHaveBeenCalledTimes(2));

    vi.mocked(deleteWalkForwardRun).mockRejectedValueOnce(new Error('运行中任务不可删除'));
    await user.click(screen.getByRole('button', { name: '更多操作：因子 WF' }));
    await user.click(screen.getByRole('menuitem', { name: '删除任务' }));
    expect(await screen.findByText('运行中任务不可删除')).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it('覆盖 loading、empty、Error 与非 Error 列表失败', async () => {
    let resolveRuns: (value: ReturnType<typeof response>) => void = () => undefined;
    vi.mocked(listWalkForwardRuns).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRuns = resolve;
        })
    );
    const first = renderWithProviders(<WalkForwardListView />);
    expect(document.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(10);
    resolveRuns(response([]));
    expect(await screen.findByText('暂无 Walk-Forward 任务')).toBeInTheDocument();
    first.unmount();

    vi.mocked(listWalkForwardRuns).mockRejectedValueOnce(new Error('WF 服务不可用'));
    const second = renderWithProviders(<WalkForwardListView />);
    expect(await screen.findByText('WF 服务不可用')).toBeInTheDocument();
    second.unmount();

    vi.mocked(listWalkForwardRuns).mockRejectedValueOnce('offline');
    renderWithProviders(<WalkForwardListView />);
    expect(await screen.findByText('加载 Walk-Forward 列表失败')).toBeInTheDocument();
  });

  it('存在活跃任务时 10 秒静默轮询，卸载时清理 interval', async () => {
    let tick: (() => void) | undefined;
    const timerToken = {} as NodeJS.Timeout;
    const setIntervalSpy = vi.spyOn(window, 'setInterval').mockImplementation((handler) => {
      tick = handler as () => void;
      return timerToken;
    });
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval').mockImplementation(() => undefined);
    const view = renderWithProviders(<WalkForwardListView />);
    expect(await screen.findByText('因子 WF')).toBeInTheDocument();
    expect(tick).toBeTypeOf('function');

    await act(async () => tick?.());
    await waitFor(() => expect(listWalkForwardRuns).toHaveBeenCalledTimes(2));
    view.unmount();
    expect(clearIntervalSpy).toHaveBeenCalledWith(timerToken);
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });
});
