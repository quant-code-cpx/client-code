import type { ReactNode } from 'react';
import type * as EventStudyApi from 'src/api/event-study';

import dayjs from 'dayjs';
import { act, screen, within, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';
import { queryEvents, querySignals, listSignalRules } from 'src/api/event-study';

import { EventQueryTab } from '../event-query-tab';
import { SignalHistoryTab } from '../signal-history-tab';

vi.mock('src/api/event-study', async (importOriginal) => {
  const actual = await importOriginal<typeof EventStudyApi>();
  return {
    ...actual,
    queryEvents: vi.fn(),
    querySignals: vi.fn(),
    listSignalRules: vi.fn(),
  };
});

vi.mock('src/components/iconify', () => ({
  Iconify: ({ icon }: { icon: string }) => <span data-icon={icon} />,
}));

vi.mock('src/components/date-picker', () => ({
  DatePicker: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: { format: (pattern: string) => string } | null;
    onChange: (value: ReturnType<typeof dayjs>) => void;
  }) => (
    <button type="button" aria-label={label} onClick={() => onChange(dayjs('2026-08-01'))}>
      {value?.format('YYYY-MM-DD') ?? '未选'}
    </button>
  ),
}));

vi.mock('src/components/stock-search-autocomplete', () => ({
  StockSearchAutocomplete: ({
    label,
    onChange,
  }: {
    label: string;
    onChange: (item: unknown) => void;
  }) => (
    <button
      type="button"
      aria-label={label}
      onClick={() =>
        onChange({
          tsCode: '000001.SZ',
          symbol: '000001',
          name: '平安银行',
          market: null,
          industry: null,
          listStatus: null,
        })
      }
    >
      选择平安银行
    </button>
  ),
}));

vi.mock('../_shared/event-detail-drawer', () => ({
  EventDetailDrawer: ({
    open,
    detail,
    onClose,
  }: {
    open: boolean;
    detail: Record<string, unknown> | null;
    onClose: () => void;
  }) => (
    <section>
      事件抽屉:{open ? String(detail?.tsCode) : 'closed'}
      {open ? (
        <button type="button" onClick={onClose}>
          关闭事件抽屉
        </button>
      ) : null}
    </section>
  ),
}));

