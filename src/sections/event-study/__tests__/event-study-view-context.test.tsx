/** @vitest-environment jsdom */

import type { EventTypeItem } from 'src/api/event-study';

import { vi } from 'vitest';
import { screen } from '@testing-library/react';

import { getEventTypes } from 'src/api/event-study';
import { renderWithProviders } from 'src/test/test-utils';

import { EventStudyView } from '../view/event-study-view';
import { useEventStudy, EventStudyProvider } from '../context/event-study-context';

vi.mock('src/api/event-study', () => ({
  getEventTypes: vi.fn(),
}));

vi.mock('../overview-tab', () => ({ OverviewTab: () => <div>概览模块</div> }));
vi.mock('../event-query-tab', () => ({
  EventQueryTab: ({ eventTypes }: { eventTypes: EventTypeItem[] }) => (
    <div>查询模块：{eventTypes.length}</div>
  ),
}));
vi.mock('../event-analysis-tab', () => ({
  EventAnalysisTab: ({ eventTypes }: { eventTypes: EventTypeItem[] }) => (
    <div>分析模块：{eventTypes.length}</div>
  ),
}));
vi.mock('../signal-rules-tab', () => ({
  SignalRulesTab: ({ eventTypes }: { eventTypes: EventTypeItem[] }) => (
    <div>规则模块：{eventTypes.length}</div>
  ),
}));
vi.mock('../signal-history-tab', () => ({ SignalHistoryTab: () => <div>历史模块</div> }));

const eventTypes: EventTypeItem[] = [
  { type: 'FORECAST', label: '业绩预告', description: '业绩变化预告' },
  { type: 'REPURCHASE', label: '股票回购', description: '回购公告' },
];

function ContextConsumer() {
  const ctx = useEventStudy();
  return (
    <section>
      <div>类型数量：{ctx.eventTypes.length}</div>
      <div>当前类型：{ctx.selectedEventType || '未选'}</div>
      <div>日期：{ctx.startDate ?? '-'}~{ctx.endDate ?? '-'}</div>
      <button type="button" onClick={() => ctx.setSelectedEventType('FORECAST')}>
        选择预告
      </button>
      <button
        type="button"
        onClick={() => ctx.setDateRange({ startDate: '20260801', endDate: '20260813' })}
      >
        设置日期
      </button>
      <button
        type="button"
        onClick={() => ctx.setDateRange({ startDate: null, endDate: null })}
      >
        清空日期
      </button>
    </section>
  );
}

describe('EventStudyProvider', () => {
  it('共享事件类型、选择与紧凑交易日区间，并允许显式清空', async () => {
    const { user } = renderWithProviders(
      <EventStudyProvider eventTypes={eventTypes}>
        <ContextConsumer />
      </EventStudyProvider>
    );

    expect(screen.getByText('类型数量：2')).toBeInTheDocument();
    expect(screen.getByText('当前类型：未选')).toBeInTheDocument();
    expect(screen.getByText('日期：-~-')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '选择预告' }));
    expect(screen.getByText('当前类型：FORECAST')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '设置日期' }));
    expect(screen.getByText('日期：20260801~20260813')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '清空日期' }));
    expect(screen.getByText('日期：-~-')).toBeInTheDocument();
  });

  it('provider 外使用时快速失败，避免静默读取伪状态', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderWithProviders(<ContextConsumer />)).toThrow(
      'useEventStudy must be used inside EventStudyProvider'
    );
    consoleError.mockRestore();
  });
});

describe('EventStudyView', () => {
  beforeEach(() => vi.clearAllMocks());

  it('事件类型加载期间保留骨架，成功后将同一契约传给各业务页签', async () => {
    let resolveTypes: (items: EventTypeItem[]) => void = () => undefined;
    vi.mocked(getEventTypes).mockImplementation(
      () =>
        new Promise<EventTypeItem[]>((resolve) => {
          resolveTypes = resolve;
        })
    );
    const { user } = renderWithProviders(<EventStudyView />);

    expect(screen.getByRole('heading', { name: '事件驱动研究' })).toBeInTheDocument();
    expect(document.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
    expect(screen.getByText('概览模块')).toBeInTheDocument();

    resolveTypes(eventTypes);
    expect(await screen.findByRole('tab', { name: '概览' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(getEventTypes).toHaveBeenCalledWith();

    await user.click(screen.getByRole('tab', { name: '事件查询' }));
    expect(screen.getByText('查询模块：2')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: '事件分析' }));
    expect(screen.getByText('分析模块：2')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: '信号规则' }));
    expect(screen.getByText('规则模块：2')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: '信号历史' }));
    expect(screen.getByText('历史模块')).toBeInTheDocument();
  });

  it('API Error 原样展示；失败后仍以空类型契约提供可用页签', async () => {
    vi.mocked(getEventTypes).mockRejectedValue(new Error('事件类型服务不可用'));
    const { user } = renderWithProviders(<EventStudyView />);

    expect(await screen.findByText('事件类型服务不可用')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '概览' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: '事件查询' }));
    expect(screen.getByText('查询模块：0')).toBeInTheDocument();
  });

  it('null 响应与非 Error 异常分别使用空列表和通用错误兜底', async () => {
    vi.mocked(getEventTypes).mockResolvedValueOnce(null as unknown as EventTypeItem[]);
    const first = renderWithProviders(<EventStudyView />);
    expect(await screen.findByRole('tab', { name: '概览' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    first.unmount();

    vi.mocked(getEventTypes).mockRejectedValueOnce('offline');
    renderWithProviders(<EventStudyView />);
    expect(await screen.findByText('加载事件类型失败')).toBeInTheDocument();
  });
});
