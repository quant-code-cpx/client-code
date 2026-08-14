/** @vitest-environment jsdom */

import type { SignalRule, EventTypeItem } from 'src/api/event-study';

import { vi } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';
import { createAuthenticatedContext } from 'src/test/factories/auth-context';
import {
  getScanJob,
  listSignalRules,
  scanSignalsAsync,
  deleteSignalRule,
  updateSignalRule,
} from 'src/api/event-study';

import { SignalRulesTab } from '../signal-rules-tab';

vi.mock('src/api/event-study', () => ({
  getScanJob: vi.fn(),
  listSignalRules: vi.fn(),
  scanSignalsAsync: vi.fn(),
  deleteSignalRule: vi.fn(),
  updateSignalRule: vi.fn(),
}));

vi.mock('../signal-rule-wizard-dialog', () => ({
  SignalRuleWizardDialog: ({
    open,
    onClose,
    onSaved,
    editingRule,
  }: {
    open: boolean;
    onClose: () => void;
    onSaved: () => void;
    editingRule: SignalRule | null;
  }) =>
    open ? (
      <section role="dialog" aria-label="规则向导">
        <span>{editingRule ? `编辑向导：${editingRule.name}` : '创建向导'}</span>
        <button type="button" onClick={onSaved}>
          模拟保存
        </button>
        <button type="button" onClick={onClose}>
          关闭向导
        </button>
      </section>
    ) : null,
}));

vi.mock('../_shared/progress-snackbar', () => ({
  ProgressSnackbar: ({
    open,
    onClose,
    title,
    message,
    progress,
    indeterminate,
  }: {
    open: boolean;
    onClose: () => void;
    title: string;
    message?: string;
    progress?: number;
    indeterminate?: boolean;
  }) =>
    open ? (
      <aside aria-label="扫描状态">
        <span>{title}</span>
        <span>{message}</span>
        <span>进度：{progress}</span>
        <span>{indeterminate ? '不确定进度' : '确定进度'}</span>
        <button type="button" onClick={onClose}>
          关闭扫描提示
        </button>
      </aside>
    ) : null,
}));

const eventTypes: EventTypeItem[] = [
  { type: 'FORECAST', label: '业绩预告', description: '业绩预告' },
];

const activeRule: SignalRule = {
  id: 7,
  userId: 1,
  name: '增长规则',
  description: '利润增长超过阈值',
  eventType: 'FORECAST',
  conditions: { pChangeMin: { gte: 20 } },
  signalType: 'BUY',
  status: 'ACTIVE',
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-12T00:00:00Z',
};

const pausedRule: SignalRule = {
  ...activeRule,
  id: 8,
  name: '自定义事件规则',
  description: null,
  eventType: 'CUSTOM_EVENT',
  signalType: 'SELL',
  status: 'PAUSED',
};

function listResult(items: SignalRule[] = [activeRule, pausedRule]) {
  return { items, total: 45, page: 1, pageSize: 20 };
}

function renderRules(role: 'USER' | 'SUPER_ADMIN' = 'USER') {
  return renderWithProviders(<SignalRulesTab eventTypes={eventTypes} />, {
    authContext: createAuthenticatedContext({ role }),
  });
}

