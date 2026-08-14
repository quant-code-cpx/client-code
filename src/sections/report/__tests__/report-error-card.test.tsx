import type { Report, ReportType } from 'src/api/report';

import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { ReportErrorCard } from '../components/report-error-card';

function failedReport(type: ReportType, overrides: Partial<Report> = {}): Report {
  return {
    id: 'report-1',
    userId: 7,
    type,
    title: '失败报告',
    params: {},
    data: null,
    filePath: null,
    format: 'JSON',
    status: 'FAILED',
    errorCode: null,
    errorMessage: '上游服务错误',
    fileSize: null,
    createdAt: '2026-08-12T00:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
}

describe('ReportErrorCard', () => {
  it.each([
    ['BACKTEST' as const, '检查回测任务', '/backtest/runs'],
    ['STRATEGY_RESEARCH' as const, '检查策略与回测', '/strategy'],
  ])('%s 未知错误导航到真实路由', async (type, label, path) => {
    const onJump = vi.fn();
    const { user } = renderWithProviders(
      <ReportErrorCard report={failedReport(type)} onJump={onJump} />
    );

    await user.click(screen.getByRole('button', { name: label }));
    expect(onJump).toHaveBeenCalledWith(path);
  });

  it('已知依赖缺失优先返回报告列表，不使用类型默认动作', async () => {
    const onJump = vi.fn();
    const { user } = renderWithProviders(
      <ReportErrorCard
        report={failedReport('PORTFOLIO', {
          errorCode: 'REPORT_DEPENDENCY_MISSING',
          errorMessage: '组合已删除',
        })}
        onJump={onJump}
      />
    );

    expect(screen.getByText('关联资源不存在')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '返回报告列表' }));
    expect(onJump).toHaveBeenCalledWith('/research/report');
    expect(screen.queryByRole('button', { name: '检查组合' })).not.toBeInTheDocument();
  });

  it('重新生成触发回调，并可展开/收起后端错误原文', async () => {
    const onRetry = vi.fn();
    const { user } = renderWithProviders(
      <ReportErrorCard
        report={failedReport('BACKTEST', {
          errorCode: 'REPORT_INTERNAL_ERROR',
          errorMessage: 'trace-id=abc123',
        })}
        onRetry={onRetry}
      />
    );

    await user.click(screen.getByRole('button', { name: '重新生成' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: '查看原文' }));
    expect(screen.getByText('code: REPORT_INTERNAL_ERROR')).toBeInTheDocument();
    expect(screen.getByText('trace-id=abc123')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '收起原文' }));
    expect(screen.getByRole('button', { name: '查看原文' })).toBeInTheDocument();
  });

  it('未提供 retry 时明确禁用，股票类型显示补数建议而不渲染假导航', () => {
    renderWithProviders(<ReportErrorCard report={failedReport('STOCK')} onJump={vi.fn()} />);

    expect(screen.getByRole('button', { name: '重新生成（未开放）' })).toBeDisabled();
    expect(screen.getByText('建议：可在数据同步管理中触发补数')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '检查股票数据' })).not.toBeInTheDocument();
  });
});