vi.mock('src/components/label', () => ({
  Label: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

const eventTypes: EventStudyApi.EventTypeItem[] = [
  { type: 'FORECAST', label: '业绩预告', description: '业绩事件' },
  { type: 'REPURCHASE', label: '股票回购', description: '回购事件' },
];

const rule: EventStudyApi.SignalRule = {
  id: 7,
  userId: 1,
  name: '高增长预告',
  description: null,
  eventType: 'FORECAST',
  conditions: {},
  signalType: 'BUY',
  status: 'ACTIVE',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const signal: EventStudyApi.SignalHistoryItem = {
  id: 18,
  ruleId: 7,
  tsCode: '000001.SZ',
  stockName: '平安银行',
  eventDate: '20260812',
  signalType: 'BUY',
  eventDetail: { profitMin: 1000, note: null },
  triggeredAt: '2026-08-12T08:30:00.000Z',
  rule: { name: '高增长预告', eventType: 'FORECAST' },
};

describe('事件查询与信号历史工作流', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(queryEvents).mockResolvedValue({
      total: 1,
      items: [
        {
          tsCode: '000001.SZ',
          name: '平安银行',
          annDate: '20260812',
          endDate: '20260630',
          type: null,
          pChangeMin: 20,
          pChangeMax: 30,
          summary: '',
        },
      ],
    });
    vi.mocked(listSignalRules).mockResolvedValue({ items: [rule], total: 1, page: 1, pageSize: 200 });
    vi.mocked(querySignals).mockResolvedValue({ items: [signal], total: 1, page: 1, pageSize: 50 });
  });

  it('事件查询提交完整 Body、格式化紧凑日期，并支持键盘详情', async () => {
    const { user } = renderWithProviders(<EventQueryTab eventTypes={eventTypes} />);

    expect(screen.getByRole('button', { name: '查询' })).toBeDisabled();
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: '业绩预告' }));
    await user.click(screen.getByRole('button', { name: '股票代码' }));

    const combos = screen.getAllByRole('combobox');
    await user.click(combos[1]);
    await user.click(screen.getByRole('option', { name: '银行' }));
    await user.click(combos[2]);
    await user.click(screen.getByRole('option', { name: /中盘/ }));
    await user.click(screen.getByRole('button', { name: '开始日期' }));
    await user.click(screen.getByRole('button', { name: '结束日期' }));
    await user.click(screen.getByRole('button', { name: '查询' }));

    expect(await screen.findByText('2026-08-12')).toBeInTheDocument();
    expect(screen.getByText('2026-06-30')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(2);
    expect(queryEvents).toHaveBeenCalledWith({
      eventType: 'FORECAST',
      tsCode: '000001.SZ',
      industry: '银行',
      marketCapBucket: 'mid',
      startDate: '20260801',
      endDate: '20260801',
      page: 1,
      pageSize: 50,
    });

    const row = screen.getByRole('button', { name: '查看第 1 条事件详情' });
    row.focus();
    await user.keyboard(' ');
    expect(screen.getByText('事件抽屉:000001.SZ')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '关闭事件抽屉' }));
    expect(screen.getByText('事件抽屉:closed')).toBeInTheDocument();

    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: '股票回购' }));
    expect(screen.queryByRole('button', { name: '查看第 1 条事件详情' })).not.toBeInTheDocument();
  });

  it('事件查询区分 loading、empty 和真实错误，并以分页页码重新请求', async () => {
    let resolve!: (value: EventStudyApi.EventsQueryResult) => void;
    vi.mocked(queryEvents).mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
    const { user, container } = renderWithProviders(<EventQueryTab eventTypes={eventTypes} />);
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: '业绩预告' }));
    await user.click(screen.getByRole('button', { name: '查询' }));
    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
    await act(async () => resolve({ total: 0, items: [] }));
    expect(await screen.findByText('暂无匹配的事件记录')).toBeInTheDocument();

    vi.mocked(queryEvents).mockRejectedValueOnce(new Error('事件仓库不可用'));
    await user.click(screen.getByRole('button', { name: '查询' }));
    expect(await screen.findByText('事件仓库不可用')).toBeInTheDocument();

    vi.mocked(queryEvents).mockResolvedValueOnce({ total: 51, items: [{ tsCode: '000001.SZ' }] });
    await user.click(screen.getByRole('button', { name: '查询' }));
    const next = await screen.findByRole('button', { name: 'Go to next page' });
    await user.click(next);
    expect(queryEvents).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, pageSize: 50 }));
  });

  it('信号历史首屏加载、筛选查询、日期格式化和详情展开均正确', async () => {
    const { user } = renderWithProviders(<SignalHistoryTab />);

    expect(await screen.findByText('高增长预告')).toBeInTheDocument();
    expect(screen.getByText('2026-08-12')).toBeInTheDocument();
    expect(screen.getByText('买入')).toBeInTheDocument();
    expect(listSignalRules).toHaveBeenCalledWith({ page: 1, pageSize: 200 });
    expect(querySignals).toHaveBeenCalledWith({
      page: 1,
      pageSize: 50,
      tsCode: undefined,
      ruleId: undefined,
      signalType: undefined,
      startDate: undefined,
      endDate: undefined,
    });

    await user.click(screen.getByRole('button', { name: '股票代码' }));
    const combos = screen.getAllByRole('combobox');
    await user.click(combos[0]);
    await user.click(screen.getByRole('option', { name: '高增长预告' }));
    await user.click(combos[1]);
    await user.click(screen.getByRole('option', { name: '卖出' }));
    await user.click(screen.getByRole('button', { name: '开始日期' }));
    await user.click(screen.getByRole('button', { name: '结束日期' }));
    await user.click(screen.getByRole('button', { name: '查询' }));
    expect(querySignals).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 50,
      tsCode: '000001.SZ',
      ruleId: 7,
      signalType: 'SELL',
      startDate: '20260801',
      endDate: '20260801',
    });

    await user.click(screen.getByRole('button', { name: '展开行' }));
    expect(screen.getByText(/"profitMin": 1000/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '展开行' }));
    await waitFor(() =>
      expect(within(screen.getByText('事件详情').parentElement!).getByText(/profitMin/)).not.toBeVisible()
    );
  });

  it('信号历史规则列表失败静默降级，查询错误可见，空结果不伪造数据', async () => {
    vi.mocked(listSignalRules).mockRejectedValueOnce(new Error('规则下拉失败'));
    vi.mocked(querySignals).mockRejectedValueOnce('unknown');
    renderWithProviders(<SignalHistoryTab />);

    expect(await screen.findByText('查询失败')).toBeInTheDocument();
    expect(screen.queryByText('规则下拉失败')).not.toBeInTheDocument();

    vi.mocked(querySignals).mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 50 });
    // 重新挂载用于验证空态，避免把前一次错误状态当成功结果。
    const { unmount } = renderWithProviders(<SignalHistoryTab />);
    expect(await screen.findByText('暂无信号历史')).toBeInTheDocument();
    unmount();
  });
});