describe('SignalRulesTab workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listSignalRules).mockResolvedValue(listResult());
    vi.mocked(updateSignalRule).mockResolvedValue(activeRule);
    vi.mocked(deleteSignalRule).mockResolvedValue(activeRule);
  });

  it('分页 Body 从 1 开始，展示后端/未知枚举，并正确打开创建与编辑向导', async () => {
    const { user } = renderRules();

    expect(await screen.findByText('增长规则')).toBeInTheDocument();
    expect(listSignalRules).toHaveBeenNthCalledWith(1, { page: 1, pageSize: 20 });
    expect(screen.getByText('利润增长超过阈值')).toBeInTheDocument();
    expect(screen.getByText('业绩预告')).toBeInTheDocument();
    expect(screen.getByText('CUSTOM_EVENT')).toBeInTheDocument();
    expect(screen.getByText('买入')).toBeInTheDocument();
    expect(screen.getByText('卖出')).toBeInTheDocument();
    expect(screen.getByText('活跃')).toBeInTheDocument();
    expect(screen.getByText('已暂停')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '创建信号规则' }));
    expect(screen.getByRole('dialog', { name: '规则向导' })).toHaveTextContent('创建向导');
    await user.click(screen.getByRole('button', { name: '模拟保存' }));
    await waitFor(() => expect(listSignalRules).toHaveBeenCalledTimes(2));
    await user.click(screen.getByRole('button', { name: '关闭向导' }));

    await user.click(screen.getAllByRole('button', { name: '编辑' })[0]);
    expect(screen.getByRole('dialog', { name: '规则向导' })).toHaveTextContent(
      '编辑向导：增长规则'
    );
    await user.click(screen.getByRole('button', { name: '关闭向导' }));

    await user.click(screen.getByRole('button', { name: /next page/i }));
    await waitFor(() =>
      expect(listSignalRules).toHaveBeenLastCalledWith({ page: 2, pageSize: 20 })
    );
    await user.click(screen.getByRole('combobox', { name: '每页行数' }));
    await user.click(screen.getByRole('option', { name: '50' }));
    await waitFor(() =>
      expect(listSignalRules).toHaveBeenLastCalledWith({ page: 1, pageSize: 50 })
    );
  });

  it('启停状态按当前行反转并刷新列表；API 错误保留可诊断信息', async () => {
    const { user } = renderRules();
    expect(await screen.findByText('增长规则')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '暂停' }));
    await waitFor(() =>
      expect(updateSignalRule).toHaveBeenCalledWith(7, { status: 'PAUSED' })
    );
    await waitFor(() => expect(listSignalRules).toHaveBeenCalledTimes(2));

    vi.mocked(updateSignalRule).mockRejectedValueOnce(new Error('规则状态冲突'));
    await user.click(screen.getByRole('button', { name: '启用' }));
    expect(await screen.findByText('规则状态冲突')).toBeInTheDocument();
    expect(updateSignalRule).toHaveBeenLastCalledWith(8, { status: 'ACTIVE' });
  });

  it('删除必须二次确认；成功刷新，失败时不静默关闭对话框', async () => {
    const { user } = renderRules();
    expect(await screen.findByText('增长规则')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: '删除' })[0]);
    let dialog = screen.getByRole('dialog', { name: '确认删除' });
    expect(within(dialog).getByText('确定删除该信号规则吗？此操作不可撤销。')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '取消' }));
    expect(deleteSignalRule).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: '确认删除' })).not.toBeInTheDocument()
    );

    await user.click(screen.getAllByRole('button', { name: '删除' })[0]);
    dialog = screen.getByRole('dialog', { name: '确认删除' });
    await user.click(within(dialog).getByRole('button', { name: '删除' }));
    await waitFor(() => expect(deleteSignalRule).toHaveBeenCalledWith(7));
    await waitFor(() => expect(listSignalRules).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: '确认删除' })).not.toBeInTheDocument()
    );

    vi.mocked(deleteSignalRule).mockRejectedValueOnce(new Error('规则仍有运行任务'));
    await user.click(screen.getAllByRole('button', { name: '删除' })[1]);
    dialog = screen.getByRole('dialog', { name: '确认删除' });
    await user.click(within(dialog).getByRole('button', { name: '删除' }));
    expect(await screen.findByText('规则仍有运行任务')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: '确认删除' })).toBeInTheDocument();
  });

  it('覆盖加载、空、Error 与非 Error 列表失败，普通用户不暴露管理扫描', async () => {
    let resolveList: (value: ReturnType<typeof listResult>) => void = () => undefined;
    vi.mocked(listSignalRules).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveList = resolve;
        })
    );
    const first = renderRules();
    expect(document.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: '手动扫描' })).not.toBeInTheDocument();
    resolveList(listResult([]));
    expect(await screen.findByText('暂无信号规则')).toBeInTheDocument();
    first.unmount();

    vi.mocked(listSignalRules).mockRejectedValueOnce(new Error('规则服务不可用'));
    const second = renderRules();
    expect(await screen.findByText('规则服务不可用')).toBeInTheDocument();
    second.unmount();

    vi.mocked(listSignalRules).mockRejectedValueOnce('offline');
    renderRules();
    expect(await screen.findByText('加载规则失败')).toBeInTheDocument();
  });

  it('管理员异步扫描覆盖完成、任务失败、查询失败、启动失败和轮询中状态', async () => {
    vi.mocked(scanSignalsAsync).mockResolvedValue({ jobId: 'job-1', status: 'PENDING' });
    vi.mocked(getScanJob).mockResolvedValueOnce({
      jobId: 'job-1',
      status: 'COMPLETED',
      progress: { processed: 50, total: 50 },
      signalsGenerated: 12,
    });
    const view = renderRules('SUPER_ADMIN');
    const { user } = view;
    expect(await screen.findByText('增长规则')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '手动扫描' }));
    expect(scanSignalsAsync).toHaveBeenCalledWith();
    expect(await screen.findByText('扫描完成')).toBeInTheDocument();
    expect(screen.getByText('共生成信号 12 条')).toBeInTheDocument();
    expect(screen.getByText('进度：1')).toBeInTheDocument();
    await waitFor(() => expect(listSignalRules).toHaveBeenCalledTimes(2));
    await user.click(screen.getByRole('button', { name: '关闭扫描提示' }));

    vi.mocked(getScanJob).mockResolvedValueOnce({
      jobId: 'job-2',
      status: 'FAILED',
      progress: { processed: 4, total: 10 },
      errorMessage: '行情源缺口',
    });
    vi.mocked(scanSignalsAsync).mockResolvedValueOnce({ jobId: 'job-2', status: 'PENDING' });
    await user.click(screen.getByRole('button', { name: '手动扫描' }));
    expect(await screen.findByText('扫描失败')).toBeInTheDocument();
    expect(screen.getByText('行情源缺口')).toBeInTheDocument();

    vi.mocked(getScanJob).mockRejectedValueOnce(new Error('轮询网络中断'));
    vi.mocked(scanSignalsAsync).mockResolvedValueOnce({ jobId: 'job-3', status: 'PENDING' });
    await user.click(screen.getByRole('button', { name: '手动扫描' }));
    expect(await screen.findByText('扫描查询失败')).toBeInTheDocument();
    expect(screen.getByText('轮询网络中断')).toBeInTheDocument();

    vi.mocked(scanSignalsAsync).mockRejectedValueOnce(new Error('扫描队列已满'));
    await user.click(screen.getByRole('button', { name: '手动扫描' }));
    expect(await screen.findByText('扫描启动失败')).toBeInTheDocument();
    expect(screen.getByText('扫描队列已满')).toBeInTheDocument();

    vi.mocked(scanSignalsAsync).mockResolvedValueOnce({ jobId: 'job-4', status: 'RUNNING' });
    vi.mocked(getScanJob).mockResolvedValueOnce({
      jobId: 'job-4',
      status: 'RUNNING',
      progress: { processed: 2, total: 0 },
    });
    await user.click(screen.getByRole('button', { name: '手动扫描' }));
    expect(await screen.findByText('信号扫描中')).toBeInTheDocument();
    expect(screen.getByText('已扫描 2/0')).toBeInTheDocument();
    expect(screen.getByText('进度：0')).toBeInTheDocument();
    view.unmount();
  });
});
