import type { PrecomputeStatusItem } from 'src/api/factor';

import { useState } from 'react';
import { screen, within, waitFor } from '@testing-library/react';

import { apiClient } from 'src/api/client';
import { renderWithProviders } from 'src/test/test-utils';

import { FactorAdminKpiRow } from '../factor-admin-kpi-row';
import { FactorAdminJobsTable } from '../factor-admin-jobs-table';
import { FactorAdminAuditTable } from '../factor-admin-audit-table';
import { FactorAdminStatusTable } from '../factor-admin-status-table';
import { formatBackfillSuccess } from '../factor-admin-backfill-form';
import { FactorAdminSchedulePanel } from '../factor-admin-schedule-panel';
import { FactorAdminBulkActionBar } from '../factor-admin-bulk-action-bar';
import {
  applyAdminFilters,
  FactorAdminFilterBar,
  DEFAULT_ADMIN_FILTERS,
} from '../factor-admin-filter-bar';
import {
  FactorAdminView,
  FactorAdminAccessDenied,
  formatPrecomputeSuccess,
} from '../../view/factor-admin-view';

vi.mock('src/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

vi.mock('src/components/date-picker', () => ({
  DatePicker: ({ label, disabled }: { label: string; disabled?: boolean }) => (
    <input aria-label={label} disabled={disabled} />
  ),
}));

const buildItems = (count: number): PrecomputeStatusItem[] =>
  Array.from({ length: count }, (_, index) => {
    const value = index + 1;
    return {
      factorName: `factor_${String(value).padStart(2, '0')}`,
      factorLabel: `因子 ${value}`,
      lastComputeDate: `202607${String(Math.min(value, 31)).padStart(2, '0')}`,
      rowCount: value * 10,
      status: value % 2 === 0 ? 'UP_TO_DATE' : 'STALE',
      staleDays: value,
      coverageRate: null,
    };
  });

function StatusTableHarness({ items }: { items: PrecomputeStatusItem[] }) {
  const [selected, setSelected] = useState<PrecomputeStatusItem[]>([]);
  return (
    <>
      <span data-testid="selected-count">{selected.length}</span>
      <FactorAdminStatusTable
        items={items}
        loading={false}
        error=""
        filters={DEFAULT_ADMIN_FILTERS}
        selected={selected}
        onSelectedChange={setSelected}
        onRefetch={() => {}}
      />
    </>
  );
}

describe('factor admin v3 hard gates', () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it('F-BUG-02 and navigation gate: status loads once and all five tabs remain', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ latestTradeDate: '20260807', byFactor: [] });
    const { unmount } = renderWithProviders(<FactorAdminView />, {
      initialEntries: ['/factor/admin?tab=status'],
    });

    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      '状态总览',
      '任务历史',
      '历史回补',
      '调度配置',
      '审计日志',
    ]);
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledTimes(1);
    });
    unmount();
  });

  it('renders an access message without calling admin APIs for unauthorized users', () => {
    renderWithProviders(<FactorAdminAccessDenied />);

    expect(screen.getByText('只有管理员可以访问因子管理控制台。')).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('keeps exactly four KPI entries', () => {
    renderWithProviders(<FactorAdminKpiRow items={buildItems(3)} />);

    expect(screen.getByText('因子总数')).toBeInTheDocument();
    expect(screen.getByText('最新')).toBeInTheDocument();
    expect(screen.getByText('滞后')).toBeInTheDocument();
    expect(screen.getByText('失败')).toBeInTheDocument();
  });

  it('F-BUG-05 and status gate: category/source stay disabled while five statuses remain multi-select', async () => {
    const onChange = vi.fn();
    const { user } = renderWithProviders(
      <FactorAdminFilterBar filters={DEFAULT_ADMIN_FILTERS} onChange={onChange} />
    );

    expect(screen.getByLabelText('分类')).toBeDisabled();
    expect(screen.getByLabelText('来源')).toBeDisabled();
    expect(screen.getByText('分类/来源能力待接入')).toBeInTheDocument();

    for (const label of ['最新', '滞后', '失败', '未计算', '进行中']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    await user.click(screen.getByText('最新'));
    await user.click(screen.getByText('滞后'));
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('F-BUG-05: unavailable category/source values never filter real rows', () => {
    const items = buildItems(2);
    const result = applyAdminFilters(items, {
      ...DEFAULT_ADMIN_FILTERS,
      categories: ['VALUATION'],
      sources: ['FIELD_REF'],
    });

    expect(result).toEqual(items);
  });

  it('F-BUG-01 and table gate: renders 12 columns, five sort keys and corrected rowCount label', async () => {
    const { user } = renderWithProviders(<StatusTableHarness items={buildItems(3)} />);

    expect(screen.getAllByRole('columnheader')).toHaveLength(12);
    expect(screen.getByText('覆盖交易日数')).toBeInTheDocument();
    for (const label of ['因子标识', '滞后天数', '最新计算日', '覆盖度', '覆盖交易日数']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }

    const rows = screen.getAllByRole('row');
    expect(within(rows[1]).getByText('factor_03')).toBeInTheDocument();

    await user.click(screen.getByRole('combobox'));
    expect(await screen.findByRole('option', { name: '25' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '50' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '100' })).toBeInTheDocument();
  });

  it('selection gate: preserves selected factors across pages', async () => {
    const { user } = renderWithProviders(<StatusTableHarness items={buildItems(26)} />);

    await user.click(screen.getByLabelText('选择当前页因子'));
    expect(screen.getByTestId('selected-count')).toHaveTextContent('25');

    await user.click(screen.getByRole('button', { name: /next page/i }));
    await user.click(screen.getByLabelText('选择 factor_01'));
    expect(screen.getByTestId('selected-count')).toHaveTextContent('26');
  });

  it('F-BUG-04 and action gate: keeps all bulk actions but disables enable/disable', () => {
    const item = buildItems(1)[0];
    renderWithProviders(
      <FactorAdminBulkActionBar
        selected={[item]}
        onPrecompute={() => {}}
        onBackfill={() => {}}
        onCopyNames={() => {}}
        onClearSelection={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: '对选中因子触发预计算' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '跳至回补 Tab 并注入选中因子' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '启用' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '禁用' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '复制因子标识到剪贴板' })).toBeEnabled();
    expect(screen.getByText('取消选择')).toBeInTheDocument();
  });

  it('F-BUG-03/F-BUG-08: task history has no fake polling hint and disables unsupported filters', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 20 });
    renderWithProviders(<FactorAdminJobsTable />);

    await waitFor(() => expect(screen.getByText('暂无批次记录')).toBeInTheDocument());
    expect(screen.queryByText(/5s 轮询/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('combobox')).toHaveLength(2);
    expect(screen.getAllByRole('combobox')[0]).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getAllByRole('combobox')[1]).toHaveAttribute('aria-disabled', 'true');
    expect(apiClient.post).toHaveBeenCalledWith('/api/factor/admin/jobs', {
      page: 1,
      pageSize: 20,
    });
  });

  it('F-BUG-10: synchronous precompute/backfill feedback uses real statistics only', () => {
    const precomputeMessage = formatPrecomputeSuccess({
      tradeDate: '20260807',
      factorsProcessed: 8,
      factorsFailed: 1,
      totalRows: 1234,
    });
    const backfillMessage = formatBackfillSuccess({
      startDate: '20260803',
      endDate: '20260807',
      datesProcessed: 5,
      datesSkipped: 1,
      totalRows: 5678,
      elapsedMs: 1200,
    });

    expect(precomputeMessage).toContain('成功 8，失败 1，写入 1,234 行');
    expect(backfillMessage).toContain('处理 5 个交易日，跳过 1 个，写入 5,678 行');
    expect(`${precomputeMessage}${backfillMessage}`).not.toMatch(/Job|任务 ID|排队|进度/);
  });

  it('F-BUG-11: schedule and audit placeholders never manufacture business data', () => {
    renderWithProviders(
      <>
        <FactorAdminSchedulePanel />
        <FactorAdminAuditTable />
      </>
    );

    expect(screen.getByText('调度接口当前为占位能力，暂不提供真实配置数据。')).toBeInTheDocument();
    expect(screen.getByText('审计日志接口当前为占位能力，筛选与刷新暂不可用。')).toBeInTheDocument();
    expect(screen.getByText('暂无可用审计记录')).toBeInTheDocument();
  });
});
